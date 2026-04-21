import type { PageServerLoad } from './$types';
import { createSupabaseAdminClient } from '$lib/supabase/server';
import { aggregateUsage } from '$core/ai-logger';
import type { AIUsageLog } from '$core/types';

export const load: PageServerLoad = async () => {
	const admin = createSupabaseAdminClient();

	const [{ count: clinicsCount }, { count: therapistsCount }, { count: patientsCount }, { data: recentLogs }] =
		await Promise.all([
			admin.from('clinics').select('*', { count: 'exact', head: true }),
			admin.from('therapists').select('*', { count: 'exact', head: true }),
			admin.from('patients').select('*', { count: 'exact', head: true }),
			admin
				.from('ai_usage_logs')
				.select('*')
				.gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
				.limit(5000)
		]);

	const usage = aggregateUsage((recentLogs ?? []) as AIUsageLog[]);

	return {
		counts: {
			clinics: clinicsCount ?? 0,
			therapists: therapistsCount ?? 0,
			patients: patientsCount ?? 0
		},
		usage
	};
};
