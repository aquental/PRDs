<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import ThemeToggle from '$lib/ui/ThemeToggle.svelte';
	import { ChartLine, Receipt, SignOut, Gauge, CalendarBlank, Database } from 'phosphor-svelte';

	interface Props {
		data: { admin: { email: string; name: string | null } };
		children: Snippet;
	}
	let { data, children }: Props = $props();

	const items = [
		{ href: '/admin', label: 'Visão geral', icon: ChartLine },
		{ href: '/admin/data', label: 'Dados', icon: Database },
		{ href: '/admin/logs', label: 'Logs de IA', icon: Receipt },
		{ href: '/admin/services', label: 'Serviços', icon: Gauge },
		{ href: '/admin/holidays', label: 'Feriados', icon: CalendarBlank }
	];
</script>

<div class="flex min-h-screen">
	<aside
		class="flex w-60 flex-col border-r border-primary-100/50 bg-bg dark:border-white/5 dark:bg-bg-dark"
		aria-label="Admin"
	>
		<!-- Branding -->
		<div class="border-b border-primary-100/50 px-6 py-5 dark:border-white/5">
			<p class="text-[10px] font-medium uppercase tracking-widest text-ink-muted">Plataforma</p>
			<h1 class="font-heading mt-0.5 text-xl font-bold text-primary">Psi · Admin</h1>
		</div>

		<nav class="flex flex-1 flex-col gap-1 p-3">
			{#each items as item}
				{@const Icon = item.icon}
				{@const active =
					item.href === '/admin'
						? page.url.pathname === '/admin'
						: page.url.pathname.startsWith(item.href)}
				<a
					href={item.href}
					class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition {active
						? 'bg-primary-50 font-medium text-primary dark:bg-primary-900/40 dark:text-primary-200'
						: 'text-ink-muted hover:bg-primary-50/60 dark:hover:bg-white/5'}"
				>
					<Icon size={18} weight={active ? 'fill' : 'regular'} />
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="border-t border-primary-100/50 p-3 dark:border-white/5">
			<form method="POST" action="/logout">
				<button
					class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-muted hover:bg-primary-50/60 dark:hover:bg-white/5"
				>
					<SignOut size={18} /> Sair
				</button>
			</form>
		</div>
	</aside>

	<div class="flex flex-1 flex-col">
		<header
			class="flex items-center justify-between border-b border-primary-100/50 px-6 py-4 dark:border-white/5"
		>
			<div>
				<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Painel administrativo</p>
				<p class="text-sm font-semibold text-ink dark:text-bg">{data.admin.name ?? data.admin.email}</p>
			</div>
			<ThemeToggle />
		</header>
		<main class="flex-1 px-6 py-8">{@render children()}</main>
	</div>
</div>
