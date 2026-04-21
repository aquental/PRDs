import type { PageServerLoad } from './$types';
import {
	projectMonthlyRevenue,
	actualRevenue,
	totalExpenses,
	periodProfit,
	outstandingRevenue,
	patientRevenueRanking
} from '$core/finance';
import type { FinanceEntry, Patient, Session } from '$core/types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { therapist } = await parent();

	const now = new Date();
	const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
	const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

	const [{ data: patients }, { data: entries }, { data: sessions }] = await Promise.all([
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
			.select('id, status, paid, fee, scheduled_at')
			.eq('therapist_id', therapist.id)
	]);

	const P = (patients ?? []) as Patient[];
	const E = (entries ?? []) as FinanceEntry[];
	const S = (sessions ?? []) as Session[];

	return {
		kpis: {
			projected: projectMonthlyRevenue(P),
			actual: actualRevenue(E, from, to),
			expenses: totalExpenses(E, from, to),
			profit: periodProfit(E, from, to),
			outstanding: outstandingRevenue(S)
		},
		period: { from, to },
		ranking: patientRevenueRanking(P).slice(0, 10)
	};
};
