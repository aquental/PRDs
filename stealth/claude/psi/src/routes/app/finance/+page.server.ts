import type { PageServerLoad } from './$types';
import {
	projectMonthlyRevenue,
	actualRevenue,
	totalExpenses,
	expensesForPeriod,
	periodProfit,
	outstandingRevenue,
	patientRevenueRanking
} from '$core/finance';
import type { Expense, FinanceEntry, Patient, Session } from '$core/types';

type SessionRow = {
	id: string;
	status: string;
	paid: boolean;
	fee: number | null;
	scheduled_at: string;
	patient_id: string;
	patients: { name: string } | null;
};

export const load: PageServerLoad = async ({ locals, parent, url }) => {
	const { therapist } = await parent();

	const now = new Date();
	const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
	const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

	const from = url.searchParams.get('from') ?? defaultFrom;
	const to = url.searchParams.get('to') ?? defaultTo;

	const [{ data: patients }, { data: entries }, { data: sessions }, { data: expenseRows }] =
		await Promise.all([
			locals.supabase
				.from('patients')
				.select('id, name, active, session_fee, sessions_per_month')
				.eq('therapist_id', therapist.id),
			locals.supabase
				.from('finance_entries')
				.select('*')
				.eq('therapist_id', therapist.id)
				.gte('occurred_at', from)
				.lte('occurred_at', to),
			locals.supabase
				.from('sessions')
				.select('id, status, paid, fee, scheduled_at, patient_id, patients(name)')
				.eq('therapist_id', therapist.id),
			locals.supabase
				.from('expenses')
				.select('id, clinic_id, description, amount, frequency, due_day, due_date, is_active, notes, created_at, updated_at')
				.eq('clinic_id', therapist.clinic_id)
		]);

	const P = (patients ?? []) as Patient[];
	const E = (entries ?? []) as FinanceEntry[];
	const S = (sessions ?? []) as unknown as SessionRow[];
	const X = (expenseRows ?? []) as Expense[];

	const unpaidSessions = S
		.filter((s) => s.status === 'completed' && !s.paid)
		.map((s) => ({
			id: s.id,
			fee: s.fee ?? 0,
			scheduled_at: s.scheduled_at,
			patient_id: s.patient_id,
			patient_name: s.patients?.name ?? '—'
		}))
		.sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));

	return {
		kpis: {
			projected: projectMonthlyRevenue(P),
			actual: actualRevenue(E, from, to),
			expenses: totalExpenses(E, from, to) + expensesForPeriod(X, from, to),
			profit: periodProfit(E, X, from, to),
			outstanding: outstandingRevenue(S as unknown as Session[])
		},
		period: { from, to },
		ranking: patientRevenueRanking(P).slice(0, 10),
		unpaidSessions
	};
};
