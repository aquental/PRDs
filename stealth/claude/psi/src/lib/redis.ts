import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { serverConfig } from '$lib/config.server';

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
export async function getCachedChatState<T>(key: string): Promise<T | null> {
	return await getRedis().get<T>(`psi:chat:${key}`);
}

export async function setCachedChatState(key: string, value: unknown, ttlSeconds = 60 * 30) {
	await getRedis().set(`psi:chat:${key}`, value, { ex: ttlSeconds });
}

export async function getCachedDashboard<T>(therapistId: string): Promise<T | null> {
	return await getRedis().get<T>(`psi:dash:${therapistId}`);
}

export async function setCachedDashboard(therapistId: string, data: unknown, ttlSeconds = 300) {
	await getRedis().set(`psi:dash:${therapistId}`, data, { ex: ttlSeconds });
}
