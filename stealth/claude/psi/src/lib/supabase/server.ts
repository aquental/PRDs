import { createServerClient } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';
import { publicConfig } from '$lib/config';
import { serverConfig } from '$lib/config.server';

/**
 * Cliente Supabase vinculado à sessão do request atual.
 * Instanciado em `hooks.server.ts` e disponível via `event.locals.supabase`.
 */
export function createSupabaseServerClient(event: RequestEvent) {
	return createServerClient(publicConfig.PUBLIC_SUPABASE_URL, publicConfig.PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookies) => {
				for (const { name, value, options } of cookies) {
					event.cookies.set(name, value, { ...options, path: '/' });
				}
			}
		}
	});
}

/**
 * Cliente service-role. Usar APENAS em fluxos confiáveis server-side
 * (admin, jobs, migrations) — bypass de RLS.
 */
import { createClient } from '@supabase/supabase-js';
export function createSupabaseAdminClient() {
	const cfg = serverConfig();
	return createClient(publicConfig.PUBLIC_SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}
