/**
 * Server-only config. Import from `$lib/config.server` ONLY in server code
 * (.server.ts, +server.ts, hooks.server.ts). Importing this in browser code
 * will fail the SvelteKit build, which is the desired fail-fast behavior.
 */
import { z } from 'zod';
import { env as privateEnv } from '$env/dynamic/private';

const PrivateSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
	SUPABASE_JWT_SECRET: z.string().min(1),
	SUPABASE_ENCRYPTION_KEY: z.string().min(16),

	UPSTASH_REDIS_REST_URL: z.string().url(),
	UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

	GOOGLE_CLIENT_ID: z.string().min(1),
	GOOGLE_CLIENT_SECRET: z.string().min(1),
	GOOGLE_REDIRECT_URI: z.string().url(),
	GOOGLE_CALENDAR_SCOPES: z.string().default(''),

	LLM_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
	LLM_API_KEY: z.string().min(1),
	LLM_MODEL: z.string().default('gpt-4o-mini'),
	LLM_PROVIDER: z.string().default('openai'),

	ELEVENLABS_API_KEY: z.string().min(1),
	ELEVENLABS_VOICE_ID: z.string().min(1),
	ELEVENLABS_MODEL: z.string().default('eleven_turbo_v2_5'),
	ELEVENLABS_OUTPUT_FORMAT: z.string().default('mp3_44100_128'),

	ADMIN_EMAILS: z
		.string()
		.default('')
		.transform((v) =>
			v
				.split(',')
				.map((s) => s.trim().toLowerCase())
				.filter(Boolean)
		),

	RATE_LIMIT_AI_CHAT_PER_MIN: z.coerce.number().int().positive().default(20),
	RATE_LIMIT_TTS_CHARS_PER_HOUR: z.coerce.number().int().positive().default(20_000),

	SENTRY_DSN: z.string().optional(),
	OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional()
});

let _privateConfig: z.infer<typeof PrivateSchema> | null = null;
export function serverConfig() {
	if (_privateConfig) return _privateConfig;
	const result = PrivateSchema.safeParse(privateEnv);
	if (!result.success) {
		// 12-factor: fail fast.
		console.error('[config] Environment validation failed:\n', result.error.flatten());
		throw new Error('Invalid environment configuration. See logs above.');
	}
	_privateConfig = result.data;
	return _privateConfig;
}

export const isProd = () => serverConfig().NODE_ENV === 'production';
