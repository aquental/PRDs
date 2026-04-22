<script lang="ts">
	import Card from '$lib/ui/Card.svelte';
	import { formatBRL } from '$lib/utils/format';

	interface Props {
		data: {
			kpis: {
				projected: number;
				actual: number;
				expenses: number;
				profit: number;
				outstanding: number;
			};
			period: { from: string; to: string };
			ranking: { patient_id: string; name: string; monthly: number }[];
		};
	}
	let { data }: Props = $props();
</script>

<div class="space-y-8">
	<div class="border-b border-primary-100/40 pb-6 dark:border-white/5">
		<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Financeiro</h1>
		<p class="mt-1 text-sm text-ink-muted">Período: {data.period.from} a {data.period.to}</p>
	</div>

	<!-- Receita: projetada + efetivada em destaque -->
	<div class="grid gap-4 sm:grid-cols-2">
		<section class="surface p-5">
			<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Receita projetada</p>
			<p class="mt-2 text-3xl font-bold tabular-nums text-ink dark:text-bg" data-testid="fin-projected">
				{formatBRL(data.kpis.projected)}
			</p>
		</section>
		<section class="surface p-5">
			<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Receita efetivada</p>
			<p class="mt-2 text-3xl font-bold tabular-nums text-primary" data-testid="fin-actual">
				{formatBRL(data.kpis.actual)}
			</p>
		</section>
	</div>

	<!-- Despesas, Lucro (hero), A receber -->
	<div class="grid gap-4 sm:grid-cols-3">
		<section class="surface p-5">
			<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Despesas</p>
			<p class="mt-2 text-2xl font-bold tabular-nums text-red-600 dark:text-red-400" data-testid="fin-expenses">
				{formatBRL(data.kpis.expenses)}
			</p>
		</section>

		<!-- Lucro: hero metric — elevated treatment -->
		<section class="surface border-t-4 p-5 {data.kpis.profit >= 0 ? 'border-t-primary' : 'border-t-red-500'}">
			<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Lucro líquido</p>
			<p
				class="mt-2 text-3xl font-bold tabular-nums {data.kpis.profit >= 0 ? 'text-primary' : 'text-red-600 dark:text-red-400'}"
				data-testid="fin-profit"
			>
				{formatBRL(data.kpis.profit)}
			</p>
			<p class="mt-1 text-xs text-ink-muted">Efetivada − Despesas</p>
		</section>

		<section class="surface border-l-4 border-l-secondary p-5">
			<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">A receber</p>
			<p class="mt-2 text-2xl font-bold tabular-nums text-secondary-600" data-testid="fin-outstanding">
				{formatBRL(data.kpis.outstanding)}
			</p>
		</section>
	</div>

	<Card title="Top pacientes por receita projetada">
		{#if data.ranking.length === 0}
			<p class="py-8 text-center text-ink-muted">Sem dados ainda.</p>
		{:else}
			<ol class="divide-y divide-primary-100/40 dark:divide-white/5">
				{#each data.ranking as r, i (r.patient_id)}
					<li class="flex items-center justify-between py-3">
						<span class="flex items-center gap-3">
							<span class="w-5 text-right text-xs tabular-nums text-ink-muted">{i + 1}</span>
							<a href="/app/patients/{r.patient_id}" class="font-medium hover:text-primary">{r.name}</a>
						</span>
						<span class="tabular-nums font-semibold text-ink dark:text-bg">{formatBRL(r.monthly)}</span>
					</li>
				{/each}
			</ol>
		{/if}
	</Card>
</div>
