<script lang="ts">
	import { page } from '$app/state';
	import {
		House,
		Users,
		CalendarBlank,
		ChartLine,
		ChatCircleDots,
		Gear,
		SignOut
	} from 'phosphor-svelte';

	const items = [
		{ href: '/app/dashboard', label: 'Início', icon: House, testid: 'nav-dashboard' },
		{ href: '/app/patients', label: 'Pacientes', icon: Users, testid: 'nav-patients' },
		{ href: '/app/sessions', label: 'Sessões', icon: CalendarBlank, testid: 'nav-sessions' },
		{ href: '/app/finance', label: 'Financeiro', icon: ChartLine, testid: 'nav-finance' },
		{ href: '/app/ai-chat', label: 'Assistente IA', icon: ChatCircleDots, testid: 'nav-ai' },
		{ href: '/app/settings', label: 'Configurações', icon: Gear, testid: 'nav-settings' }
	];
</script>

<aside
	class="flex h-full w-60 flex-col gap-1 border-r border-primary-100/50 dark:border-white/5 bg-bg dark:bg-bg-dark p-4"
	aria-label="Navegação principal"
>
	<div class="mb-6 px-2">
		<h1 class="font-heading text-2xl font-bold text-primary">Psi</h1>
		<p class="text-xs text-ink-muted">Sua clínica, organizada.</p>
	</div>

	<nav class="flex-1 flex flex-col gap-1">
		{#each items as item}
			{@const Icon = item.icon}
			{@const active = page.url.pathname.startsWith(item.href)}
			<a
				href={item.href}
				class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition {active
					? 'bg-primary-50 text-primary dark:bg-primary-900/40 dark:text-primary-200 font-medium'
					: 'text-ink-muted hover:bg-primary-50/60 dark:hover:bg-white/5'}"
				data-testid={item.testid}
			>
				<Icon size={18} weight={active ? 'fill' : 'regular'} />
				{item.label}
			</a>
		{/each}
	</nav>

	<form method="POST" action="/logout" class="mt-2">
		<button
			type="submit"
			class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-muted hover:bg-primary-50/60 dark:hover:bg-white/5"
			data-testid="btn-logout"
		>
			<SignOut size={18} />
			Sair
		</button>
	</form>
</aside>
