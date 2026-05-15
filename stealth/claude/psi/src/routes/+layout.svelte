<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase/client';
	interface Props {
		children: Snippet;
	}
	let { children }: Props = $props();

	onMount(() => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event) => {
			if (event !== 'INITIAL_SESSION') {
				invalidate('supabase:auth');
			}
		});
		return () => subscription.unsubscribe();
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.png" type="image/png" />
</svelte:head>

{@render children()}
