<script lang="ts">
	import { formatBRL } from '$lib/utils/format';

	interface Props {
		total: number;
		pending: number;
		completed: number;
		cancelled: number;
		noShow: number;
		revenue: number;
		isClinicMode: boolean;
		repasseDisabled: boolean;
		repasseToday: number;
	}

	let {
		total,
		pending,
		completed,
		cancelled,
		noShow,
		revenue,
		isClinicMode,
		repasseDisabled,
		repasseToday,
	}: Props = $props();
</script>

<section class="surface p-5" aria-label="Resumo do dia">
	<header class="mb-4 border-b border-primary-100/60 pb-3 dark:border-white/15">
		<h2 class="text-base font-semibold text-ink dark:text-bg">Resumo do dia</h2>
	</header>

	<div class="grid grid-cols-2 gap-3">
		<div class="rounded-lg bg-primary-50/60 p-3 dark:bg-white/5">
			<p class="text-xs text-ink-muted">Sessões hoje</p>
			<p class="mt-1 text-2xl font-bold tabular-nums text-ink dark:text-bg">{total}</p>
			<p class="mt-0.5 text-xs text-ink-muted">
				{pending} pendente{pending !== 1 ? 's' : ''}
			</p>
		</div>
		<div class="rounded-lg bg-primary-50/60 p-3 dark:bg-white/5">
			<p class="text-xs text-ink-muted">Saldo do dia</p>
			<p class="mt-1 text-2xl font-bold tabular-nums text-ink dark:text-bg">{formatBRL(revenue)}</p>
			{#if isClinicMode && !repasseDisabled}
				<p class="mt-0.5 text-xs text-ink-muted">
					líquido: {formatBRL(revenue - repasseToday)}
				</p>
			{/if}
		</div>
	</div>

	{#if total > 0}
		<div class="mt-3 flex flex-wrap gap-1.5" aria-label="Distribuição de sessões">
			{#if completed > 0}
				<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
					{completed} realizada{completed !== 1 ? 's' : ''}
				</span>
			{/if}
			{#if pending > 0}
				<span class="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
					{pending} agendada{pending !== 1 ? 's' : ''}
				</span>
			{/if}
			{#if cancelled > 0}
				<span class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
					{cancelled} abono{cancelled !== 1 ? 's' : ''}
				</span>
			{/if}
			{#if noShow > 0}
				<span class="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
					{noShow} falta{noShow !== 1 ? 's' : ''}
				</span>
			{/if}
		</div>
	{/if}
</section>
