/**
 * Camada centralizada de logging de uso de IA/TTS/STT.
 *
 * Toda chamada aos provedores DEVE passar por `logAIUsage()`. Isso mantém:
 *   · Custo visível por clínica (relatório admin).
 *   · Relatório pessoal para o terapeuta.
 *   · Um único ponto para mudar schema/provedor no futuro.
 *
 * Os cálculos de custo são puros e testáveis.
 */
import type { AICallType, AIUsageLog } from './types';

// Preços em USD por token (divididos). Ajuste conforme o provedor.
export interface LLMPrice {
	input_per_1k: number;
	output_per_1k: number;
}

export const LLM_PRICES: Record<string, LLMPrice> = {
	'gpt-4o-mini': { input_per_1k: 0.00015, output_per_1k: 0.0006 },
	'gpt-4o': { input_per_1k: 0.0025, output_per_1k: 0.01 },
	'claude-haiku-4-5-20251001': { input_per_1k: 0.001, output_per_1k: 0.005 }
};

// ElevenLabs: preço por caractere.
export const TTS_PRICE_USD_PER_CHAR: Record<string, number> = {
	eleven_turbo_v2_5: 0.00003,
	eleven_multilingual_v2: 0.00005
};

/** Cálculo puro do custo de uma chamada LLM. */
export function computeLLMCost(model: string, inputTokens: number, outputTokens: number): number {
	const price = LLM_PRICES[model];
	if (!price) return 0;
	return (
		(inputTokens / 1000) * price.input_per_1k + (outputTokens / 1000) * price.output_per_1k
	);
}

/** Cálculo puro do custo de TTS. */
export function computeTTSCost(model: string, characters: number): number {
	const pricePerChar = TTS_PRICE_USD_PER_CHAR[model] ?? 0;
	return pricePerChar * characters;
}

/** Entrada para registro. Feita server-side apenas. */
export interface AIUsageInput {
	clinic_id: string | null;
	therapist_id: string | null;
	call_type: AICallType;
	provider: string;
	model?: string;
	input_tokens?: number;
	output_tokens?: number;
	characters?: number;
	duration_ms?: number;
	status?: 'success' | 'error';
	error_message?: string;
	metadata?: Record<string, unknown>;
}

/** Calcula o custo a partir de uma entrada, antes do insert. */
export function priceFromUsage(input: AIUsageInput): number {
	if (input.call_type === 'llm_chat' && input.model) {
		return computeLLMCost(input.model, input.input_tokens ?? 0, input.output_tokens ?? 0);
	}
	if (input.call_type === 'tts_synthesis' && input.model) {
		return computeTTSCost(input.model, input.characters ?? 0);
	}
	return 0;
}

/**
 * Agrega um conjunto de logs por período. Puro e testável.
 * Usado por /admin/logs e pela visão do terapeuta.
 */
export function aggregateUsage(logs: AIUsageLog[]) {
	const total = logs.reduce(
		(acc, l) => {
			acc.calls += 1;
			acc.input_tokens += l.input_tokens;
			acc.output_tokens += l.output_tokens;
			acc.characters += l.characters;
			acc.cost_usd += l.cost_usd;
			return acc;
		},
		{ calls: 0, input_tokens: 0, output_tokens: 0, characters: 0, cost_usd: 0 }
	);

	const byType = logs.reduce<Record<string, number>>((acc, l) => {
		acc[l.call_type] = (acc[l.call_type] ?? 0) + l.cost_usd;
		return acc;
	}, {});

	return { total, byType };
}
