<script lang="ts">
	import { ArrowRight } from 'phosphor-svelte';
	import { formatBRL } from '$lib/utils/format';

	interface Props {
		fixo: number;
		percentual: number;
		disabled: boolean;
		monthRevenue: number;
		monthSessionCount: number;
		monthYear: string;
	}

	let { fixo, percentual, disabled, monthRevenue, monthSessionCount, monthYear }: Props = $props();

	const monthRepasse = $derived.by(() => {
		if (disabled) return 0;
		return monthSessionCount * fixo + (percentual / 100) * monthRevenue;
	});

	const nextClosureLabel = $derived.by(() => {
		const [yr, mo] = monthYear.split('-').map(Number);
		const months = [
			'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
			'jul', 'ago', 'set', 'out', 'nov', 'dez',
		];
		const nextMo = mo === 12 ? 1 : mo + 1;
		const nextYr = mo === 12 ? yr + 1 : yr;
		return `1 de ${months[nextMo - 1]}/${String(nextYr).slice(2)}`;
	});
</script>

<section class="surface p-5" aria-label="Repasse à clínica">
	<header class="mb-4 border-b border-primary-100/60 pb-3 dark:border-white/15">
		<div class="flex items-center justify-between">
			<h2 class="text-base font-semibold text-ink dark:text-bg">Repasse à clínica</h2>
			{#if !disabled}
				<span class="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-white/10 dark:text-bg">
					{fixo > 0 && percentual > 0
						? `R$${fixo} + ${percentual}%`
						: fixo > 0
							? `R$${fixo}/sessão`
							: `${percentual}%`}
				</span>
			{/if}
		</div>
	</header>

	{#if disabled}
		<p class="text-sm text-ink-muted">Repasse não configurado.</p>
		<a
			href="/app/settings"
			class="mt-2 flex min-h-[44px] items-center gap-1 text-xs text-primary hover:underline"
		>
			Configurar em Clínica <ArrowRight size={12} />
		</a>
	{:else}
		<div class="space-y-3 text-sm">
			<div class="flex items-center justify-between">
				<span class="text-ink-muted">Acumulado no mês</span>
				<span class="font-semibold text-ink dark:text-bg">{formatBRL(monthRepasse)}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-ink-muted">Sessões cobradas</span>
				<span class="text-ink dark:text-bg">{monthSessionCount}</span>
			</div>
			<div class="mt-1 border-t border-primary-100/40 pt-2 dark:border-white/5">
				<div class="flex items-center justify-between text-xs text-ink-muted">
					<span>Próximo fechamento</span>
					<span>{nextClosureLabel}</span>
				</div>
			</div>
		</div>
	{/if}
</section>
