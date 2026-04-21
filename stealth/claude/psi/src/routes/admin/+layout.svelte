<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import ThemeToggle from '$lib/ui/ThemeToggle.svelte';
	import { ChartLine, Receipt, SignOut } from 'phosphor-svelte';

	interface Props {
		data: { admin: { email: string; name: string | null } };
		children: Snippet;
	}
	let { data, children }: Props = $props();

	const items = [
		{ href: '/admin', label: 'Visão geral', icon: ChartLine },
		{ href: '/admin/logs', label: 'Logs de IA', icon: Receipt }
	];
</script>

<div class="flex min-h-screen">
	<aside
		class="flex w-60 flex-col border-r border-primary-100/50 dark:border-white/5 p-4"
		aria-label="Admin"
	>
		<div class="mb-6 px-2">
			<h1 class="font-heading text-2xl font-bold text-primary">Psi · Admin</h1>
			<p class="text-xs text-ink-muted">{data.admin.email}</p>
		</div>

		<nav class="flex-1 flex flex-col gap-1">
			{#each items as item}
				{@const Icon = item.icon}
				{@const active =
					item.href === '/admin'
						? page.url.pathname === '/admin'
						: page.url.pathname.startsWith(item.href)}
				<a
					href={item.href}
					class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm {active
						? 'bg-primary-50 text-primary dark:bg-primary-900/40 font-medium'
						: 'text-ink-muted hover:bg-primary-50/60 dark:hover:bg-white/5'}"
				>
					<Icon size={18} />
					{item.label}
				</a>
			{/each}
		</nav>

		<form method="POST" action="/logout" class="mt-2">
			<button
				class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-muted hover:bg-primary-50/60 dark:hover:bg-white/5"
			>
				<SignOut size={18} /> Sair
			</button>
		</form>
	</aside>

	<div class="flex-1 flex flex-col">
		<header
			class="flex items-center justify-end border-b border-primary-100/50 dark:border-white/5 px-6 py-3"
		>
			<ThemeToggle />
		</header>
		<main class="flex-1 p-6">{@render children()}</main>
	</div>
</div>
