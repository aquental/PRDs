/**
 * Logger · 12-factor XI — logs como event stream para stdout.
 * Nunca escrevemos em arquivo; agregação fica a cargo do hospedeiro (Vercel).
 */
import pino from 'pino';
import { serverConfig } from '$lib/config.server';

const cfg = serverConfig();

export const logger = pino({
	level: cfg.LOG_LEVEL,
	base: { app: 'psi', env: cfg.NODE_ENV },
	redact: {
		paths: [
			'*.password',
			'*.token',
			'*.access_token',
			'*.refresh_token',
			'*.api_key',
			'*.authorization',
			'req.headers.authorization',
			'req.headers.cookie'
		],
		censor: '[redacted]'
	},
	timestamp: pino.stdTimeFunctions.isoTime
});
