import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { serverConfig } from '$lib/config.server';
import { getServiceSwitches } from '$lib/server/service-switches';

let _redis: Redis | null = null;
export function getRedis() {
	if (_redis) return _redis;
	const cfg = serverConfig();
	_redis = new Redis({
		url: cfg.UPSTASH_REDIS_REST_URL,
		token: cfg.UPSTASH_REDIS_REST_TOKEN
	});
	return _redis;
}

// --- Rate limits (sliding window) -------------------------------------------
export function aiChatRateLimiter() {
	const cfg = serverConfig();
	return new Ratelimit({
		redis: getRedis(),
		limiter: Ratelimit.slidingWindow(cfg.RATE_LIMIT_AI_CHAT_PER_MIN, '1 m'),
		analytics: true,
		prefix: 'psi:rl:ai_chat'
	});
}

export function ttsRateLimiter() {
	const cfg = serverConfig();
	return new Ratelimit({
		redis: getRedis(),
		limiter: Ratelimit.slidingWindow(cfg.RATE_LIMIT_TTS_CHARS_PER_HOUR, '1 h'),
		analytics: true,
		prefix: 'psi:rl:tts'
	});
}

// --- Helpers: estado quente do chat (TTL curto) ------------------------------
// Cada função verifica o kill-switch antes de tocar no Redis.

export async function getCachedChatState<T>(key: string): Promise<T | null> {
	const sw = await getServiceSwitches();
	if (!sw.redis) return null;
	return await getRedis().get<T>(`psi:chat:${key}`);
}

export async function setCachedChatState(key: string, value: unknown, ttlSeconds = 60 * 30) {
	const sw = await getServiceSwitches();
	if (!sw.redis) return;
	await getRedis().set(`psi:chat:${key}`, value, { ex: ttlSeconds });
}

export async function getCachedDashboard<T>(therapistId: string): Promise<T | null> {
	const sw = await getServiceSwitches();
	if (!sw.redis) return null;
	return await getRedis().get<T>(`psi:dash:${therapistId}`);
}

export async function setCachedDashboard(therapistId: string, data: unknown, ttlSeconds = 300) {
	const sw = await getServiceSwitches();
	if (!sw.redis) return;
	await getRedis().set(`psi:dash:${therapistId}`, data, { ex: ttlSeconds });
}

export async function invalidateDashboard(therapistId: string) {
	const sw = await getServiceSwitches();
	if (!sw.redis) return;
	await getRedis().del(`psi:dash:${therapistId}`);
}
