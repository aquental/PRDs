/**
 * Testes das server actions de /app/fechamento-mensal.
 *
 * Estratégia de mock: cada tabela tem sua própria cadeia independente.
 * Para "sessions" (que é chamada 2x no appoint: select + update), usamos
 * um contador por closure para diferenciar as chamadas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isActionFailure } from '@sveltejs/kit';
import { actions } from './+page.server';

// ── module mocks ──────────────────────────────────────────────────────────────

vi.mock('$lib/redis', () => ({
	invalidateDashboard: vi.fn().mockResolvedValue(undefined)
}));

// ── constants ─────────────────────────────────────────────────────────────────

const THERAPIST = { id: 'therapist-1', clinic_id: 'clinic-1' };
const USER = { id: 'user-1' };
const SESSION_UUID = 'b2c3d4e5-f6a7-8901-bcde-f01234567891';
const CLOSURE_UUID = 'c3d4e5f6-a7b8-9012-cdef-012345678912';

// Session cuja hora de fim já passou (scheduled 1h atrás + 50min = terminou há 10min)
const PAST_SESSION = {
	id: SESSION_UUID,
	clinic_id: 'clinic-1',
	scheduled_at: new Date(Date.now() - 70 * 60_000).toISOString(), // 70min atrás
	duration_minutes: 50,
	status: 'scheduled',
	attendance_status: null
};

const APONTADA_SESSION = {
	...PAST_SESSION,
	attendance_status: 'presente' as 'presente' | 'faltou' | null
};

// ── mock factory helpers ──────────────────────────────────────────────────────

function makeRequest(data: Record<string, string>): Request {
	const fd = new FormData();
	Object.entries(data).forEach(([k, v]) => fd.append(k, v));
	return { formData: () => Promise.resolve(fd) } as unknown as Request;
}

/** Gera cadeia genérica que retorna `this` em todos os métodos e resolve via `.then`. */
function makeThenable<T>(result: T) {
	const chain: Record<string, unknown> = {};
	const methods = [
		'select', 'eq', 'neq', 'is', 'gte', 'lte', 'lt', 'gt', 'in', 'insert',
		'update', 'upsert', 'order', 'limit', 'single', 'maybeSingle'
	];
	methods.forEach((m) => {
		chain[m] = vi.fn().mockReturnValue(chain);
	});
	chain['single'] = vi.fn().mockResolvedValue(result);
	chain['maybeSingle'] = vi.fn().mockResolvedValue(result);
	// Thenable: permite `await chain` no final de qualquer cadeia
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(chain as any).then = (resolve: (v: T) => unknown) => Promise.resolve(result).then(resolve);
	return chain;
}

/**
 * Factory de locals para o action `appoint`.
 * sessions é chamada 2x: 1ª = select, 2ª = update.
 */
function makeAppointLocals({
	user = USER as { id: string } | null,
	therapistData = THERAPIST as typeof THERAPIST | null,
	sessionData = PAST_SESSION as (Omit<typeof PAST_SESSION, 'attendance_status'> & { attendance_status: 'presente' | 'faltou' | null; status: string }) | null,
	closureData = null as { status: string } | null,
	sessionUpdateError = null as { message: string } | null,
	logInsertError = null as { message: string } | null
} = {}) {
	const sessionCallsRef = { n: 0 };

	const fromMock = vi.fn((table: string) => {
		switch (table) {
			case 'therapists':
				return makeThenable({ data: therapistData, error: therapistData ? null : { message: 'not found' } });

			case 'sessions': {
				sessionCallsRef.n++;
				if (sessionCallsRef.n === 1) {
					// 1ª chamada: select da sessão
					return makeThenable({ data: sessionData, error: sessionData ? null : { message: 'not found' } });
				}
				// 2ª chamada: update de attendance
				return makeThenable({ data: null, error: sessionUpdateError });
			}

			case 'month_closures':
				return makeThenable({ data: closureData, error: null });

			case 'appointment_log':
				return makeThenable({ data: null, error: logInsertError });

			default:
				return makeThenable({ data: null, error: null });
		}
	});

	return {
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		supabase: { from: fromMock }
	};
}

/**
 * Factory de locals para `appointBulk`.
 * sessions chamada 1x (update com .select()), month_closures 1x (maybeSingle).
 */
function makeBulkLocals({
	user = USER as { id: string } | null,
	therapistData = THERAPIST as typeof THERAPIST | null,
	closureData = null as { status: string } | null,
	updatedSessions = [] as { id: string }[],
	sessionUpdateError = null as { message: string } | null,
	logInsertError = null as { message: string } | null
} = {}) {
	const fromMock = vi.fn((table: string) => {
		switch (table) {
			case 'therapists':
				return makeThenable({ data: therapistData, error: null });

			case 'sessions': {
				// update().eq().gte().lte().neq().is().lt().select() → resolves
				const chain = makeThenable({ data: updatedSessions, error: sessionUpdateError });
				chain['update'] = vi.fn().mockReturnValue(chain);
				chain['select'] = vi.fn().mockResolvedValue({ data: updatedSessions, error: sessionUpdateError });
				return chain;
			}

			case 'month_closures':
				return makeThenable({ data: closureData, error: null });

			case 'appointment_log':
				return makeThenable({ data: null, error: logInsertError });

			default:
				return makeThenable({ data: null, error: null });
		}
	});

	return {
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		supabase: { from: fromMock }
	};
}

/**
 * Factory de locals para `closeMonth`.
 * sessions chamada 1x (count query), month_closures 1x (upsert).
 */
function makeCloseMonthLocals({
	user = USER as { id: string } | null,
	therapistData = THERAPIST as typeof THERAPIST | null,
	pendingCount = 0,
	countError = null as { message: string } | null,
	upsertError = null as { message: string } | null
} = {}) {
	const fromMock = vi.fn((table: string) => {
		switch (table) {
			case 'therapists':
				return makeThenable({ data: therapistData, error: null });

			case 'sessions':
				// count query com head: true
				return makeThenable({ count: pendingCount, error: countError, data: null });

			case 'month_closures':
				return makeThenable({ data: null, error: upsertError });

			default:
				return makeThenable({ data: null, error: null });
		}
	});

	return {
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		supabase: { from: fromMock }
	};
}

/**
 * Factory de locals para `reopenMonth`.
 * month_closures chamada 2x: 1ª = select (single), 2ª = update.
 */
function makeReopenLocals({
	user = USER as { id: string } | null,
	therapistData = { id: THERAPIST.id } as { id: string } | null,
	closureData = { id: CLOSURE_UUID, status: 'closed', month_year: '2026-04' } as {
		id: string; status: string; month_year: string;
	} | null,
	closureFetchError = null as { message: string } | null,
	updateError = null as { message: string } | null
} = {}) {
	const closureCallsRef = { n: 0 };

	const fromMock = vi.fn((table: string) => {
		switch (table) {
			case 'therapists':
				return makeThenable({ data: therapistData, error: null });

			case 'month_closures': {
				closureCallsRef.n++;
				if (closureCallsRef.n === 1) {
					// 1ª chamada: select do closure (ownership check)
					return makeThenable({
						data: closureData,
						error: closureFetchError
					});
				}
				// 2ª chamada: update do closure
				return makeThenable({ data: null, error: updateError });
			}

			default:
				return makeThenable({ data: null, error: null });
		}
	});

	return {
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		supabase: { from: fromMock }
	};
}

// ── helpers ───────────────────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
});

type ActionArgs<T extends keyof typeof actions> = Parameters<(typeof actions)[T]>[0];

function callAction<T extends keyof typeof actions>(
	name: T,
	locals: ReturnType<typeof makeAppointLocals>,
	data: Record<string, string>
) {
	return (actions[name] as (args: ActionArgs<T>) => unknown)({
		request: makeRequest(data),
		locals
	} as unknown as ActionArgs<T>);
}

// ── appoint ───────────────────────────────────────────────────────────────────

describe('appoint', () => {
	it('happy path: sessão passada + mês aberto + status válido → success', async () => {
		const locals = makeAppointLocals();
		const result = await callAction('appoint', locals, {
			session_id: SESSION_UUID,
			status: 'presente'
		});
		expect(result).toEqual({ success: true, action: 'appoint' });
	});

	it('status faltou → success', async () => {
		const locals = makeAppointLocals();
		const result = await callAction('appoint', locals, {
			session_id: SESSION_UUID,
			status: 'faltou'
		});
		expect(result).toEqual({ success: true, action: 'appoint' });
	});

	it('sessão já apontada → action = updated (success)', async () => {
		const locals = makeAppointLocals({ sessionData: APONTADA_SESSION });
		const result = await callAction('appoint', locals, {
			session_id: SESSION_UUID,
			status: 'faltou'
		});
		expect(result).toEqual({ success: true, action: 'appoint' });
	});

	it('unauthenticated → 401', async () => {
		const locals = makeAppointLocals({ user: null });
		const result = await callAction('appoint', locals, {
			session_id: SESSION_UUID,
			status: 'presente'
		});
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(401);
	});

	it('sem terapeuta → 403', async () => {
		const locals = makeAppointLocals({ therapistData: null });
		const result = await callAction('appoint', locals, {
			session_id: SESSION_UUID,
			status: 'presente'
		});
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(403);
	});

	it('session_id inválido (não UUID) → 400', async () => {
		const locals = makeAppointLocals();
		const result = await callAction('appoint', locals, {
			session_id: 'not-a-uuid',
			status: 'presente'
		});
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) {
			expect(result.status).toBe(400);
			expect((result.data as unknown as { error: Record<string, unknown> }).error).toHaveProperty(
				'session_id'
			);
		}
	});

	it('status inválido → 400', async () => {
		const locals = makeAppointLocals();
		const result = await callAction('appoint', locals, {
			session_id: SESSION_UUID,
			status: 'compareceu'
		});
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);
	});

	it('sessão não encontrada → 404', async () => {
		const locals = makeAppointLocals({ sessionData: null });
		const result = await callAction('appoint', locals, {
			session_id: SESSION_UUID,
			status: 'presente'
		});
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(404);
	});

	it('sessão cancelada → 422', async () => {
		const locals = makeAppointLocals({
			sessionData: { ...PAST_SESSION, status: 'cancelled' }
		});
		const result = await callAction('appoint', locals, {
			session_id: SESSION_UUID,
			status: 'presente'
		});
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) {
			expect(result.status).toBe(422);
			expect((result.data as unknown as { error: string }).error).toMatch(/cancelada/);
		}
	});

	it('sessão ainda não terminou → 422', async () => {
		const futurSession = {
			...PAST_SESSION,
			// começa daqui a 30min
			scheduled_at: new Date(Date.now() + 30 * 60_000).toISOString()
		};
		const locals = makeAppointLocals({ sessionData: futurSession });
		const result = await callAction('appoint', locals, {
			session_id: SESSION_UUID,
			status: 'presente'
		});
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) {
			expect(result.status).toBe(422);
			expect((result.data as unknown as { error: string }).error).toMatch(/ainda não terminou/);
		}
	});

	it('mês fechado → 422', async () => {
		const locals = makeAppointLocals({ closureData: { status: 'closed' } });
		const result = await callAction('appoint', locals, {
			session_id: SESSION_UUID,
			status: 'presente'
		});
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) {
			expect(result.status).toBe(422);
			expect((result.data as unknown as { error: string }).error).toMatch(/Mês fechado/);
		}
	});

	it('erro no update da sessão → 400', async () => {
		const locals = makeAppointLocals({
			sessionUpdateError: { message: 'connection timeout' }
		});
		const result = await callAction('appoint', locals, {
			session_id: SESSION_UUID,
			status: 'presente'
		});
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) {
			expect(result.status).toBe(400);
			expect((result.data as unknown as { error: string }).error).toBe('connection timeout');
		}
	});

	it('erro no insert do log → 400', async () => {
		const locals = makeAppointLocals({
			logInsertError: { message: 'log constraint error' }
		});
		const result = await callAction('appoint', locals, {
			session_id: SESSION_UUID,
			status: 'presente'
		});
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);
	});
});

// ── appointBulk ───────────────────────────────────────────────────────────────

describe('appointBulk', () => {
	const TODAY = new Date().toLocaleDateString('sv'); // YYYY-MM-DD

	it('happy path: dia com sessões pendentes → success + count', async () => {
		const locals = makeBulkLocals({
			updatedSessions: [{ id: 's1' }, { id: 's2' }]
		});
		const result = await callAction('appointBulk', locals, { date: TODAY });
		expect(result).toEqual({ success: true, action: 'appointBulk', count: 2 });
	});

	it('dia sem pendências → success + count 0', async () => {
		const locals = makeBulkLocals({ updatedSessions: [] });
		const result = await callAction('appointBulk', locals, { date: TODAY });
		expect(result).toEqual({ success: true, action: 'appointBulk', count: 0 });
	});

	it('date inválido → 400', async () => {
		const locals = makeBulkLocals();
		const result = await callAction('appointBulk', locals, { date: '15/05/2026' });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);
	});

	it('mês fechado → 422', async () => {
		const locals = makeBulkLocals({ closureData: { status: 'closed' } });
		const result = await callAction('appointBulk', locals, { date: TODAY });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(422);
	});

	it('unauthenticated → 401', async () => {
		const locals = makeBulkLocals({ user: null });
		const result = await callAction('appointBulk', locals, { date: TODAY });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(401);
	});

	it('sem terapeuta → 403', async () => {
		const locals = makeBulkLocals({ therapistData: null });
		const result = await callAction('appointBulk', locals, { date: TODAY });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(403);
	});

	it('erro no update → 400', async () => {
		const locals = makeBulkLocals({
			sessionUpdateError: { message: 'db error' },
			updatedSessions: []
		});
		const result = await callAction('appointBulk', locals, { date: TODAY });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);
	});
});

// ── closeMonth ────────────────────────────────────────────────────────────────

describe('closeMonth', () => {
	it('happy path: zero pendências → success', async () => {
		const locals = makeCloseMonthLocals({ pendingCount: 0 });
		const result = await callAction('closeMonth', locals, { month_year: '2026-04' });
		expect(result).toEqual({ success: true, action: 'closeMonth' });
	});

	it('com pendências → 422 com mensagem', async () => {
		const locals = makeCloseMonthLocals({ pendingCount: 3 });
		const result = await callAction('closeMonth', locals, { month_year: '2026-04' });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) {
			expect(result.status).toBe(422);
			expect((result.data as unknown as { error: string }).error).toMatch(/3/);
		}
	});

	it('month_year formato inválido → 400', async () => {
		const locals = makeCloseMonthLocals();
		const result = await callAction('closeMonth', locals, { month_year: '05/2026' });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);
	});

	it('unauthenticated → 401', async () => {
		const locals = makeCloseMonthLocals({ user: null });
		const result = await callAction('closeMonth', locals, { month_year: '2026-04' });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(401);
	});

	it('sem terapeuta → 403', async () => {
		const locals = makeCloseMonthLocals({ therapistData: null });
		const result = await callAction('closeMonth', locals, { month_year: '2026-04' });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(403);
	});

	it('erro no count → 400', async () => {
		const locals = makeCloseMonthLocals({
			countError: { message: 'timeout' }
		});
		const result = await callAction('closeMonth', locals, { month_year: '2026-04' });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);
	});

	it('erro no upsert → 400', async () => {
		const locals = makeCloseMonthLocals({
			pendingCount: 0,
			upsertError: { message: 'unique violation' }
		});
		const result = await callAction('closeMonth', locals, { month_year: '2026-04' });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);
	});
});

// ── reopenMonth ───────────────────────────────────────────────────────────────

describe('reopenMonth', () => {
	it('happy path: mês fechado → sucesso', async () => {
		const locals = makeReopenLocals();
		const result = await callAction('reopenMonth', locals, { closure_id: CLOSURE_UUID });
		expect(result).toEqual({ success: true, action: 'reopenMonth' });
	});

	it('closure_id não UUID → 400', async () => {
		const locals = makeReopenLocals();
		const result = await callAction('reopenMonth', locals, { closure_id: 'not-a-uuid' });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);
	});

	it('closure não encontrado → 404', async () => {
		const locals = makeReopenLocals({ closureData: null });
		const result = await callAction('reopenMonth', locals, { closure_id: CLOSURE_UUID });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(404);
	});

	it('mês já aberto → 422', async () => {
		const locals = makeReopenLocals({
			closureData: { id: CLOSURE_UUID, status: 'open', month_year: '2026-04' }
		});
		const result = await callAction('reopenMonth', locals, { closure_id: CLOSURE_UUID });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) {
			expect(result.status).toBe(422);
			expect((result.data as unknown as { error: string }).error).toMatch(/não está fechado/);
		}
	});

	it('unauthenticated → 401', async () => {
		const locals = makeReopenLocals({ user: null });
		const result = await callAction('reopenMonth', locals, { closure_id: CLOSURE_UUID });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(401);
	});

	it('sem terapeuta → 403', async () => {
		const locals = makeReopenLocals({ therapistData: null });
		const result = await callAction('reopenMonth', locals, { closure_id: CLOSURE_UUID });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(403);
	});

	it('erro no update → 400', async () => {
		const locals = makeReopenLocals({ updateError: { message: 'constraint fail' } });
		const result = await callAction('reopenMonth', locals, { closure_id: CLOSURE_UUID });
		expect(isActionFailure(result)).toBe(true);
		if (isActionFailure(result)) expect(result.status).toBe(400);
	});
});
