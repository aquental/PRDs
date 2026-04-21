import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server';
import { logger } from '$lib/logger';

/**
 * Anexa a cada request:
 *   · event.locals.supabase — cliente Supabase já com cookies do request
 *   · event.locals.safeGetSession — validação server-side do JWT (evita getSession() inseguro)
 */
const supabaseHandle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(event);

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };

		// Revalida o JWT contra o servidor (recomendado pela Supabase).
		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) return { session: null, user: null };

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version'
	});
};

/** Request-scoped structured logger. */
const requestLogger: Handle = async ({ event, resolve }) => {
	const start = Date.now();
	const response = await resolve(event);
	logger.info(
		{
			method: event.request.method,
			path: event.url.pathname,
			status: response.status,
			ms: Date.now() - start
		},
		'request'
	);
	return response;
};

export const handle = sequence(supabaseHandle, requestLogger);
