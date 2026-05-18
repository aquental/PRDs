import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import {
	monthRangeDates,
	sessionEndedBefore,
	oldestPendingMonth,
	isPending
} from '$lib/core/attendance';
import { invalidateDashboard } from '$lib/redis';

// ── load ──────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ locals, parent, url }) => {
	const { therapist } = await parent();

	const now = new Date();
	const nowIso = now.toISOString();
	const currentMonthYear = now.toLocaleDateString('sv').slice(0, 7);

	// Find the oldest unclosed month with pending sessions (§6.4)
	const [pendingResult, closuresResult] = await Promise.all([
		locals.supabase
			.from('sessions')
			.select('scheduled_at')
			.eq('therapist_id', therapist.id)
			.neq('status', 'cancelled')
			.is('attendance_status', null)
			.lt('scheduled_at', nowIso),
		locals.supabase
			.from('month_closures')
			.select('month_year')
			.eq('therapist_id', therapist.id)
			.eq('status', 'closed')
	]);

	const pendingMonths = [
		...new Set((pendingResult.data ?? []).map((s) => s.scheduled_at.slice(0, 7)))
	];
	const closedMonths = (closuresResult.data ?? []).map((c) => c.month_year);
	const defaultMonth =
		oldestPendingMonth(pendingMonths, closedMonths) ?? currentMonthYear;

	// Selected month: URL param overrides default (validated format)
	const mesParam = url.searchParams.get('mes');
	const selectedMonth =
		mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : defaultMonth;

	const { start, end } = monthRangeDates(selectedMonth);

	// Sessions for the selected month (excluding cancelled)
	const { data: rawSessions } = await locals.supabase
		.from('sessions')
		.select(
			'id, scheduled_at, duration_minutes, fee, status, attendance_status, attendance_updated_at, patient_id, patients(name)'
		)
		.eq('therapist_id', therapist.id)
		.gte('scheduled_at', `${start}T00:00:00.000Z`)
		.lt('scheduled_at', `${end}T00:00:00.000Z`)
		.neq('status', 'cancelled')
		.order('scheduled_at');

	const sessionList = rawSessions ?? [];
	const sessionIds = sessionList.map((s) => s.id);

	// Appointment log for "modificada" indicator (§9.2)
	const { data: logs } =
		sessionIds.length > 0
			? await locals.supabase
					.from('appointment_log')
					.select('session_id, created_at, actor_therapist_id')
					.in('session_id', sessionIds)
					.order('created_at', { ascending: false })
			: { data: [] };

	// Build per-session log summary
	const logMap = new Map<string, { count: number; lastAt: string }>();
	for (const log of logs ?? []) {
		const entry = logMap.get(log.session_id);
		if (!entry) {
			logMap.set(log.session_id, { count: 1, lastAt: log.created_at });
		} else {
			entry.count++;
		}
	}

	// Month closure record
	const { data: closure } = await locals.supabase
		.from('month_closures')
		.select('id, status, closed_at, closed_by')
		.eq('therapist_id', therapist.id)
		.eq('month_year', selectedMonth)
		.maybeSingle();

	// Month summary
	const total = sessionList.length;
	const apontadas = sessionList.filter((s) => s.attendance_status !== null).length;
	const pendentes = sessionList.filter((s) =>
		isPending(s.scheduled_at, s.duration_minutes, s.status, s.attendance_status, now)
	).length;

	return {
		sessions: sessionList.map((s) => ({
			...s,
			patientName: (s.patients as unknown as { name: string } | null)?.name ?? '',
			isModified: (logMap.get(s.id)?.count ?? 0) > 1,
			lastLogAt: logMap.get(s.id)?.lastAt ?? null
		})),
		closure,
		selectedMonth,
		defaultMonth,
		summary: {
			total,
			apontadas,
			pendentes,
			fechado: closure?.status === 'closed'
		}
	};
};

// ── actions ───────────────────────────────────────────────────────────────────

export const actions: Actions = {
	// Aponta uma sessão individual como presente ou faltou (§7.1 / §7.2)
	appoint: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const { data: therapist } = await locals.supabase
			.from('therapists')
			.select('id, clinic_id')
			.eq('user_id', user.id)
			.single();
		if (!therapist) return fail(403, { error: 'Terapeuta não encontrado' });

		const schema = z.object({
			session_id: z.string().uuid(),
			status: z.enum(['presente', 'faltou'])
		});
		const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const { session_id, status } = parsed.data;

		// Fetch session (ownership + current state for log)
		const { data: session, error: sessionError } = await locals.supabase
			.from('sessions')
			.select('id, clinic_id, scheduled_at, duration_minutes, status, attendance_status')
			.eq('id', session_id)
			.eq('therapist_id', therapist.id)
			.single();

		if (sessionError || !session) return fail(404, { error: 'Sessão não encontrada' });
		if (session.status === 'cancelled')
			return fail(422, { error: 'Sessão cancelada não pode ser apontada' });

		const now = new Date();
		if (!sessionEndedBefore(session.scheduled_at, session.duration_minutes, now)) {
			return fail(422, { error: 'A sessão ainda não terminou' });
		}

		// Check month is open (§6.3)
		const monthYear = session.scheduled_at.slice(0, 7);
		const { data: closure } = await locals.supabase
			.from('month_closures')
			.select('status')
			.eq('therapist_id', therapist.id)
			.eq('month_year', monthYear)
			.maybeSingle();

		if (closure?.status === 'closed') {
			return fail(422, { error: 'Mês fechado — apontamento não permitido' });
		}

		const previousValue = session.attendance_status as 'presente' | 'faltou' | null;
		const isUpdate = previousValue !== null;
		const attendedAt = now.toISOString();

		// Update session
		const { error: updateError } = await locals.supabase
			.from('sessions')
			.update({ attendance_status: status, attendance_updated_at: attendedAt })
			.eq('id', session_id)
			.eq('therapist_id', therapist.id);

		if (updateError) return fail(400, { error: updateError.message });

		// Immutable audit log (§9.1)
		const { error: logError } = await locals.supabase.from('appointment_log').insert({
			session_id,
			clinic_id: therapist.clinic_id,
			actor_therapist_id: therapist.id,
			action: isUpdate ? 'updated' : 'created',
			previous_value: previousValue,
			new_value: status,
			source: 'ui'
		});

		if (logError) return fail(400, { error: logError.message });

		await invalidateDashboard(therapist.id);
		return { success: true, action: 'appoint' };
	},

	// Marca todas as sessões pendentes do dia como presente (§7.3)
	appointBulk: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const { data: therapist } = await locals.supabase
			.from('therapists')
			.select('id, clinic_id')
			.eq('user_id', user.id)
			.single();
		if (!therapist) return fail(403, { error: 'Terapeuta não encontrado' });

		const schema = z.object({
			date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
		});
		const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const { date } = parsed.data;
		const monthYear = date.slice(0, 7);

		// Check month is open
		const { data: closure } = await locals.supabase
			.from('month_closures')
			.select('status')
			.eq('therapist_id', therapist.id)
			.eq('month_year', monthYear)
			.maybeSingle();

		if (closure?.status === 'closed') {
			return fail(422, { error: 'Mês fechado — apontamento não permitido' });
		}

		const now = new Date();
		// UTC day boundaries (v1: timezone-agnostic approximation)
		const dayStart = `${date}T00:00:00.000Z`;
		const dayEnd = `${date}T23:59:59.999Z`;

		// Bulk update: only pending sessions that have started before now
		const { data: updated, error: updateError } = await locals.supabase
			.from('sessions')
			.update({ attendance_status: 'presente', attendance_updated_at: now.toISOString() })
			.eq('therapist_id', therapist.id)
			.gte('scheduled_at', dayStart)
			.lte('scheduled_at', dayEnd)
			.neq('status', 'cancelled')
			.is('attendance_status', null)
			.lt('scheduled_at', now.toISOString())
			.select('id');

		if (updateError) return fail(400, { error: updateError.message });

		// Insert one log entry per session (§9.1 source: bulk_action)
		if (updated && updated.length > 0) {
			const logs = updated.map((s) => ({
				session_id: s.id,
				clinic_id: therapist.clinic_id,
				actor_therapist_id: therapist.id,
				action: 'created' as const,
				previous_value: null,
				new_value: 'presente' as const,
				source: 'bulk_action' as const
			}));

			const { error: logError } = await locals.supabase.from('appointment_log').insert(logs);
			if (logError) return fail(400, { error: logError.message });
		}

		await invalidateDashboard(therapist.id);
		return { success: true, action: 'appointBulk', count: updated?.length ?? 0 };
	},

	// Fecha o mês (§7.4): só permitido quando pendentes = 0
	closeMonth: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const { data: therapist } = await locals.supabase
			.from('therapists')
			.select('id, clinic_id')
			.eq('user_id', user.id)
			.single();
		if (!therapist) return fail(403, { error: 'Terapeuta não encontrado' });

		const schema = z.object({
			month_year: z.string().regex(/^\d{4}-\d{2}$/)
		});
		const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const { month_year } = parsed.data;
		const { start, end } = monthRangeDates(month_year);
		const now = new Date();

		// Pending count: sessions that ended but are not yet apontadas
		const { count: pendingCount, error: countError } = await locals.supabase
			.from('sessions')
			.select('id', { count: 'exact', head: true })
			.eq('therapist_id', therapist.id)
			.gte('scheduled_at', `${start}T00:00:00.000Z`)
			.lt('scheduled_at', `${end}T00:00:00.000Z`)
			.neq('status', 'cancelled')
			.is('attendance_status', null)
			.lt('scheduled_at', now.toISOString());

		if (countError) return fail(400, { error: countError.message });
		if ((pendingCount ?? 0) > 0) {
			return fail(422, {
				error: `Ainda há ${pendingCount} sessão(ões) sem apontamento`
			});
		}

		const closedAt = now.toISOString();
		const logEntry = {
			action: 'closed',
			at: closedAt,
			by: therapist.id,
			role: 'profissional'
		};

		// Upsert: creates if not exists, updates if already open
		const { error: upsertError } = await locals.supabase.from('month_closures').upsert(
			{
				clinic_id: therapist.clinic_id,
				therapist_id: therapist.id,
				month_year,
				status: 'closed',
				closed_at: closedAt,
				closed_by: therapist.id,
				log: [logEntry]
			},
			{ onConflict: 'clinic_id,therapist_id,month_year' }
		);

		if (upsertError) return fail(400, { error: upsertError.message });

		// month_closed event hook (stub — ready for future consumers such as TTS/email)
		// await eventBus.emit('month_closed', { therapist_id: therapist.id, month_year });

		await invalidateDashboard(therapist.id);
		return { success: true, action: 'closeMonth' };
	},

	// Reabre um mês fechado (decisão Fase 1: permitido, pelo próprio terapeuta)
	reopenMonth: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Não autenticado' });

		const { data: therapist } = await locals.supabase
			.from('therapists')
			.select('id')
			.eq('user_id', user.id)
			.single();
		if (!therapist) return fail(403, { error: 'Terapeuta não encontrado' });

		const schema = z.object({
			closure_id: z.string().uuid()
		});
		const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const { closure_id } = parsed.data;

		const { data: closure, error: fetchError } = await locals.supabase
			.from('month_closures')
			.select('id, status, month_year')
			.eq('id', closure_id)
			.eq('therapist_id', therapist.id)
			.single();

		if (fetchError || !closure) return fail(404, { error: 'Fechamento não encontrado' });
		if (closure.status !== 'closed') return fail(422, { error: 'Mês não está fechado' });

		const now = new Date().toISOString();
		const { error: updateError } = await locals.supabase
			.from('month_closures')
			.update({ status: 'open', reopened_at: now, reopened_by: therapist.id })
			.eq('id', closure_id)
			.eq('therapist_id', therapist.id);

		if (updateError) return fail(400, { error: updateError.message });

		await invalidateDashboard(therapist.id);
		return { success: true, action: 'reopenMonth' };
	}
};
