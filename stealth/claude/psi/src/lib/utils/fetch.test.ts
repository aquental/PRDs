/**
 * Tests for fetchWithRetry — mocks global fetch and setTimeout.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWithRetry } from './fetch';

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

// ── helpers ───────────────────────────────────────────────────────────────────

function makeNetworkError(code: string): Error {
	// Simulate both top-level code and nested cause.code patterns
	const err = Object.assign(new Error(`network error: ${code}`), { code });
	return err;
}

// ── EC-05: maxRetries guard ─────────────────────────────────────────────────────

describe('fetchWithRetry — EC-05: maxRetries < 1', () => {
	it('throws RangeError for maxRetries = 0 without calling fetch', async () => {
		const mockFetch = vi.fn();
		vi.stubGlobal('fetch', mockFetch);
		await expect(fetchWithRetry('https://example.com', {}, 0)).rejects.toThrow(RangeError);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('throws RangeError for maxRetries = -1', async () => {
		vi.stubGlobal('fetch', vi.fn());
		await expect(fetchWithRetry('https://example.com', {}, -1)).rejects.toThrow(RangeError);
	});

	it('EC-05 error message includes the bad value', async () => {
		vi.stubGlobal('fetch', vi.fn());
		await expect(fetchWithRetry('https://example.com', {}, 0)).rejects.toThrow(/0/);
	});
});

// ── success path ──────────────────────────────────────────────────────────────

describe('fetchWithRetry – success', () => {
	it('returns the response on first attempt', async () => {
		const mockResponse = new Response('ok', { status: 200 });
		vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockResponse));

		const result = await fetchWithRetry('https://example.com');

		expect(result).toBe(mockResponse);
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith('https://example.com', {});
	});

	it('forwards RequestInit to fetch', async () => {
		const mockResponse = new Response('ok', { status: 200 });
		const init: RequestInit = { method: 'POST', body: '{}' };
		vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockResponse));

		await fetchWithRetry('https://example.com', init);

		expect(fetch).toHaveBeenCalledWith('https://example.com', init);
	});
});

// ── non-retryable errors ──────────────────────────────────────────────────────

describe('fetchWithRetry – non-retryable error', () => {
	it('throws immediately without retrying for errors with no code', async () => {
		const err = new Error('Unauthorized');
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err));

		await expect(fetchWithRetry('https://example.com', {}, 3)).rejects.toThrow('Unauthorized');
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('throws immediately for errors with an unknown code', async () => {
		const err = makeNetworkError('ENOENT');
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err));

		await expect(fetchWithRetry('https://example.com', {}, 3)).rejects.toThrow();
		expect(fetch).toHaveBeenCalledTimes(1);
	});
});

// ── retry on retryable errors ─────────────────────────────────────────────────

describe('fetchWithRetry – retries', () => {
	it('retries on ECONNRESET and returns response on second attempt', async () => {
		vi.useFakeTimers();
		const err = makeNetworkError('ECONNRESET');
		const mockResponse = new Response('ok', { status: 200 });
		const mockFetch = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce(mockResponse);
		vi.stubGlobal('fetch', mockFetch);

		const promise = fetchWithRetry('https://example.com', {}, 2);
		await vi.runAllTimersAsync();
		const result = await promise;

		expect(result).toBe(mockResponse);
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('retries on ETIMEDOUT', async () => {
		vi.useFakeTimers();
		const err = makeNetworkError('ETIMEDOUT');
		const mockResponse = new Response('ok', { status: 200 });
		const mockFetch = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce(mockResponse);
		vi.stubGlobal('fetch', mockFetch);

		const promise = fetchWithRetry('https://example.com', {}, 2);
		await vi.runAllTimersAsync();
		await promise;

		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('retries on ECONNREFUSED', async () => {
		vi.useFakeTimers();
		const err = makeNetworkError('ECONNREFUSED');
		const mockResponse = new Response('ok', { status: 200 });
		const mockFetch = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce(mockResponse);
		vi.stubGlobal('fetch', mockFetch);

		const promise = fetchWithRetry('https://example.com', {}, 2);
		await vi.runAllTimersAsync();
		await promise;

		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('detects retryable code from nested cause', async () => {
		vi.useFakeTimers();
		const cause = Object.assign(new Error('socket'), { code: 'ECONNRESET' });
		const err = Object.assign(new Error('wrapper'), { cause });
		const mockResponse = new Response('ok', { status: 200 });
		const mockFetch = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce(mockResponse);
		vi.stubGlobal('fetch', mockFetch);

		const promise = fetchWithRetry('https://example.com', {}, 2);
		await vi.runAllTimersAsync();
		const result = await promise;

		expect(result).toBe(mockResponse);
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('exhausts all retries and throws the last error', async () => {
		vi.useFakeTimers();
		const err = makeNetworkError('ECONNREFUSED');
		const mockFetch = vi.fn().mockRejectedValue(err);
		vi.stubGlobal('fetch', mockFetch);

		// Register assertion before advancing timers to prevent unhandled rejection
		const callPromise = fetchWithRetry('https://example.com', {}, 3);
		const assertPromise = expect(callPromise).rejects.toThrow('ECONNREFUSED');
		await vi.runAllTimersAsync();
		await assertPromise;

		expect(mockFetch).toHaveBeenCalledTimes(3);
	});

	it('respects maxRetries=1 (no retry)', async () => {
		const err = makeNetworkError('ECONNRESET');
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err));

		await expect(fetchWithRetry('https://example.com', {}, 1)).rejects.toThrow();
		expect(fetch).toHaveBeenCalledTimes(1);
	});
});
