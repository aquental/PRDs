import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';
import { invalidateDashboard } from '$lib/redis';

const PatientSchema = z.object({
	name: z.string().min(1, 'Nome é obrigatório'),
	email: z.string().email().optional().or(z.literal('')),
	phone: z.string().optional(),
	session_fee: z.coerce.number().nonnegative().optional(),
	sessions_per_month: z.coerce.number().int().nonnegative().default(4),
	google_calendar_attendee_email: z.string().email().optional().or(z.literal(''))
});

export const load: PageServerLoad = async ({ locals, parent, url }) => {
	const { therapist } = await parent();
	const query = url.searchParams.get('q')?.trim() ?? '';
	const defaultFee = (therapist as { default_session_fee?: number | null }).default_session_fee ?? 250;

	let req = locals.supabase
		.from('patients')
		.select('id, name, email, phone, active, session_fee, sessions_per_month')
		.eq('therapist_id', therapist.id)
		.order('name');

	if (query) req = req.ilike('name', `%${query}%`);

	const { data: patients, error } = await req;
	if (error) throw error;

	return { patients: patients ?? [], query, defaultFee };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: { _: ['Não autenticado'] } });

		const { data: therapist } = await locals.supabase
			.from('therapists')
			.select('id, clinic_id')
			.eq('user_id', user.id)
			.single();

		if (!therapist) return fail(403, { error: { _: ['Terapeuta não encontrado'] } });
		const clinic = { id: therapist.clinic_id };
		const form = Object.fromEntries(await request.formData());
		const parsed = PatientSchema.safeParse(form);
		if (!parsed.success) {
			return fail(400, { error: parsed.error.flatten().fieldErrors });
		}
		const p = parsed.data;

		const calendarEmail = p.google_calendar_attendee_email || p.email || null;

		const { error } = await locals.supabase.from('patients').insert({
			clinic_id: clinic.id,
			therapist_id: therapist.id,
			name: p.name,
			email: p.email || null,
			phone: p.phone || null,
			session_fee: p.session_fee ?? null,
			sessions_per_month: p.sessions_per_month,
			google_calendar_attendee_email: calendarEmail
		});

		if (error) return fail(400, { error: { _: [error.message] } });
		await invalidateDashboard(therapist.id);
		return { success: true };
	}
};
