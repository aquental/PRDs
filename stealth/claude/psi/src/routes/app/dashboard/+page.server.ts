import type { PageServerLoad } from './$types';
import { getCachedDashboard, setCachedDashboard } from '$lib/redis';
import { projectMonthlyRevenue, outstandingRevenue } from '$core/finance';
import type { Patient, Session } from '$core/types';

// ── Expense-day computation ───────────────────────────────────────────────────

type ExpenseRow = {
	description: string;
	amount: number;
	frequency: string;
	due_day: number | null;
	due_date: string | null;
	is_active: boolean;
	color: string | null;
	month: number | null;
};

export type CalendarExpense = { description: string; color: string; amount: number };

const DEFAULT_COLOR = '#A0C4FF';

const FREQ_DEF: Record<string, { times: number; delta: number }> = {
	weekly:    { times: 4, delta: 7   },
	biweekly:  { times: 2, delta: 14  },
	monthly:   { times: 1, delta: 30  },
	quarterly: { times: 4, delta: 90  },
	semestral: { times: 2, delta: 180 },
	annual:    { times: 1, delta: 365 }
};

function computeExpenseDays(
	expenses: ExpenseRow[],
	year: number,
	calMonth: number
): Record<number, CalendarExpense[]> {
	const result: Record<number, CalendarExpense[]> = {};
	const lastDay = new Date(year, calMonth, 0).getDate();

	const addDay = (day: number, seg: CalendarExpense) => {
		if (day < 1 || day > lastDay) return;
		(result[day] ??= []).push(seg);
	};

	for (const e of expenses) {
		if (!e.is_active) continue;
		const seg: CalendarExpense = {
			description: e.description,
			color: e.color || DEFAULT_COLOR,
			amount: e.amount
		};

		if (e.frequency === 'one_time') {
			if (!e.due_date) continue;
			const d = new Date(e.due_date + 'T00:00:00');
			if (d.getFullYear() === year && d.getMonth() + 1 === calMonth) addDay(d.getDate(), seg);
			continue;
		}

		const def = FREQ_DEF[e.frequency];
		if (!def) continue;

		const cycleMonth0 = e.month && e.month > 0 ? e.month - 1 : calMonth - 1;
		const baseDay = e.due_day ?? 1;

		for (const baseYear of [year, year - 1]) {
			const base = new Date(baseYear, cycleMonth0, baseDay);
			for (let vez = 0; vez < def.times; vez++) {
				const hit = new Date(base.getTime() + vez * def.delta * 86_400_000);
				if (hit.getFullYear() === year && hit.getMonth() + 1 === calMonth) {
					addDay(hit.getDate(), seg);
				}
			}
		}
	}
	return result;
}

// ── Load ──────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { therapist, clinic } = await parent();

	// KPIs — cached for 5 min
	const cached = await getCachedDashboard<{
		projected: number;
		outstanding: number;
		active_patients: number;
		upcoming_sessions: number;
	}>(therapist.id);

	let kpis = cached;
	if (!kpis) {
		const [{ data: patients }, { data: sessions }] = await Promise.all([
			locals.supabase
				.from('patients')
				.select('id, active, session_fee, sessions_per_month')
				.eq('therapist_id', therapist.id),
			locals.supabase
				.from('sessions')
				.select('id, status, paid, fee, scheduled_at')
				.eq('therapist_id', therapist.id)
				.gte('scheduled_at', new Date().toISOString())
				.lte('scheduled_at', new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString())
		]);

		kpis = {
			projected: projectMonthlyRevenue((patients ?? []) as Patient[]),
			outstanding: outstandingRevenue((sessions ?? []) as Session[]),
			active_patients: (patients ?? []).filter((p) => p.active).length,
			upcoming_sessions: (sessions ?? []).length
		};
		await setCachedDashboard(therapist.id, kpis, 300);
	}

	// Calendar — always fresh (depends on today)
	const now = new Date();
	const today = [
		now.getFullYear(),
		String(now.getMonth() + 1).padStart(2, '0'),
		String(now.getDate()).padStart(2, '0')
	].join('-');

	const curYear  = now.getFullYear();
	const curMonth = now.getMonth() + 1;
	const nextDate = new Date(curYear, curMonth, 1); // 1st of next month
	const nxtYear  = nextDate.getFullYear();
	const nxtMonth = nextDate.getMonth() + 1;

	const [{ data: allHolidays }, { data: expenses }] = await Promise.all([
		locals.supabase
			.from('holidays')
			.select('day, month, year, name, type, state, city'),
		locals.supabase
			.from('expenses')
			.select('description, amount, frequency, due_day, due_date, is_active, color, month')
			.eq('clinic_id', therapist.clinic_id)
			.eq('is_active', true)
	]);

	const filterHolidays = (y: number, m: number) =>
		(allHolidays ?? [])
			.filter((h) => {
				if (h.month !== m) return false;
				if (h.year !== null && h.year !== y) return false;
				if (h.type === 'nacional') return true;
				if (h.type === 'estadual' && h.state === (clinic?.address_state ?? null)) return true;
				if (
					h.type === 'local' &&
					h.state === (clinic?.address_state ?? null) &&
					h.city === (clinic?.address_city ?? null)
				)
					return true;
				return false;
			})
			.map((h) => ({ day: h.day as number, name: h.name as string }));

	return {
		kpis,
		today,
		calendars: [
			{
				year: curYear,
				month: curMonth,
				holidays: filterHolidays(curYear, curMonth),
				expenseDays: computeExpenseDays(expenses ?? [], curYear, curMonth)
			},
			{
				year: nxtYear,
				month: nxtMonth,
				holidays: filterHolidays(nxtYear, nxtMonth),
				expenseDays: computeExpenseDays(expenses ?? [], nxtYear, nxtMonth)
			}
		]
	};
};
