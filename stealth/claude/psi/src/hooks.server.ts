import { sequence } from "@sveltejs/kit/hooks";
import type { Handle } from "@sveltejs/kit";
import { createSupabaseServerClient } from "$lib/supabase/server";
import { logger } from "$lib/logger";

/**
 * Anexa a cada request:
 *   · event.locals.supabase — cliente Supabase já com cookies do request
 *   · event.locals.safeGetSession — validação server-side do JWT via getUser()
 */
const supabaseHandle: Handle = async ({ event, resolve }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event.locals.supabase = createSupabaseServerClient(event) as any;

  event.locals.safeGetSession = async () => {
    const {
      data: { user },
      error,
    } = await event.locals.supabase.auth.getUser();
    if (error || !user) return { user: null };

    return { user };
  };

  return resolve(event, {
    filterSerializedResponseHeaders: (name) =>
      name === "content-range" || name === "x-supabase-api-version",
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
      ms: Date.now() - start,
    },
    "request",
  );
  return response;
};

export const handle = sequence(supabaseHandle, requestLogger);
