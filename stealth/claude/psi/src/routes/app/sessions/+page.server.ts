import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { therapist } = await parent();

	const { data: sessions } = await locals.supabase
		.from('sessions')
		.select('id, scheduled_at, duration_minutes, fee, status, paid, patient_id, patients(name)')
		.eq('therapist_id', therapist.id)
		.order('scheduled_at', { ascending: false })
		.limit(100);

	return { sessions: sessions ?? [] };
};
