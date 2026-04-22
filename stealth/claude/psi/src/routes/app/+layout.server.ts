import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { createSupabaseAdminClient } from '$lib/supabase/server';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) throw redirect(303, '/login');

	// Bloqueia admins nesta área — eles têm seu próprio /admin.
	const admin = createSupabaseAdminClient();
	const { data: isAdmin } = await admin.from('admins').select('id').eq('user_id', user.id).maybeSingle();
	if (isAdmin) throw redirect(303, '/admin');

	const { data: therapist } = await locals.supabase
		.from('therapists')
		.select('id, clinic_id, name, email, avatar_url, crp, phone, default_session_fee')
		.eq('user_id', user.id)
		.single();

	if (!therapist) throw redirect(303, '/login?error=no_therapist');

	const { data: clinic } = await locals.supabase
		.from('clinics')
		.select('id, name, timezone, cnpj, address_street, address_number, address_complement, address_zip, address_city, address_state, working_hours_start, working_hours_end')
		.eq('id', therapist.clinic_id)
		.single();

	return { therapist, clinic };
};
