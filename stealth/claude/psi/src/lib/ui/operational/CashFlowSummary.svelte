<script lang="ts">
	import { ArrowRight } from 'phosphor-svelte';
	import { formatBRL } from '$lib/utils/format';

	interface Props {
		weekRevenue: number;
		weekExpenses: number;
		openReceivables: number;
		isClinicMode: boolean;
		repasseDisabled: boolean;
		weekRepasse: number;
		monthLabel: string;
	}

	let {
		weekRevenue,
		weekExpenses,
		openReceivables,
		isClinicMode,
		repasseDisabled,
		weekRepasse,
		monthLabel,
	}: Props = $props();

	const weekNet = $derived(weekRevenue - weekExpenses);
</script>

<section class="surface p-5" aria-label="Fluxo de caixa">
	<header class="mb-4 border-b border-primary-100/60 pb-3 dark:border-white/15">
		<div class="flex items-center justify-between">
			<h2 class="text-base font-semibold text-ink dark:text-bg">Fluxo de caixa</h2>
			<a
				href="/app/operations/fluxo-de-caixa"
				class="flex min-h-[44px] items-center gap-1 text-xs text-primary hover:underline"
				aria-label="Ver detalhes do fluxo de caixa"
			>
				Ver detalhe <ArrowRight size={12} />
			</a>
		</div>
	</header>

	<p class="mb-3 text-xs capitalize text-ink-muted">Esta semana · {monthLabel}</p>

	<div class="space-y-2 text-sm">
		<div class="flex items-center justify-between">
			<span class="text-ink-muted">Entrou</span>
			<span class="font-medium text-green-700 dark:text-green-400">{formatBRL(weekRevenue)}</span>
		</div>
		<div class="flex items-center justify-between">
			<span class="text-ink-muted">Saiu</span>
			<span class="font-medium text-red-700 dark:text-red-400">{formatBRL(weekExpenses)}</span>
		</div>

		<div class="mt-1 border-t border-primary-100/40 pt-2 dark:border-white/5">
			<div class="flex items-center justify-between font-semibold">
				<span class="text-ink dark:text-bg">Saldo da semana</span>
				<span class={weekNet >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
					{formatBRL(weekNet)}
				</span>
			</div>

			{#if isClinicMode && !repasseDisabled}
				<div class="mt-1 flex items-center justify-between text-xs text-ink-muted">
					<span>Líquido após repasse</span>
					<span>{formatBRL(weekNet - weekRepasse)}</span>
				</div>
			{:else if !isClinicMode && openReceivables > 0}
				<div class="mt-1 flex items-center justify-between text-xs text-ink-muted">
					<span>A receber em aberto</span>
					<span class="text-amber-600 dark:text-amber-400">{formatBRL(openReceivables)}</span>
				</div>
			{/if}
		</div>
	</div>
</section>
