/**
 * Inserção do log de uso no Supabase. Server-only.
 * Usa service-role para garantir gravação mesmo quando o terapeuta não está autenticado
 * (ex.: jobs em background). Em requests autenticados, chame com `clinic_id` e `therapist_id`.
 */
import { createSupabaseAdminClient } from '$lib/supabase/server';
import { priceFromUsage, type AIUsageInput } from '$lib/core/ai-logger';
import { logger } from '$lib/logger';

export async function persistAIUsage(input: AIUsageInput): Promise<void> {
	const admin = createSupabaseAdminClient();
	const cost_usd = priceFromUsage(input);

	const { error } = await admin.from('ai_usage_logs').insert({
		clinic_id: input.clinic_id,
		therapist_id: input.therapist_id,
		call_type: input.call_type,
		provider: input.provider,
		model: input.model ?? null,
		input_tokens: input.input_tokens ?? 0,
		output_tokens: input.output_tokens ?? 0,
		characters: input.characters ?? 0,
		cost_usd,
		duration_ms: input.duration_ms ?? null,
		status: input.status ?? 'success',
		error_message: input.error_message ?? null,
		metadata: input.metadata ?? {}
	});

	if (error) {
		// Nunca lança: falha de observabilidade não deve quebrar a request.
		logger.error({ err: error, input }, 'Failed to persist ai_usage_log');
	}
}
