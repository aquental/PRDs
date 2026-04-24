import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseAdminClient } from '$lib/supabase/server';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TherapistOption {
	id: string;
	name: string;
	email: string;
	clinic_id: string;
}

export interface ClinicRow {
	id: string;
	name: string;
	cnpj: string | null;
	address: string | null;
	timezone: string;
	address_street: string | null;
	address_number: string | null;
	address_complement: string | null;
	address_zip: string | null;
	address_city: string | null;
	address_state: string | null;
	working_hours_start: number;
	working_hours_end: number;
	created_at: string;
}

export interface TherapistRow {
	id: string;
	name: string;
	crp: string;
	cnpj: string | null;
	phone: string | null;
	email: string;
	address: string | null;
	clinic_id: string;
	created_at: string;
}

export interface PatientRow {
	id: string;
	name: string;
	email: string | null;
	phone: string | null;
	address: string | null;
	birth_date: string | null;
	session_fee: number | null;
	sessions_per_month: number;
	frequency: string | null;
	active: boolean;
	created_at: string;
}

export interface ExpenseRow {
	id: string;
	description: string;
	amount: number;
	frequency: string;
	month: number;
	due_day: number | null;
	due_date: string | null;
	is_active: boolean;
	notes: string | null;
	color: string | null;
	created_at: string;
}

const TIMEZONES = [
	'America/Sao_Paulo',
	'America/Manaus',
	'America/Cuiaba',
	'America/Porto_Velho',
	'America/Boa_Vista',
	'America/Noronha',
	'America/Belem',
	'America/Fortaleza',
	'America/Recife',
	'America/Maceio',
	'America/Bahia',
];

const EXPENSE_FREQUENCIES = [
	{ value: 'weekly', label: 'Semanal' },
	{ value: 'biweekly', label: 'Quinzenal' },
	{ value: 'monthly', label: 'Mensal' },
	{ value: 'quarterly', label: 'Trimestral' },
	{ value: 'semestral', label: 'Semestral' },
	{ value: 'annual', label: 'Anual' },
	{ value: 'one_time', label: 'Pontual' },
];

const PATIENT_FREQUENCIES = [
	{ value: 'weekly', label: 'Semanal' },
	{ value: 'biweekly', label: 'Quinzenal' },
	{ value: 'monthly', label: 'Mensal' },
];

const BR_STATES = [
	'AC','AL','AP','AM','BA','CE','DF','ES','GO',
	'MA','MT','MS','MG','PA','PB','PR','PE','PI',
	'RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

// ── Load ──────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ url }) => {
	const admin = createSupabaseAdminClient();
	const therapistId = url.searchParams.get('therapist') ?? null;
	const tab = url.searchParams.get('tab') ?? 'clinicas';

	const { data: therapistList } = await admin
		.from('therapists')
		.select('id, name, email, clinic_id')
		.order('name');

	const allTherapists = (therapistList ?? []) as TherapistOption[];
	const selected = therapistId ? allTherapists.find((t) => t.id === therapistId) : null;

	let clinics: ClinicRow[] = [];
	let patients: PatientRow[] = [];
	let expenses: ExpenseRow[] = [];

	if (selected) {
		const [clinicsRes, patientsRes, expensesRes] = await Promise.all([
			admin
				.from('clinics')
				.select('id,name,cnpj,address,timezone,address_street,address_number,address_complement,address_zip,address_city,address_state,working_hours_start,working_hours_end,created_at')
				.eq('id', selected.clinic_id),
			admin
				.from('patients')
				.select('id,name,email,phone,address,birth_date,session_fee,sessions_per_month,frequency,active,created_at')
				.eq('therapist_id', therapistId!)
				.order('name'),
			admin
				.from('expenses')
				.select('id,description,amount,frequency,month,due_day,due_date,is_active,notes,color,created_at')
				.eq('clinic_id', selected.clinic_id)
				.order('description'),
		]);
		clinics = (clinicsRes.data ?? []) as ClinicRow[];
		patients = (patientsRes.data ?? []) as PatientRow[];
		expenses = (expensesRes.data ?? []) as ExpenseRow[];
	}

	const { data: therapistsAll } = await admin
		.from('therapists')
		.select('id,name,crp,cnpj,phone,email,address,clinic_id,created_at')
		.order('name');

	return {
		therapistId,
		tab,
		therapistList: allTherapists,
		clinics,
		therapists: (therapistsAll ?? []) as TherapistRow[],
		patients,
		expenses,
		meta: { timezones: TIMEZONES, expenseFrequencies: EXPENSE_FREQUENCIES, patientFrequencies: PATIENT_FREQUENCIES, brStates: BR_STATES },
	};
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function str(fd: FormData, key: string): string {
	return (fd.get(key) as string | null)?.trim() ?? '';
}
function strOrNull(fd: FormData, key: string): string | null {
	const v = (fd.get(key) as string | null)?.trim();
	return v || null;
}
function numOrNull(fd: FormData, key: string): number | null {
	const v = (fd.get(key) as string | null)?.trim();
	return v ? Number(v) : null;
}
function num(fd: FormData, key: string, def = 0): number {
	return Number((fd.get(key) as string | null)?.trim() || def);
}
function bool(fd: FormData, key: string): boolean {
	return fd.get(key) === 'true';
}

// ── Actions ───────────────────────────────────────────────────────────────────

export const actions: Actions = {
	// ── Clinics ───────────────────────────────────────────────────────────────

	createClinic: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const fd = await request.formData();
		const admin = createSupabaseAdminClient();

		const { error } = await admin.from('clinics').insert({
			name: str(fd, 'name'),
			cnpj: strOrNull(fd, 'cnpj'),
			timezone: str(fd, 'timezone') || 'America/Sao_Paulo',
			address_street: strOrNull(fd, 'address_street'),
			address_number: strOrNull(fd, 'address_number'),
			address_complement: strOrNull(fd, 'address_complement'),
			address_zip: strOrNull(fd, 'address_zip'),
			address_city: strOrNull(fd, 'address_city'),
			address_state: strOrNull(fd, 'address_state'),
			working_hours_start: num(fd, 'working_hours_start', 7),
			working_hours_end: num(fd, 'working_hours_end', 21),
		});
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	updateClinic: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const fd = await request.formData();
		const id = str(fd, 'id');
		if (!id) return fail(400, { error: 'ID obrigatório' });

		const admin = createSupabaseAdminClient();
		const { error } = await admin.from('clinics').update({
			name: str(fd, 'name'),
			cnpj: strOrNull(fd, 'cnpj'),
			timezone: str(fd, 'timezone') || 'America/Sao_Paulo',
			address_street: strOrNull(fd, 'address_street'),
			address_number: strOrNull(fd, 'address_number'),
			address_complement: strOrNull(fd, 'address_complement'),
			address_zip: strOrNull(fd, 'address_zip'),
			address_city: strOrNull(fd, 'address_city'),
			address_state: strOrNull(fd, 'address_state'),
			working_hours_start: num(fd, 'working_hours_start', 7),
			working_hours_end: num(fd, 'working_hours_end', 21),
		}).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	deleteClinic: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const fd = await request.formData();
		const id = str(fd, 'id');
		if (!id) return fail(400, { error: 'ID obrigatório' });

		const admin = createSupabaseAdminClient();
		const { error } = await admin.from('clinics').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	// ── Therapists ────────────────────────────────────────────────────────────

	updateTherapist: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const fd = await request.formData();
		const id = str(fd, 'id');
		if (!id) return fail(400, { error: 'ID obrigatório' });

		const admin = createSupabaseAdminClient();
		const { error } = await admin.from('therapists').update({
			name: str(fd, 'name'),
			crp: str(fd, 'crp'),
			cnpj: strOrNull(fd, 'cnpj'),
			phone: strOrNull(fd, 'phone'),
			email: str(fd, 'email'),
			address: strOrNull(fd, 'address'),
		}).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	deleteTherapist: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const fd = await request.formData();
		const id = str(fd, 'id');
		if (!id) return fail(400, { error: 'ID obrigatório' });

		const admin = createSupabaseAdminClient();
		const { error } = await admin.from('therapists').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	// ── Patients ──────────────────────────────────────────────────────────────

	createPatient: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const fd = await request.formData();
		const therapistId = str(fd, 'therapist_id');
		const admin = createSupabaseAdminClient();

		const { data: therapist } = await admin
			.from('therapists')
			.select('clinic_id')
			.eq('id', therapistId)
			.single();
		if (!therapist) return fail(400, { error: 'Terapeuta não encontrado' });

		const { error } = await admin.from('patients').insert({
			clinic_id: therapist.clinic_id,
			therapist_id: therapistId,
			name: str(fd, 'name'),
			email: strOrNull(fd, 'email'),
			phone: strOrNull(fd, 'phone'),
			address: strOrNull(fd, 'address'),
			birth_date: strOrNull(fd, 'birth_date'),
			session_fee: numOrNull(fd, 'session_fee'),
			sessions_per_month: num(fd, 'sessions_per_month', 4),
			frequency: strOrNull(fd, 'frequency'),
			active: bool(fd, 'active'),
		});
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	updatePatient: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const fd = await request.formData();
		const id = str(fd, 'id');
		if (!id) return fail(400, { error: 'ID obrigatório' });

		const admin = createSupabaseAdminClient();
		const { error } = await admin.from('patients').update({
			name: str(fd, 'name'),
			email: strOrNull(fd, 'email'),
			phone: strOrNull(fd, 'phone'),
			address: strOrNull(fd, 'address'),
			birth_date: strOrNull(fd, 'birth_date'),
			session_fee: numOrNull(fd, 'session_fee'),
			sessions_per_month: num(fd, 'sessions_per_month', 4),
			frequency: strOrNull(fd, 'frequency'),
			active: bool(fd, 'active'),
		}).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	deletePatient: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const fd = await request.formData();
		const id = str(fd, 'id');
		if (!id) return fail(400, { error: 'ID obrigatório' });

		const admin = createSupabaseAdminClient();
		const { error } = await admin.from('patients').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	// ── Expenses ──────────────────────────────────────────────────────────────

	createExpense: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const fd = await request.formData();
		const clinicId = str(fd, 'clinic_id');
		if (!clinicId) return fail(400, { error: 'clinic_id obrigatório' });

		const admin = createSupabaseAdminClient();
		const { error } = await admin.from('expenses').insert({
			clinic_id: clinicId,
			description: str(fd, 'description'),
			amount: num(fd, 'amount'),
			frequency: str(fd, 'frequency') || 'monthly',
			month: num(fd, 'month', 0),
			due_day: numOrNull(fd, 'due_day'),
			due_date: strOrNull(fd, 'due_date'),
			is_active: bool(fd, 'is_active'),
			notes: strOrNull(fd, 'notes'),
			color: strOrNull(fd, 'color'),
		});
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	updateExpense: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const fd = await request.formData();
		const id = str(fd, 'id');
		if (!id) return fail(400, { error: 'ID obrigatório' });

		const admin = createSupabaseAdminClient();
		const { error } = await admin.from('expenses').update({
			description: str(fd, 'description'),
			amount: num(fd, 'amount'),
			frequency: str(fd, 'frequency') || 'monthly',
			month: num(fd, 'month', 0),
			due_day: numOrNull(fd, 'due_day'),
			due_date: strOrNull(fd, 'due_date'),
			is_active: bool(fd, 'is_active'),
			notes: strOrNull(fd, 'notes'),
			color: strOrNull(fd, 'color'),
		}).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},

	deleteExpense: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const fd = await request.formData();
		const id = str(fd, 'id');
		if (!id) return fail(400, { error: 'ID obrigatório' });

		const admin = createSupabaseAdminClient();
		const { error } = await admin.from('expenses').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	},
};
