/**
 * Public (client-safe) config · 12-factor III (Config in environment).
 *
 * Esta é a parte do config importável por código executado no browser.
 * Só expõe variáveis `PUBLIC_*` (convenção SvelteKit).
 *
 * Para variáveis privadas use `$lib/config.server` em código server-only
 * (.server.ts, +server.ts, hooks.server.ts).
 */
import { z } from 'zod';
import { env as publicEnv } from '$env/dynamic/public';

const PublicSchema = z.object({
	PUBLIC_APP_NAME: z.string().default('Psi'),
	PUBLIC_APP_URL: z.string().url(),
	PUBLIC_APP_TIMEZONE: z.string().default('America/Sao_Paulo'),
	PUBLIC_SUPABASE_URL: z.string().url(),
	PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
	PUBLIC_FEATURE_VOICE_CHAT: z
		.string()
		.default('true')
		.transform((v) => v === 'true'),
	PUBLIC_FEATURE_TELEGRAM_OMNICHANNEL: z
		.string()
		.default('false')
		.transform((v) => v === 'true')
});

export const publicConfig = PublicSchema.parse(publicEnv);
