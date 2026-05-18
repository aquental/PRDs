<script lang="ts">
	import { Receipt, CalendarBlank, Plus, Lock, CheckCircle } from 'phosphor-svelte';

	interface Props {
		isClosed: boolean;
		onCloseMonth: () => void;
	}

	let { isClosed, onCloseMonth }: Props = $props();
</script>

<section class="surface p-5" aria-label="Ações rápidas">
	<header class="mb-4 border-b border-primary-100/60 pb-3 dark:border-white/15">
		<h2 class="text-base font-semibold text-ink dark:text-bg">Ações rápidas</h2>
	</header>

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<!-- Recibos — em breve -->
		<div
			class="flex flex-col items-center gap-2 rounded-xl border border-primary-100/40 bg-primary-50/20 p-4 text-center opacity-50 dark:border-white/5 dark:bg-white/5"
			title="Em breve"
			aria-label="Recibos — em breve"
			aria-disabled="true"
		>
			<Receipt size={22} class="text-ink-muted" />
			<span class="text-xs font-medium text-ink-muted dark:text-bg/60">Recibos</span>
			<span class="text-[10px] text-ink-muted">em breve</span>
		</div>

		<!-- Sessões -->
		<a
			href="/app/sessions"
			class="flex min-h-[44px] flex-col items-center gap-2 rounded-xl border border-primary-100/60 bg-primary-50/40 p-4 text-center transition hover:bg-primary-50 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10"
			aria-label="Ver sessões"
		>
			<CalendarBlank size={22} class="text-primary" />
			<span class="text-xs font-medium text-ink dark:text-bg">Sessões</span>
		</a>

		<!-- Nova despesa -->
		<a
			href="/app/settings"
			class="flex min-h-[44px] flex-col items-center gap-2 rounded-xl border border-primary-100/60 bg-primary-50/40 p-4 text-center transition hover:bg-primary-50 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10"
			aria-label="Adicionar nova despesa em configurações"
		>
			<Plus size={22} class="text-primary" />
			<span class="text-xs font-medium text-ink dark:text-bg">Nova despesa</span>
		</a>

		<!-- Fechar / Fechado mês -->
		{#if isClosed}
			<div
				class="flex flex-col items-center gap-2 rounded-xl border border-green-200 bg-green-50/50 p-4 text-center dark:border-green-900/30 dark:bg-green-900/10"
				aria-label="Mês fechado"
			>
				<CheckCircle size={22} class="text-green-600 dark:text-green-400" weight="fill" />
				<span class="text-xs font-medium text-green-800 dark:text-green-300">Mês fechado</span>
			</div>
		{:else}
			<button
				onclick={onCloseMonth}
				class="flex min-h-[44px] flex-col items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-center transition hover:bg-amber-100 dark:border-amber-900/30 dark:bg-amber-900/10 dark:hover:bg-amber-900/20"
				aria-label="Fechar mês atual"
			>
				<Lock size={22} class="text-amber-700 dark:text-amber-400" />
				<span class="text-xs font-medium text-amber-800 dark:text-amber-300">Fechar mês</span>
			</button>
		{/if}
	</div>
</section>
