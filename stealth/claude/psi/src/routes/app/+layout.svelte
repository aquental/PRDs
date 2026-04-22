<script lang="ts">
	import type { Snippet } from 'svelte';
	import Sidebar from '$lib/ui/Sidebar.svelte';
	import ThemeToggle from '$lib/ui/ThemeToggle.svelte';

	interface Props {
		data: { therapist: { name: string; avatar_url: string | null }; clinic: { name: string } };
		children: Snippet;
	}
	let { data, children }: Props = $props();
</script>

<div class="flex min-h-screen">
	<Sidebar />

	<div class="flex-1 flex flex-col">
		<header
			class="flex items-center justify-between border-b border-primary-100/50 dark:border-white/5 px-6 py-4"
		>
			<div>
				<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{data.clinic.name}</p>
				<p class="text-sm font-semibold text-ink dark:text-bg">{data.therapist.name}</p>
			</div>
			<div class="flex items-center gap-3">
				<ThemeToggle />
				{#if data.therapist.avatar_url}
					<img
						src={data.therapist.avatar_url}
						alt=""
						class="h-8 w-8 rounded-full object-cover ring-2 ring-primary-100 dark:ring-white/10"
					/>
				{/if}
			</div>
		</header>

		<main class="flex-1 px-6 py-8">
			{@render children()}
		</main>
	</div>
</div>
