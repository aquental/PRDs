import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { invalidateDashboard } from '$lib/redis';

const ScheduleSchema = z.object({
	patient_id: z.string().uuid(),
	day_of_week: z.coerce.number().int().min(1).max(5),
	start_time: z.string().regex(/^\d{2}:\d{2}$/),
	duration_minutes: z.coerce.number().int().positive().default(50),
	frequency: z.enum(['weekly', 'biweekly']).default('weekly'),
	fee: z.coerce.number().nonnegative().optional()
});

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { therapist, clinic } = await parent();

	const [{ data: sessions }, { data: patients }, { data: schedules }] = await Promise.all([
		locals.supabase
			.from('sessions')
			.select('id, scheduled_at, duration_minutes, fee, status, paid, patient_id, patients(name)')
			.eq('therapist_id', therapist.id)
			.order('scheduled_at', { ascending: false })
			.limit(100),
		locals.supabase
			.from('patients')
			.select('id, name, session_fee')
			.eq('therapist_id', therapist.id)
			.eq('active', true)
			.order('name'),
		locals.supabase
			.from('schedules')
			.select('id, day_of_week, start_time, duration_minutes, frequency, fee, patient_id, patients(name)')
			.eq('therapist_id', therapist.id)
			.eq('active', true)
			.order('day_of_week')
			.order('start_time')
	]);

	const c = clinic as { working_hours_start?: number | null; working_hours_end?: number | null } | null;
	return {
		sessions: sessions ?? [],
		patients: patients ?? [],
		schedules: schedules ?? [],
		workingHoursStart: c?.working_hours_start ?? 7,
		workingHoursEnd: c?.working_hours_end ?? 21
	};
};

export const actions: Actions = {
	createSchedule: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const { data: therapist } = await locals.supabase
			.from('therapists')
			.select('id, clinic_id')
			.eq('user_id', user.id)
			.single();
		if (!therapist) return fail(403, { error: 'Terapeuta não encontrado' });

		const parsed = ScheduleSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const d = parsed.data;
		const { error } = await locals.supabase.from('schedules').insert({
			clinic_id: therapist.clinic_id,
			therapist_id: therapist.id,
			patient_id: d.patient_id,
			day_of_week: d.day_of_week,
			start_time: d.start_time,
			duration_minutes: d.duration_minutes,
			frequency: d.frequency,
			fee: d.fee ?? null
		});

		if (error) {
			if (error.code === '23505')
				return fail(400, { error: 'Este horário já está reservado.' });
			return fail(400, { error: error.message });
		}

		await invalidateDashboard(therapist.id);
		return { success: true };
	},

	create: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const { data: therapist } = await locals.supabase
			.from('therapists')
			.select('id, clinic_id')
			.eq('user_id', user.id)
			.single();
		if (!therapist) return fail(403, { error: 'Terapeuta não encontrado' });

		const schema = z.object({
			patient_id: z.string().uuid(),
			scheduled_at: z.string().min(1),
			duration_minutes: z.coerce.number().int().positive().default(50),
			fee: z.coerce.number().nonnegative().optional(),
			status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).default('scheduled')
		});

		const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const d = parsed.data;
		const { error } = await locals.supabase.from('sessions').insert({
			clinic_id: therapist.clinic_id,
			therapist_id: therapist.id,
			patient_id: d.patient_id,
			scheduled_at: new Date(d.scheduled_at).toISOString(),
			duration_minutes: d.duration_minutes,
			fee: d.fee ?? null,
			status: d.status
		});

		if (error) return fail(400, { error: error.message });
		await invalidateDashboard(therapist.id);
		return { success: true };
	}
};
