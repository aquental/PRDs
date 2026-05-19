import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { chatComplete } from '$lib/integrations/llm';
import { getServiceSwitches } from '$lib/server/service-switches';
import type { RequestHandler } from './$types';

const bodySchema = z.object({
	transcript: z.string().min(1).max(2000),
	sessions: z
		.array(
			z.object({
				id: z.string().uuid(),
				patientName: z.string().min(1),
				scheduled_at: z.string()
			})
		)
		.min(1)
		.max(50)
});

const decisionsSchema = z.object({
	decisions: z.array(
		z.object({
			sessionId: z.string().uuid(),
			patientName: z.string(),
			status: z.enum(['presente', 'faltou'])
		})
	)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'Não autenticado');

	const { data: therapist } = await locals.supabase
		.from('therapists')
		.select('id, clinic_id')
		.eq('user_id', user.id)
		.single();
	if (!therapist) throw error(403, 'Terapeuta não encontrado');

	const switches = await getServiceSwitches();
	if (!switches.llm) throw error(503, 'LLM desabilitado');

	const body = await request.json().catch(() => null);
	const parsed = bodySchema.safeParse(body);
	if (!parsed.success) throw error(400, 'Dados inválidos');

	const { transcript, sessions } = parsed.data;

	const sessionList = sessions
		.map((s) => {
			const t = new Date(s.scheduled_at).toLocaleTimeString('pt-BR', {
				hour: '2-digit',
				minute: '2-digit',
				timeZone: 'UTC'
			});
			return `- ID: ${s.id} | Paciente: ${s.patientName} | Horário: ${t}`;
		})
		.join('\n');

	const result = await chatComplete(
		{
			messages: [
				{
					role: 'system',
					content: `Você extrai informações de presença de sessões de terapia a partir de relatos de terapeutas.

Dado o relato do terapeuta e a lista de sessões pendentes, identifique o status de cada paciente mencionado.
Use correspondência flexível de nomes (sobrenome, apelido, nome parcial).
Inclua apenas pacientes explicitamente mencionados. Em caso de ambiguidade, não inclua.
Retorne SOMENTE JSON válido, sem texto adicional.

Formato exato: {"decisions":[{"sessionId":"uuid","patientName":"Nome","status":"presente"}]}`
				},
				{
					role: 'user',
					content: `Sessões pendentes:\n${sessionList}\n\nFala do terapeuta: "${transcript}"`
				}
			],
			temperature: 0.1,
			max_tokens: 600
		},
		{ clinic_id: therapist.clinic_id, therapist_id: therapist.id }
	);

	let decisions: { sessionId: string; patientName: string; status: 'presente' | 'faltou' }[] = [];

	try {
		const raw = decisionsSchema.parse(JSON.parse(result.content.trim()));
		const validIds = new Set(sessions.map((s) => s.id));
		decisions = raw.decisions.filter((d) => validIds.has(d.sessionId));
	} catch {
		// Malformed LLM output — return empty so client shows "não entendi"
	}

	return json({ decisions });
};
