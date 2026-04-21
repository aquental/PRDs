import type { PageServerLoad } from './$types';
import { publicConfig } from '$lib/config';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { therapist } = await parent();

	const { data: conversations } = await locals.supabase
		.from('chat_conversations')
		.select('id, title, updated_at')
		.eq('therapist_id', therapist.id)
		.order('updated_at', { ascending: false })
		.limit(20);

	return {
		conversations: conversations ?? [],
		features: { voice: publicConfig.PUBLIC_FEATURE_VOICE_CHAT }
	};
};
