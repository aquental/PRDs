import { fail, error } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

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

const ExpenseSchema = z.object({
	description: z.string().min(1),
	amount: z.coerce.number().nonnegative(),
	frequency: z.enum(['monthly', 'quarterly', 'annual', 'one_time']),
	due_day: z.coerce.number().int().min(1).max(28).nullable().optional(),
	due_date: z.string().nullable().optional(),
	notes: z.string().optional()
});

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'Não autenticado');

	const { data: therapist } = await locals.supabase
		.from('therapists')
		.select('name, email, crp, phone, default_session_fee, clinic_id')
		.eq('user_id', user.id)
		.single();

	if (!therapist) throw error(404, 'Terapeuta não encontrado');

	const { data: clinic } = await locals.supabase
		.from('clinics')
		.select(
			'name, timezone, cnpj, address_street, address_number, address_complement, address_zip, address_city, address_state, working_hours_start, working_hours_end'
		)
		.eq('id', therapist.clinic_id)
		.single();

	if (!clinic) throw error(404, 'Clínica não encontrada');

	const { data: expenses } = await locals.supabase
		.from('expenses')
		.select('id, description, amount, frequency, due_day, due_date, is_active, notes, created_at')
		.eq('clinic_id', therapist.clinic_id)
		.order('is_active', { ascending: false })
		.order('description');

	return { therapist, clinic, expenses: expenses ?? [] };
};

export const actions: Actions = {
	updateTherapist: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const parsed = TherapistSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const { error: err } = await locals.supabase
			.from('therapists')
			.update({
				name: parsed.data.name,
				email: parsed.data.email,
				crp: parsed.data.crp,
				phone: parsed.data.phone || null,
				default_session_fee: parsed.data.default_session_fee
			})
			.eq('user_id', user.id);

		if (err) return fail(400, { error: err.message });
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
		const { error: err } = await locals.supabase
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

		if (err) return fail(400, { error: err.message });
		return { success: 'clinic' };
	},

	createExpense: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const { data: therapist } = await locals.supabase
			.from('therapists')
			.select('clinic_id')
			.eq('user_id', user.id)
			.single();
		if (!therapist) return fail(403, { error: 'Sem permissão' });

		const formData = await request.formData();
		const raw = Object.fromEntries(formData);
		const parsed = ExpenseSchema.safeParse(raw);
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const d = parsed.data;
		const { error: err } = await locals.supabase.from('expenses').insert({
			clinic_id: therapist.clinic_id,
			description: d.description,
			amount: d.amount,
			frequency: d.frequency,
			due_day: d.frequency !== 'one_time' ? (d.due_day || null) : null,
			due_date: d.frequency === 'one_time' ? (d.due_date || null) : null,
			notes: d.notes || null
		});

		if (err) return fail(400, { error: err.message });
		return { success: 'createExpense' };
	},

	updateExpense: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const { data: therapist } = await locals.supabase
			.from('therapists')
			.select('clinic_id')
			.eq('user_id', user.id)
			.single();
		if (!therapist) return fail(403, { error: 'Sem permissão' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!id) return fail(400, { error: 'ID inválido' });

		const isActive = formData.get('is_active') === 'on';
		const raw = Object.fromEntries(formData);
		const parsed = ExpenseSchema.safeParse(raw);
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const d = parsed.data;
		const { error: err } = await locals.supabase
			.from('expenses')
			.update({
				description: d.description,
				amount: d.amount,
				frequency: d.frequency,
				due_day: d.frequency !== 'one_time' ? (d.due_day || null) : null,
				due_date: d.frequency === 'one_time' ? (d.due_date || null) : null,
				notes: d.notes || null,
				is_active: isActive
			})
			.eq('id', id)
			.eq('clinic_id', therapist.clinic_id);

		if (err) return fail(400, { error: err.message });
		return { success: 'updateExpense' };
	},

	deleteExpense: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const { data: therapist } = await locals.supabase
			.from('therapists')
			.select('clinic_id')
			.eq('user_id', user.id)
			.single();
		if (!therapist) return fail(403, { error: 'Sem permissão' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!id) return fail(400, { error: 'ID inválido' });

		const { error: err } = await locals.supabase
			.from('expenses')
			.delete()
			.eq('id', id)
			.eq('clinic_id', therapist.clinic_id);

		if (err) return fail(400, { error: err.message });
		return { success: 'deleteExpense' };
	}
};
