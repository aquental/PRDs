import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';
import { invalidateDashboard } from '$lib/redis';
import { getServiceSwitches } from '$lib/server/service-switches';

const PatientSchema = z.object({
	name: z.string().min(1, 'Nome é obrigatório'),
	email: z.string().email().optional().or(z.literal('')),
	phone: z.string().optional(),
	session_fee: z.coerce.number().nonnegative().optional(),
	sessions_per_month: z.coerce.number().int().nonnegative().default(4),
	google_calendar_attendee_email: z.string().email().optional().or(z.literal('')),
	active: z.coerce.boolean().default(true)
});

const AddressSchema = z.object({
	logradouro: z.string().min(1, 'Logradouro é obrigatório'),
	numero: z.string().optional().or(z.literal('')),
	complemento: z.string().optional().or(z.literal('')),
	cep: z.string().min(1, 'CEP é obrigatório'),
	cidade: z.string().min(1, 'Cidade é obrigatória'),
	estado: z.string().min(1, 'Estado é obrigatório')
});

const RelativeSchema = z.object({
	nome: z.string().min(1, 'Nome é obrigatório'),
	telefone: z.string().optional().or(z.literal('')),
	endereco: z.string().optional().or(z.literal(''))
});

async function assertPatientOwnership(
	locals: App.Locals,
	patientId: string
): Promise<{ therapistId: string } | { error: string; status: number }> {
	const { user } = await locals.safeGetSession();
	if (!user) return { error: 'Não autenticado', status: 401 };

	const { data: therapist } = await locals.supabase
		.from('therapists')
		.select('id')
		.eq('user_id', user.id)
		.single();
	if (!therapist) return { error: 'Terapeuta não encontrado', status: 403 };

	const { data: patient } = await locals.supabase
		.from('patients')
		.select('id')
		.eq('id', patientId)
		.eq('therapist_id', therapist.id)
		.single();
	if (!patient) return { error: 'Paciente não encontrado', status: 404 };

	return { therapistId: therapist.id };
}

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { therapist } = await parent();

	const { data: patient } = await locals.supabase
		.from('patients')
		.select('*')
		.eq('id', params.id)
		.eq('therapist_id', therapist.id)
		.single();

	if (!patient) throw error(404, 'Paciente não encontrado');

	const [{ data: sessions }, { data: address }, { data: relatives }, switches] = await Promise.all([
		locals.supabase
			.from('sessions')
			.select('id, scheduled_at, duration_minutes, fee, status, paid')
			.eq('patient_id', patient.id)
			.order('scheduled_at', { ascending: false })
			.limit(50),
		locals.supabase
			.from('patient_addresses')
			.select('patient_id, logradouro, numero, complemento, cep, cidade, estado')
			.eq('patient_id', patient.id)
			.maybeSingle(),
		locals.supabase
			.from('patient_relatives')
			.select('id, nome, telefone, endereco')
			.eq('patient_id', patient.id)
			.order('created_at', { ascending: true }),
		getServiceSwitches()
	]);

	return {
		patient,
		sessions: sessions ?? [],
		address: address ?? null,
		relatives: relatives ?? [],
		cepEnabled: switches.cep
	};
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const ownership = await assertPatientOwnership(locals, params.id!);
		if ('error' in ownership) return fail(ownership.status, { error: ownership.error });

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
			.eq('therapist_id', ownership.therapistId);

		if (err) return fail(400, { error: err.message });
		await invalidateDashboard(ownership.therapistId);
		return { success: true };
	},

	updateAddress: async ({ request, locals, params }) => {
		const ownership = await assertPatientOwnership(locals, params.id!);
		if ('error' in ownership) return fail(ownership.status, { error: ownership.error });

		const form = Object.fromEntries(await request.formData());
		const parsed = AddressSchema.safeParse(form);
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const a = parsed.data;
		const payload = {
			patient_id: params.id!,
			logradouro: a.logradouro,
			numero: a.numero || null,
			complemento: a.complemento || null,
			cep: a.cep,
			cidade: a.cidade,
			estado: a.estado
		};

		const { error: err } = await locals.supabase
			.from('patient_addresses')
			.upsert(payload, { onConflict: 'patient_id' });

		if (err) return fail(400, { error: err.message });
		return { success: 'address' };
	},

	addRelative: async ({ request, locals, params }) => {
		const ownership = await assertPatientOwnership(locals, params.id!);
		if ('error' in ownership) return fail(ownership.status, { error: ownership.error });

		const form = Object.fromEntries(await request.formData());
		const parsed = RelativeSchema.safeParse(form);
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const r = parsed.data;
		const { error: err } = await locals.supabase.from('patient_relatives').insert({
			patient_id: params.id,
			nome: r.nome,
			telefone: r.telefone || null,
			endereco: r.endereco || null
		});

		if (err) return fail(400, { error: err.message });
		return { success: 'relative_added' };
	},

	updateRelative: async ({ request, locals, params }) => {
		const ownership = await assertPatientOwnership(locals, params.id!);
		if ('error' in ownership) return fail(ownership.status, { error: ownership.error });

		const form = Object.fromEntries(await request.formData());
		const relativeId = String(form.id ?? '');
		if (!relativeId) return fail(400, { error: 'ID do parente ausente' });

		const parsed = RelativeSchema.safeParse(form);
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const r = parsed.data;
		const { error: err } = await locals.supabase
			.from('patient_relatives')
			.update({
				nome: r.nome,
				telefone: r.telefone || null,
				endereco: r.endereco || null
			})
			.eq('id', relativeId)
			.eq('patient_id', params.id);

		if (err) return fail(400, { error: err.message });
		return { success: 'relative_updated' };
	},

	deleteRelative: async ({ request, locals, params }) => {
		const ownership = await assertPatientOwnership(locals, params.id!);
		if ('error' in ownership) return fail(ownership.status, { error: ownership.error });

		const form = Object.fromEntries(await request.formData());
		const relativeId = String(form.id ?? '');
		if (!relativeId) return fail(400, { error: 'ID do parente ausente' });

		const { error: err } = await locals.supabase
			.from('patient_relatives')
			.delete()
			.eq('id', relativeId)
			.eq('patient_id', params.id);

		if (err) return fail(400, { error: err.message });
		return { success: 'relative_deleted' };
	}
};
