/**
 * Interface LLM genérica (OpenAI-compatible).
 * Qualquer provedor compatível (OpenAI, Together, Groq, Anthropic via proxy, etc.)
 * pode ser plugado trocando `LLM_BASE_URL` + `LLM_API_KEY`.
 */
import { serverConfig } from '$lib/config.server';
import { persistAIUsage } from '$lib/server/ai-usage';

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
}

export interface ChatCompletionParams {
	messages: ChatMessage[];
	temperature?: number;
	max_tokens?: number; // mapped to max_completion_tokens on the wire
	stream?: boolean;
}

export interface ChatCompletionResult {
	content: string;
	input_tokens: number;
	output_tokens: number;
	model: string;
}

export async function chatComplete(
	params: ChatCompletionParams,
	ctx: { clinic_id: string | null; therapist_id: string | null }
): Promise<ChatCompletionResult> {
	const cfg = serverConfig();
	const t0 = Date.now();

	try {
		const res = await fetch(`${cfg.LLM_BASE_URL}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${cfg.LLM_API_KEY}`
			},
			body: JSON.stringify({
				model: cfg.LLM_MODEL,
				messages: params.messages,
				temperature: params.temperature ?? 0.6,
				max_completion_tokens: params.max_tokens ?? 800,
				stream: false
			})
		});

		if (!res.ok) {
			const text = await res.text();
			await persistAIUsage({
				...ctx,
				call_type: 'llm_chat',
				provider: cfg.LLM_PROVIDER,
				model: cfg.LLM_MODEL,
				status: 'error',
				error_message: text,
				duration_ms: Date.now() - t0
			});
			throw new Error(`LLM error ${res.status}: ${text}`);
		}

		const data = await res.json();
		const content: string = data.choices?.[0]?.message?.content ?? '';
		const input_tokens: number = data.usage?.prompt_tokens ?? 0;
		const output_tokens: number = data.usage?.completion_tokens ?? 0;

		await persistAIUsage({
			...ctx,
			call_type: 'llm_chat',
			provider: cfg.LLM_PROVIDER,
			model: cfg.LLM_MODEL,
			input_tokens,
			output_tokens,
			duration_ms: Date.now() - t0
		});

		return { content, input_tokens, output_tokens, model: cfg.LLM_MODEL };
	} catch (err) {
		await persistAIUsage({
			...ctx,
			call_type: 'llm_chat',
			provider: cfg.LLM_PROVIDER,
			model: cfg.LLM_MODEL,
			status: 'error',
			error_message: err instanceof Error ? err.message : String(err),
			duration_ms: Date.now() - t0
		});
		throw err;
	}
}
