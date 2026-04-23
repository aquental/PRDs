import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseAdminClient } from '$lib/supabase/server';

const HolidaySchema = z.object({
	day:         z.coerce.number().int().min(1).max(31),
	month:       z.coerce.number().int().min(1).max(12),
	year:        z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().min(2020).max(2100).nullable()),
	name:        z.string().min(1),
	description: z.string().optional(),
	type:        z.enum(['nacional', 'estadual', 'local']),
	state:       z.preprocess((v) => (v === '' || v == null ? null : String(v)), z.string().length(2).nullable().optional()),
	city:        z.preprocess((v) => (v === '' || v == null ? null : String(v)), z.string().nullable().optional())
});

export const load: PageServerLoad = async ({ locals }) => {
	const { data: holidays } = await locals.supabase
		.from('holidays')
		.select('id, day, month, year, name, description, type, state, city')
		.order('month')
		.order('day');

	return { holidays: holidays ?? [] };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const admin = createSupabaseAdminClient();
		const raw = Object.fromEntries(await request.formData());
		const parsed = HolidaySchema.safeParse(raw);
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const d = parsed.data;
		const { error: err } = await admin.from('holidays').insert({
			day:         d.day,
			month:       d.month,
			year:        d.year ?? null,
			name:        d.name,
			description: d.description || null,
			type:        d.type,
			state:       d.state || null,
			city:        d.city || null
		});
		if (err) return fail(400, { error: err.message });
		return { success: 'create' };
	},

	update: async ({ request }) => {
		const admin = createSupabaseAdminClient();
		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!id) return fail(400, { error: 'ID inválido' });

		const raw = Object.fromEntries(formData);
		const parsed = HolidaySchema.safeParse(raw);
		if (!parsed.success) return fail(400, { error: parsed.error.flatten().fieldErrors });

		const d = parsed.data;
		const { error: err } = await admin
			.from('holidays')
			.update({
				day:         d.day,
				month:       d.month,
				year:        d.year ?? null,
				name:        d.name,
				description: d.description || null,
				type:        d.type,
				state:       d.state || null,
				city:        d.city || null
			})
			.eq('id', id);
		if (err) return fail(400, { error: err.message });
		return { success: 'update' };
	},

	delete: async ({ request }) => {
		const admin = createSupabaseAdminClient();
		const id = (await request.formData()).get('id') as string;
		if (!id) return fail(400, { error: 'ID inválido' });

		const { error: err } = await admin.from('holidays').delete().eq('id', id);
		if (err) return fail(400, { error: err.message });
		return { success: 'delete' };
	}
};
