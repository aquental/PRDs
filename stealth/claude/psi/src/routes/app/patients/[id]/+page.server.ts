import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';
import { invalidateDashboard } from '$lib/redis';

const PatientSchema = z.object({
	name: z.string().min(1, 'Nome é obrigatório'),
	email: z.string().email().optional().or(z.literal('')),
	phone: z.string().optional(),
	session_fee: z.coerce.number().nonnegative().optional(),
	sessions_per_month: z.coerce.number().int().nonnegative().default(4),
	google_calendar_attendee_email: z.string().email().optional().or(z.literal('')),
	active: z.coerce.boolean().default(true)
});

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

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const { data: therapist } = await locals.supabase
			.from('therapists')
			.select('id')
			.eq('user_id', user.id)
			.single();
		if (!therapist) return fail(403, { error: 'Terapeuta não encontrado' });

		const form = Object.fromEntries(await request.formData());
		const parsed = PatientSchema.safeParse(form);
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const p = parsed.data;
		const calendarEmail = p.google_calendar_attendee_email || p.email || null;

		const { error: err } = await locals.supabase
			.from('patients')
			.update({
				name: p.name,
				email: p.email || null,
				phone: p.phone || null,
				session_fee: p.session_fee ?? null,
				sessions_per_month: p.sessions_per_month,
				google_calendar_attendee_email: calendarEmail,
				active: p.active
			})
			.eq('id', params.id)
			.eq('therapist_id', therapist.id);

		if (err) return fail(400, { error: err.message });
		await invalidateDashboard(therapist.id);
		return { success: true };
	}
};
