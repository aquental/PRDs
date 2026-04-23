/**
 * Kill-switch registry.
 * Estado persistido no Supabase (service_switches); cache in-memory de 30s
 * para não fazer round-trip em cada request.
 *
 * Importar APENAS em código server-only (.server.ts, +server.ts, hooks.server.ts).
 */
import { createSupabaseAdminClient } from '$lib/supabase/server';

export type ServiceId = 'cep' | 'llm' | 'tts' | 'redis';
export type ServiceSwitches = Record<ServiceId, boolean>;

const DEFAULTS: ServiceSwitches = { cep: true, llm: true, tts: true, redis: true };
const CACHE_TTL = 30_000; // ms

let _cache: { data: ServiceSwitches; ts: number } | null = null;

/** Retorna o estado atual dos kill-switches (com cache). */
export async function getServiceSwitches(): Promise<ServiceSwitches> {
	if (_cache && Date.now() - _cache.ts < CACHE_TTL) return _cache.data;

	try {
		const admin = createSupabaseAdminClient();
		const { data } = await admin.from('service_switches').select('id, enabled');

		const switches: ServiceSwitches = { ...DEFAULTS };
		for (const row of (data ?? []) as { id: string; enabled: boolean }[]) {
			if (row.id in DEFAULTS) switches[row.id as ServiceId] = row.enabled;
		}

		_cache = { data: switches, ts: Date.now() };
		return switches;
	} catch {
		// Falha silenciosa: serviços habilitados por padrão (fail-open).
		return { ...DEFAULTS };
	}
}

/** Grava o estado de um kill-switch e invalida o cache. Lança erro se a escrita falhar. */
export async function setServiceSwitch(
	id: ServiceId,
	enabled: boolean,
	updatedBy: string
): Promise<void> {
	const admin = createSupabaseAdminClient();
	const { error } = await admin.from('service_switches').upsert(
		{ id, enabled, updated_at: new Date().toISOString(), updated_by: updatedBy },
		{ onConflict: 'id' }
	);
	if (error) throw new Error(`Falha ao atualizar switch '${id}': ${error.message}`);
	_cache = null;
}
