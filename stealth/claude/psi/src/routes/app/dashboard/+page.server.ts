import type { PageServerLoad } from './$types';
import { getCachedDashboard, setCachedDashboard } from '$lib/redis';
import { projectMonthlyRevenue, outstandingRevenue } from '$core/finance';
import type { Patient, Session } from '$core/types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { therapist } = await parent();

	const cached = await getCachedDashboard<{
		projected: number;
		outstanding: number;
		active_patients: number;
		upcoming_sessions: number;
	}>(therapist.id);
	if (cached) return { kpis: cached };

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
			.lte(
				'scheduled_at',
				new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
			)
	]);

	const kpis = {
		projected: projectMonthlyRevenue((patients ?? []) as Patient[]),
		outstanding: outstandingRevenue((sessions ?? []) as Session[]),
		active_patients: (patients ?? []).filter((p) => p.active).length,
		upcoming_sessions: (sessions ?? []).length
	};

	await setCachedDashboard(therapist.id, kpis, 300);
	return { kpis };
};
