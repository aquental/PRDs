import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseAdminClient } from '$lib/supabase/server';
import { serverConfig } from '$lib/config.server';
import { logger } from '$lib/logger';

/**
 * Callback do Google OAuth.
 *   1. Troca `code` por sessão.
 *   2. Se for primeiro login, cria `clinics` + `therapists` automaticamente.
 *   3. Se o email for admin (via ADMIN_EMAILS), promove a role `admin`.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') ?? '/app/dashboard';

	if (!code) throw redirect(303, '/login');

	const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
	if (error) {
		logger.error({ err: error }, 'OAuth code exchange failed');
		throw redirect(303, '/login?error=oauth_failed');
	}

	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	const admin = createSupabaseAdminClient();
	const cfg = serverConfig();

	// Admin bootstrap
	const email = user.email?.toLowerCase();
	if (email && cfg.ADMIN_EMAILS.includes(email)) {
		await admin.from('admins').upsert(
			{ user_id: user.id, email, name: user.user_metadata?.full_name ?? null },
			{ onConflict: 'user_id' }
		);
		throw redirect(303, '/admin');
	}

	// Provisioning: primeiro login do terapeuta cria clínica + perfil
	const { data: existing } = await admin
		.from('therapists')
		.select('id, clinic_id')
		.eq('user_id', user.id)
		.maybeSingle();

	if (!existing) {
		const clinicName = user.user_metadata?.full_name
			? `Clínica de ${user.user_metadata.full_name}`
			: 'Minha Clínica';

		const { data: clinic, error: clinicErr } = await admin
			.from('clinics')
			.insert({ name: clinicName })
			.select('id')
			.single();

		if (clinicErr || !clinic) {
			logger.error({ err: clinicErr }, 'Failed to create clinic');
			throw redirect(303, '/login?error=provisioning_failed');
		}

		const { error: therapistErr } = await admin.from('therapists').insert({
			user_id: user.id,
			clinic_id: clinic.id,
			name: user.user_metadata?.full_name ?? email ?? 'Psicóloga(o)',
			email: email ?? '',
			crp: 'Pendente',
			avatar_url: user.user_metadata?.avatar_url ?? null
		});

		if (therapistErr) {
			logger.error({ err: therapistErr }, 'Failed to create therapist');
			throw redirect(303, '/login?error=provisioning_failed');
		}
	}

	throw redirect(303, next);
};
