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

<div class="space-y-6">
	<header>
		<h1 class="font-heading text-3xl font-bold">Financeiro</h1>
		<p class="text-ink-muted">Período: {data.period.from} a {data.period.to}</p>
	</header>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
		<Card>
			<p class="text-sm text-ink-muted">Projetada</p>
			<p class="mt-1 text-2xl font-semibold" data-testid="fin-projected">
				{formatBRL(data.kpis.projected)}
			</p>
		</Card>
		<Card>
			<p class="text-sm text-ink-muted">Efetivada</p>
			<p class="mt-1 text-2xl font-semibold" data-testid="fin-actual">
				{formatBRL(data.kpis.actual)}
			</p>
		</Card>
		<Card>
			<p class="text-sm text-ink-muted">Despesas</p>
			<p class="mt-1 text-2xl font-semibold" data-testid="fin-expenses">
				{formatBRL(data.kpis.expenses)}
			</p>
		</Card>
		<Card>
			<p class="text-sm text-ink-muted">Lucro</p>
			<p
				class="mt-1 text-2xl font-semibold {data.kpis.profit >= 0
					? 'text-primary'
					: 'text-red-600'}"
				data-testid="fin-profit"
			>
				{formatBRL(data.kpis.profit)}
			</p>
		</Card>
		<Card>
			<p class="text-sm text-ink-muted">A receber</p>
			<p class="mt-1 text-2xl font-semibold text-secondary-600" data-testid="fin-outstanding">
				{formatBRL(data.kpis.outstanding)}
			</p>
		</Card>
	</div>

	<Card title="Top pacientes por receita projetada">
		{#if data.ranking.length === 0}
			<p class="py-8 text-center text-ink-muted">Sem dados ainda.</p>
		{:else}
			<ol class="divide-y divide-primary-100/40 dark:divide-white/5">
				{#each data.ranking as r, i (r.patient_id)}
					<li class="flex items-center justify-between py-2.5">
						<span>
							<span class="text-ink-muted tabular-nums w-6 inline-block">{i + 1}.</span>
							<a href="/app/patients/{r.patient_id}" class="hover:text-primary">{r.name}</a>
						</span>
						<span class="tabular-nums font-medium">{formatBRL(r.monthly)}</span>
					</li>
				{/each}
			</ol>
		{/if}
	</Card>
</div>
