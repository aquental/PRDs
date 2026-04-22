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

	const core = [
		{ href: '/app/dashboard', label: 'Início',      icon: House,          testid: 'nav-dashboard' },
		{ href: '/app/patients',  label: 'Pacientes',   icon: Users,          testid: 'nav-patients'  },
		{ href: '/app/sessions',  label: 'Sessões',     icon: CalendarBlank,  testid: 'nav-sessions'  },
		{ href: '/app/finance',   label: 'Financeiro',  icon: ChartLine,      testid: 'nav-finance'   }
	];

	const tools = [
		{ href: '/app/ai-chat', label: 'Assistente', icon: ChatCircleDots, testid: 'nav-ai' }
	];
</script>

<aside
	class="flex h-full w-56 flex-col border-r border-primary-100/50 bg-bg dark:border-white/5 dark:bg-bg-dark"
	aria-label="Navegação principal"
>
	<!-- Logo -->
	<div class="px-5 pb-4 pt-5">
		<span class="font-heading text-xl font-bold text-primary">Psi</span>
	</div>

	<!-- Nav principal -->
	<nav class="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3" aria-label="Principal">
		{#each core as item}
			{@const Icon = item.icon}
			{@const active = page.url.pathname.startsWith(item.href)}
			<a
				href={item.href}
				class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors {active
					? 'bg-primary-50 font-medium text-primary dark:bg-primary-900/40 dark:text-primary-200'
					: 'text-ink-muted hover:bg-primary-50/60 hover:text-ink dark:hover:bg-white/5 dark:hover:text-bg'}"
				data-testid={item.testid}
				aria-current={active ? 'page' : undefined}
			>
				<Icon size={17} weight={active ? 'fill' : 'regular'} />
				{item.label}
			</a>
		{/each}

		<!-- Divisor + Ferramentas -->
		<div class="my-2 border-t border-primary-100/60 dark:border-white/5"></div>

		{#each tools as item}
			{@const Icon = item.icon}
			{@const active = page.url.pathname.startsWith(item.href)}
			<a
				href={item.href}
				class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors {active
					? 'bg-primary-50 font-medium text-primary dark:bg-primary-900/40 dark:text-primary-200'
					: 'text-ink-muted hover:bg-primary-50/60 hover:text-ink dark:hover:bg-white/5 dark:hover:text-bg'}"
				data-testid={item.testid}
				aria-current={active ? 'page' : undefined}
			>
				<Icon size={17} weight={active ? 'fill' : 'regular'} />
				{item.label}
			</a>
		{/each}
	</nav>

	<!-- Rodapé: Configurações + Sair -->
	<div class="border-t border-primary-100/60 px-3 py-3 dark:border-white/5">
		{@const settingsActive = page.url.pathname.startsWith('/app/settings')}
		<a
			href="/app/settings"
			class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors {settingsActive
				? 'bg-primary-50 font-medium text-primary dark:bg-primary-900/40 dark:text-primary-200'
				: 'text-ink-muted hover:bg-primary-50/60 hover:text-ink dark:hover:bg-white/5 dark:hover:text-bg'}"
			data-testid="nav-settings"
			aria-current={settingsActive ? 'page' : undefined}
		>
			<Gear size={17} weight={settingsActive ? 'fill' : 'regular'} />
			Configurações
		</a>

		<form method="POST" action="/logout" class="mt-0.5">
			<button
				type="submit"
				class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
				data-testid="btn-logout"
			>
				<SignOut size={17} />
				Sair
			</button>
		</form>
	</div>
</aside>
