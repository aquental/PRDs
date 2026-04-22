import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions } from './$types';

const TherapistSchema = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	crp: z.string().min(1),
	phone: z.string().optional(),
	default_session_fee: z.coerce.number().nonnegative().default(250)
});

const ClinicSchema = z.object({
	name: z.string().min(1),
	timezone: z.string().min(1),
	cnpj: z.string().optional(),
	address_street: z.string().optional(),
	address_number: z.string().optional(),
	address_complement: z.string().optional(),
	address_zip: z.string().optional(),
	address_city: z.string().optional(),
	address_state: z.string().optional(),
	working_hours_start: z.coerce.number().int().min(0).max(23).default(7),
	working_hours_end: z.coerce.number().int().min(1).max(24).default(21)
});

export const actions: Actions = {
	updateTherapist: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const parsed = TherapistSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const { error } = await locals.supabase
			.from('therapists')
			.update({
				name: parsed.data.name,
				email: parsed.data.email,
				crp: parsed.data.crp,
				phone: parsed.data.phone || null,
				default_session_fee: parsed.data.default_session_fee
			})
			.eq('user_id', user.id);

		if (error) return fail(400, { error: error.message });
		return { success: 'therapist' };
	},

	updateClinic: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const { data: therapist } = await locals.supabase
			.from('therapists')
			.select('clinic_id')
			.eq('user_id', user.id)
			.single();
		if (!therapist) return fail(403, { error: 'Terapeuta não encontrado' });

		const parsed = ClinicSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const d = parsed.data;
		const { error } = await locals.supabase
			.from('clinics')
			.update({
				name: d.name,
				timezone: d.timezone,
				cnpj: d.cnpj || null,
				address_street: d.address_street || null,
				address_number: d.address_number || null,
				address_complement: d.address_complement || null,
				address_zip: d.address_zip || null,
				address_city: d.address_city || null,
				address_state: d.address_state || null,
				working_hours_start: d.working_hours_start,
				working_hours_end: d.working_hours_end
			})
			.eq('id', therapist.clinic_id);

		if (error) return fail(400, { error: error.message });
		return { success: 'clinic' };
	}
};
