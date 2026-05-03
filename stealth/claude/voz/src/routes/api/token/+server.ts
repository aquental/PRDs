import { XAI_API_KEY } from '$env/static/private';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	if (!XAI_API_KEY) {
		return error(500, 'XAI_API_KEY is not configured');
	}

	const response = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${XAI_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			expires_after: { seconds: 300 }
		})
	});

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		console.error('[voz] Token mint failed:', response.status, body);
		return error(response.status, `xAI API error: ${body}`);
	}

	const data = await response.json();
	return json({ value: data.value, expires_at: data.expires_at });
};
