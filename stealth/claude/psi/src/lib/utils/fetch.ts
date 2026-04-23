const RETRYABLE = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'UND_ERR_SOCKET']);

/**
 * Wraps fetch with automatic retry for transient network errors.
 * Retries up to `maxRetries` times with exponential back-off (500 ms, 1 s, 2 s …).
 * Non-retryable errors (e.g. auth failures) are thrown immediately.
 */
export async function fetchWithRetry(
	url: string | URL,
	init: RequestInit = {},
	maxRetries = 3
): Promise<Response> {
	let lastErr: unknown;
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fetch(url, init);
		} catch (err) {
			const code = (err as NodeJS.ErrnoException & { cause?: NodeJS.ErrnoException }).cause?.code
				?? (err as NodeJS.ErrnoException).code;
			if (!code || !RETRYABLE.has(code)) throw err;
			lastErr = err;
			if (attempt < maxRetries - 1) {
				await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
			}
		}
	}
	throw lastErr;
}
