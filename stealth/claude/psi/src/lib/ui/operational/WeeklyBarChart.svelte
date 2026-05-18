<script lang="ts">
	import { formatBRL } from '$lib/utils/format';

	interface WeekBucket {
		label: string;
		income: number;
		expenses: number;
	}

	interface Props {
		weeks: WeekBucket[];
	}

	let { weeks }: Props = $props();

	const maxValue = $derived(Math.max(...weeks.flatMap((w) => [w.income, w.expenses]), 1));
	const showEveryOther = $derived(weeks.length > 6);
</script>

{#if weeks.length === 0}
	<p class="py-6 text-center text-sm text-ink-muted">Sem dados no período.</p>
{:else}
	<div aria-label="Gráfico de barras semanais">
		<!-- Bars -->
		<div class="flex items-end gap-1" style="height: 120px" role="img" aria-label="Barras semanais de receita e despesa">
			{#each weeks as week, i (week.label + i)}
				<div class="flex flex-1 items-end gap-0.5">
					<div
						class="min-h-[2px] flex-1 rounded-t bg-green-400 dark:bg-green-500"
						style="height: {(week.income / maxValue) * 100}%"
						title="Semana {week.label} — Entrou: {formatBRL(week.income)}"
					></div>
					<div
						class="min-h-[2px] flex-1 rounded-t bg-red-400 dark:bg-red-500"
						style="height: {(week.expenses / maxValue) * 100}%"
						title="Semana {week.label} — Saiu: {formatBRL(week.expenses)}"
					></div>
				</div>
			{/each}
		</div>

		<!-- X-axis labels -->
		<div class="mt-1 flex gap-1">
			{#each weeks as week, i (week.label + i)}
				<div class="flex-1 text-center text-[10px] text-ink-muted">
					{showEveryOther ? (i % 2 === 0 ? week.label : '') : week.label}
				</div>
			{/each}
		</div>

		<!-- Legend -->
		<div class="mt-3 flex items-center justify-center gap-4 text-xs text-ink-muted">
			<span class="flex items-center gap-1.5">
				<span class="inline-block h-2.5 w-2.5 rounded-sm bg-green-400 dark:bg-green-500"></span>
				Entrou
			</span>
			<span class="flex items-center gap-1.5">
				<span class="inline-block h-2.5 w-2.5 rounded-sm bg-red-400 dark:bg-red-500"></span>
				Saiu
			</span>
		</div>
	</div>
{/if}
