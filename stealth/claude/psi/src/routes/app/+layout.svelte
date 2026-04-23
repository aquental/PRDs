<script lang="ts">
	import type { Snippet } from 'svelte';
	import Sidebar from '$lib/ui/Sidebar.svelte';
	import ThemeToggle from '$lib/ui/ThemeToggle.svelte';

	interface Props {
		data: { therapist: { name: string; avatar_url: string | null }; clinic: { name: string } };
		children: Snippet;
	}
	let { data, children }: Props = $props();

	const DAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
	const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

	function now() {
		const d = new Date();
		const day = DAYS[d.getDay()];
		const num = d.getDate();
		const month = MONTHS[d.getMonth()];
		const year = d.getFullYear();
		const hh = String(d.getHours()).padStart(2, '0');
		const mm = String(d.getMinutes()).padStart(2, '0');
		return `${day}, ${num} de ${month} de ${year} - ${hh}:${mm}`;
	}

	let clock = $state(now());
	$effect(() => {
		const id = setInterval(() => (clock = now()), 1000);
		return () => clearInterval(id);
	});
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
				<span class="text-xs tabular-nums text-ink-muted">{clock}</span>
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
