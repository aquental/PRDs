import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { createSupabaseAdminClient } from '$lib/supabase/server';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	const admin = createSupabaseAdminClient();
	const { data: adminRow } = await admin
		.from('admins')
		.select('id, name, email')
		.eq('user_id', user.id)
		.maybeSingle();

	if (!adminRow) throw redirect(303, '/app/dashboard');

	return { admin: adminRow };
};
