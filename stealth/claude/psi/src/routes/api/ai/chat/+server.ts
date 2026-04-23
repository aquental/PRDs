import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { chatComplete } from '$lib/integrations/llm';
import { aiChatRateLimiter } from '$lib/redis';
import { getServiceSwitches } from '$lib/server/service-switches';

const BodySchema = z.object({
	messages: z
		.array(z.object({ role: z.enum(['user', 'assistant', 'system']), content: z.string() }))
		.min(1)
		.max(40)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'unauthenticated');

	const switches = await getServiceSwitches();
	if (!switches.llm) throw error(503, 'llm_disabled');

	const { data: therapist } = await locals.supabase
		.from('therapists')
		.select('id, clinic_id')
		.eq('user_id', user.id)
		.single();
	if (!therapist) throw error(403, 'no_therapist');

	if (switches.redis) {
		const { success } = await aiChatRateLimiter().limit(therapist.id);
		if (!success) throw error(429, 'rate_limited');
	}

	const parsed = BodySchema.safeParse(await request.json());
	if (!parsed.success) throw error(400, 'invalid_body');

	const systemPrompt = {
		role: 'system' as const,
		content:
			'Você é a assistente da plataforma Psi para uma psicóloga brasileira. Seja breve, prático e respeite a LGPD — nunca sugira coletar ou divulgar dados sensíveis.'
	};

	const result = await chatComplete(
		{ messages: [systemPrompt, ...parsed.data.messages] },
		{ clinic_id: therapist.clinic_id, therapist_id: therapist.id }
	);

	return json({ content: result.content });
};
