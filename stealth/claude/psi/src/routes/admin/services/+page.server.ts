import type { PageServerLoad } from './$types';
import { serverConfig } from '$lib/config.server';
import { getRedis } from '$lib/redis';
import { createSupabaseAdminClient } from '$lib/supabase/server';
import { env } from '$env/dynamic/public';
import type { AICallType, AIUsageLog } from '$core/types';

export type ServiceStatus = 'ok' | 'warning' | 'error';

export interface ServiceCheck {
	id: string;
	name: string;
	status: ServiceStatus;
	latency_ms: number | null;
	message: string;
	logs: string[];
	checked_at: string;
}

const TIMEOUT = 5_000;

function withTimeout<T>(p: Promise<T> | PromiseLike<T>): Promise<T> {
	return Promise.race([
		Promise.resolve(p),
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error(`Sem resposta (>${TIMEOUT}ms)`)), TIMEOUT)
		)
	]);
}

function errMsg(e: unknown): string {
	return e instanceof Error ? e.message : 'Erro desconhecido';
}

function makeCheck(
	id: string,
	name: string,
	status: ServiceStatus,
	latency_ms: number,
	message: string,
	logs: string[]
): ServiceCheck {
	return { id, name, status, latency_ms, message, logs, checked_at: new Date().toISOString() };
}

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

async function recentLogs(admin: AdminClient, types: AICallType[]): Promise<string[]> {
	const { data } = await admin
		.from('ai_usage_logs')
		.select('provider, model, duration_ms, status, error_message, created_at')
		.in('call_type', types)
		.order('created_at', { ascending: false })
		.limit(3);

	return ((data ?? []) as Array<Pick<AIUsageLog, 'provider' | 'model' | 'duration_ms' | 'status' | 'error_message' | 'created_at'>>).map(
		(r) => {
			const t = new Date(r.created_at).toLocaleTimeString('pt-BR');
			const ok = r.status === 'success';
			const detail = ok
				? `${r.model ?? r.provider} · ${r.duration_ms != null ? `${r.duration_ms}ms` : '—'}`
				: (r.error_message ?? 'erro').slice(0, 72);
			return `${t}  ${ok ? 'ok ' : 'err'}  ${detail}`;
		}
	);
}

// ── Checagem individual ──────────────────────────────────────────────────────

async function checkCep(cepUrl: string): Promise<ServiceCheck> {
	const t0 = Date.now();
	try {
		const res = await withTimeout(fetch(`${cepUrl}/01001000/json/`));
		const ms = Date.now() - t0;
		if (!res.ok) return makeCheck('cep', 'API de CEP', 'error', ms, `HTTP ${res.status}`, []);
		const json = (await res.json()) as Record<string, unknown>;
		if (!json?.cep) return makeCheck('cep', 'API de CEP', 'warning', ms, 'Resposta inesperada', []);
		const status: ServiceStatus = ms > 2000 ? 'warning' : 'ok';
		return makeCheck('cep', 'API de CEP', status, ms, ms > 2000 ? 'Latência elevada' : 'Operacional', []);
	} catch (e) {
		return makeCheck('cep', 'API de CEP', 'error', Date.now() - t0, errMsg(e), []);
	}
}

async function checkLlm(cfg: ReturnType<typeof serverConfig>, admin: AdminClient): Promise<ServiceCheck> {
	const t0 = Date.now();
	const [connResult, logsResult] = await Promise.allSettled([
		withTimeout(
			fetch(`${cfg.LLM_BASE_URL}/models`, {
				headers: { Authorization: `Bearer ${cfg.LLM_API_KEY}` }
			})
		),
		recentLogs(admin, ['llm_chat'])
	]);
	const ms = Date.now() - t0;
	const logs = logsResult.status === 'fulfilled' ? logsResult.value : [];

	if (connResult.status === 'rejected') {
		return makeCheck('llm', 'API de LLM', 'error', ms, errMsg(connResult.reason), logs);
	}
	const res = connResult.value;
	// 404 é aceitável — alguns provedores não expõem /models
	if (!res.ok && res.status !== 404) {
		return makeCheck('llm', 'API de LLM', 'error', ms, `HTTP ${res.status}`, logs);
	}
	const status: ServiceStatus = ms > 2000 ? 'warning' : 'ok';
	return makeCheck(
		'llm', 'API de LLM', status, ms,
		ms > 2000 ? 'Latência elevada' : `Operacional · ${cfg.LLM_MODEL}`,
		logs
	);
}

async function checkTts(cfg: ReturnType<typeof serverConfig>, admin: AdminClient): Promise<ServiceCheck> {
	const t0 = Date.now();
	const [connResult, logsResult] = await Promise.allSettled([
		withTimeout(
			fetch('https://api.elevenlabs.io/v1/user/subscription', {
				headers: { 'xi-api-key': cfg.ELEVENLABS_API_KEY }
			})
		),
		recentLogs(admin, ['tts_synthesis', 'stt_transcription'])
	]);
	const ms = Date.now() - t0;
	const logs = logsResult.status === 'fulfilled' ? logsResult.value : [];

	if (connResult.status === 'rejected') {
		return makeCheck('tts', 'API de TTS / STT', 'error', ms, errMsg(connResult.reason), logs);
	}
	const res = connResult.value;
	if (!res.ok) {
		const st: ServiceStatus = res.status === 401 || res.status === 403 ? 'error' : 'warning';
		return makeCheck('tts', 'API de TTS / STT', st, ms, `HTTP ${res.status}`, logs);
	}
	const status: ServiceStatus = ms > 2000 ? 'warning' : 'ok';
	return makeCheck(
		'tts', 'API de TTS / STT', status, ms,
		ms > 2000 ? 'Latência elevada' : `Operacional · ${cfg.ELEVENLABS_MODEL}`,
		logs
	);
}

async function checkRedis(): Promise<ServiceCheck> {
	const t0 = Date.now();
	try {
		const pong = await withTimeout(getRedis().ping());
		const ms = Date.now() - t0;
		if (pong !== 'PONG') {
			return makeCheck('redis', 'Cache (Redis)', 'warning', ms, `Resposta inesperada: ${pong}`, []);
		}
		const status: ServiceStatus = ms > 500 ? 'warning' : 'ok';
		return makeCheck('redis', 'Cache (Redis)', status, ms, ms > 500 ? 'Latência elevada' : 'Operacional', []);
	} catch (e) {
		return makeCheck('redis', 'Cache (Redis)', 'error', Date.now() - t0, errMsg(e), []);
	}
}

async function checkSupabase(admin: AdminClient): Promise<ServiceCheck> {
	const t0 = Date.now();
	try {
		const result = await withTimeout(
			admin.from('clinics').select('id', { count: 'exact', head: true }).then((r) => r)
		);
		const ms = Date.now() - t0;
		if (result.error) return makeCheck('supabase', 'Banco de dados', 'error', ms, result.error.message, []);
		const status: ServiceStatus = ms > 1000 ? 'warning' : 'ok';
		return makeCheck('supabase', 'Banco de dados', status, ms, ms > 1000 ? 'Latência elevada' : 'Operacional', []);
	} catch (e) {
		return makeCheck('supabase', 'Banco de dados', 'error', Date.now() - t0, errMsg(e), []);
	}
}

// ── Load ─────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async () => {
	const cfg = serverConfig();
	const admin = createSupabaseAdminClient();
	const cepUrl = env.PUBLIC_CEP_API_URL ?? 'https://viacep.com.br/ws';

	const services = await Promise.all([
		checkCep(cepUrl),
		checkLlm(cfg, admin),
		checkTts(cfg, admin),
		checkRedis(),
		checkSupabase(admin)
	]);

	return { services };
};
