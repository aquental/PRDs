import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { therapist } = await parent();

	const { data: patient } = await locals.supabase
		.from('patients')
		.select('*')
		.eq('id', params.id)
		.eq('therapist_id', therapist.id)
		.single();

	if (!patient) throw error(404, 'Paciente não encontrado');

	const { data: sessions } = await locals.supabase
		.from('sessions')
		.select('id, scheduled_at, duration_minutes, fee, status, paid')
		.eq('patient_id', patient.id)
		.order('scheduled_at', { ascending: false })
		.limit(50);

	return { patient, sessions: sessions ?? [] };
};
