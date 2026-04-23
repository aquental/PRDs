import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { synthesizeSpeech } from '$lib/integrations/elevenlabs';
import { ttsRateLimiter } from '$lib/redis';
import { getServiceSwitches } from '$lib/server/service-switches';

const BodySchema = z.object({
	text: z.string().min(1).max(4000)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'unauthenticated');

	const switches = await getServiceSwitches();
	if (!switches.tts) throw error(503, 'tts_disabled');

	const { data: therapist } = await locals.supabase
		.from('therapists')
		.select('id, clinic_id')
		.eq('user_id', user.id)
		.single();
	if (!therapist) throw error(403, 'no_therapist');

	const parsed = BodySchema.safeParse(await request.json());
	if (!parsed.success) throw error(400, 'invalid_body');

	if (switches.redis) {
		const { success } = await ttsRateLimiter().limit(therapist.id, { rate: parsed.data.text.length });
		if (!success) throw error(429, 'rate_limited');
	}

	const audio = await synthesizeSpeech(
		{ text: parsed.data.text },
		{ clinic_id: therapist.clinic_id, therapist_id: therapist.id }
	);

	return new Response(audio, {
		headers: {
			'Content-Type': 'audio/mpeg',
			'Cache-Control': 'no-store'
		}
	});
};
