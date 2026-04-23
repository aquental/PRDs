/**
 * ElevenLabs TTS — retorna um ArrayBuffer com o áudio gerado.
 * Registra automaticamente a chamada em `ai_usage_logs`.
 */
import { serverConfig } from '$lib/config.server';
import { persistAIUsage } from '$lib/server/ai-usage';
import { fetchWithRetry } from '$lib/utils/fetch';

export interface SynthesizeParams {
	text: string;
	voice_id?: string;
	model?: string;
}

export async function synthesizeSpeech(
	params: SynthesizeParams,
	ctx: { clinic_id: string | null; therapist_id: string | null }
): Promise<ArrayBuffer> {
	const cfg = serverConfig();
	const voice = params.voice_id ?? cfg.ELEVENLABS_VOICE_ID;
	const model = params.model ?? cfg.ELEVENLABS_MODEL;
	const t0 = Date.now();

	try {
		const res = await fetchWithRetry(
			`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=${cfg.ELEVENLABS_OUTPUT_FORMAT}`,
			{
				method: 'POST',
				headers: {
					'xi-api-key': cfg.ELEVENLABS_API_KEY,
					'Content-Type': 'application/json',
					Accept: 'audio/mpeg'
				},
				body: JSON.stringify({
					text: params.text,
					model_id: model,
					voice_settings: { stability: 0.5, similarity_boost: 0.75 }
				})
			}
		);

		if (!res.ok) {
			const text = await res.text();
			await persistAIUsage({
				...ctx,
				call_type: 'tts_synthesis',
				provider: 'elevenlabs',
				model,
				characters: params.text.length,
				status: 'error',
				error_message: text,
				duration_ms: Date.now() - t0
			});
			throw new Error(`ElevenLabs error ${res.status}: ${text}`);
		}

		const buffer = await res.arrayBuffer();

		await persistAIUsage({
			...ctx,
			call_type: 'tts_synthesis',
			provider: 'elevenlabs',
			model,
			characters: params.text.length,
			duration_ms: Date.now() - t0
		});

		return buffer;
	} catch (err) {
		await persistAIUsage({
			...ctx,
			call_type: 'tts_synthesis',
			provider: 'elevenlabs',
			model,
			characters: params.text.length,
			status: 'error',
			error_message: err instanceof Error ? err.message : String(err),
			duration_ms: Date.now() - t0
		});
		throw err;
	}
}
