/**
 * Tests for AI-logger pure helpers used by /admin/logs and /admin overview.
 */
import { describe, it, expect } from 'vitest';
import { priceFromUsage, aggregateUsage } from './ai-logger';
import type { AIUsageLog } from './types';

// ── helpers ───────────────────────────────────────────────────────────────────

const makeLog = (overrides: Partial<AIUsageLog> = {}): AIUsageLog => ({
	id: 'log1',
	call_type: 'llm_chat',
	provider: 'openai',
	model: 'gpt-4o-mini',
	input_tokens: 100,
	output_tokens: 50,
	characters: 0,
	cost_usd: 0.000045,
	status: 'success',
	metadata: {},
	created_at: '2024-01-15T10:00:00Z',
	...overrides
});

// ── priceFromUsage ────────────────────────────────────────────────────────────

describe('priceFromUsage', () => {
	it('calculates LLM cost for gpt-4o-mini', () => {
		// 1 000 input tokens × 0.00015 + 1 000 output tokens × 0.0006
		const cost = priceFromUsage({
			clinic_id: null,
			therapist_id: null,
			call_type: 'llm_chat',
			provider: 'openai',
			model: 'gpt-4o-mini',
			input_tokens: 1000,
			output_tokens: 1000
		});
		expect(cost).toBeCloseTo(0.00015 + 0.0006, 8);
	});

	it('calculates LLM cost for gpt-4o', () => {
		// 1 000 input tokens × 0.0025 + 500 output tokens × 0.01
		const cost = priceFromUsage({
			clinic_id: null,
			therapist_id: null,
			call_type: 'llm_chat',
			provider: 'openai',
			model: 'gpt-4o',
			input_tokens: 1000,
			output_tokens: 500
		});
		expect(cost).toBeCloseTo(0.0025 + 0.005, 8);
	});

	it('returns 0 for LLM call with unknown model', () => {
		const cost = priceFromUsage({
			clinic_id: null,
			therapist_id: null,
			call_type: 'llm_chat',
			provider: 'custom',
			model: 'unknown-model',
			input_tokens: 1000,
			output_tokens: 500
		});
		expect(cost).toBe(0);
	});

	it('returns 0 for LLM call without a model', () => {
		const cost = priceFromUsage({
			clinic_id: null,
			therapist_id: null,
			call_type: 'llm_chat',
			provider: 'openai'
		});
		expect(cost).toBe(0);
	});

	it('calculates TTS cost for eleven_turbo_v2_5', () => {
		// 1 000 chars × 0.00003
		const cost = priceFromUsage({
			clinic_id: null,
			therapist_id: null,
			call_type: 'tts_synthesis',
			provider: 'elevenlabs',
			model: 'eleven_turbo_v2_5',
			characters: 1000
		});
		expect(cost).toBeCloseTo(0.03, 6);
	});

	it('calculates TTS cost for eleven_multilingual_v2', () => {
		// 500 chars × 0.00005
		const cost = priceFromUsage({
			clinic_id: null,
			therapist_id: null,
			call_type: 'tts_synthesis',
			provider: 'elevenlabs',
			model: 'eleven_multilingual_v2',
			characters: 500
		});
		expect(cost).toBeCloseTo(0.025, 6);
	});

	it('returns 0 for TTS with unknown model', () => {
		const cost = priceFromUsage({
			clinic_id: null,
			therapist_id: null,
			call_type: 'tts_synthesis',
			provider: 'elevenlabs',
			model: 'unknown-voice',
			characters: 1000
		});
		expect(cost).toBe(0);
	});

	it('returns 0 for stt_transcription (no pricing defined)', () => {
		const cost = priceFromUsage({
			clinic_id: null,
			therapist_id: null,
			call_type: 'stt_transcription',
			provider: 'openai',
			model: 'whisper-1',
			characters: 500
		});
		expect(cost).toBe(0);
	});

	it('treats undefined tokens/characters as 0', () => {
		const cost = priceFromUsage({
			clinic_id: null,
			therapist_id: null,
			call_type: 'llm_chat',
			provider: 'openai',
			model: 'gpt-4o-mini'
			// no input_tokens / output_tokens
		});
		expect(cost).toBe(0);
	});
});

// ── aggregateUsage ────────────────────────────────────────────────────────────

describe('aggregateUsage', () => {
	it('returns all-zero totals for an empty array', () => {
		const result = aggregateUsage([]);
		expect(result.total).toEqual({
			calls: 0,
			input_tokens: 0,
			output_tokens: 0,
			characters: 0,
			cost_usd: 0
		});
		expect(result.byType).toEqual({});
	});

	it('aggregates a single LLM log', () => {
		const logs = [makeLog({ input_tokens: 200, output_tokens: 100, cost_usd: 0.00009 })];
		const result = aggregateUsage(logs);
		expect(result.total.calls).toBe(1);
		expect(result.total.input_tokens).toBe(200);
		expect(result.total.output_tokens).toBe(100);
		expect(result.total.cost_usd).toBeCloseTo(0.00009);
	});

	it('sums multiple logs of the same type', () => {
		const logs = [
			makeLog({ input_tokens: 100, output_tokens: 50, cost_usd: 0.00005 }),
			makeLog({ id: 'log2', input_tokens: 300, output_tokens: 150, cost_usd: 0.00015 })
		];
		const result = aggregateUsage(logs);
		expect(result.total.calls).toBe(2);
		expect(result.total.input_tokens).toBe(400);
		expect(result.total.output_tokens).toBe(200);
		expect(result.total.cost_usd).toBeCloseTo(0.0002);
	});

	it('aggregates mixed call types and builds byType cost map', () => {
		const logs = [
			makeLog({ call_type: 'llm_chat',      cost_usd: 0.001 }),
			makeLog({ id: 'log2', call_type: 'tts_synthesis', characters: 500, cost_usd: 0.015, input_tokens: 0, output_tokens: 0 }),
			makeLog({ id: 'log3', call_type: 'llm_chat',      cost_usd: 0.002 })
		];
		const result = aggregateUsage(logs);
		expect(result.total.calls).toBe(3);
		expect(result.total.cost_usd).toBeCloseTo(0.018);
		expect(result.byType['llm_chat']).toBeCloseTo(0.003);
		expect(result.byType['tts_synthesis']).toBeCloseTo(0.015);
	});

	it('accumulates characters across TTS logs', () => {
		const logs = [
			makeLog({ call_type: 'tts_synthesis', characters: 200, input_tokens: 0, output_tokens: 0, cost_usd: 0.006 }),
			makeLog({ id: 'log2', call_type: 'tts_synthesis', characters: 300, input_tokens: 0, output_tokens: 0, cost_usd: 0.009 })
		];
		const result = aggregateUsage(logs);
		expect(result.total.characters).toBe(500);
	});

	it('includes error logs in aggregation', () => {
		const logs = [
			makeLog({ status: 'success', cost_usd: 0.001 }),
			makeLog({ id: 'log2', status: 'error', cost_usd: 0 })
		];
		const result = aggregateUsage(logs);
		expect(result.total.calls).toBe(2);
	});

	it('byType keys are exactly the call_type values present', () => {
		const logs = [makeLog({ call_type: 'stt_transcription', cost_usd: 0.005, input_tokens: 0, output_tokens: 0 })];
		const result = aggregateUsage(logs);
		expect(Object.keys(result.byType)).toEqual(['stt_transcription']);
	});
});
