import { speakWithElevenLabs } from "$lib/elevenlabs";

export async function speakResponse(text: string, clinicId: string) {
  const start = Date.now();
  const audio = await speakWithElevenLabs(text);
  const duration = Date.now() - start;

  await logAIUsage({
    clinic_id: clinicId,
    type: "tts",
    provider: "elevenlabs",
    characters_tts: text.length,
    cost_estimate: (text.length / 1000) * 0.02, // exemplo de custo
  });

  return audio;
}
