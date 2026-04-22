<script lang="ts">
	import Card from '$lib/ui/Card.svelte';
	import { formatBRL } from '$lib/utils/format';
	import { goto } from '$app/navigation';
	import { formatDateTime } from '$lib/utils/format';

	interface UnpaidSession {
		id: string;
		fee: number;
		scheduled_at: string;
		patient_id: string;
		patient_name: string;
	}

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
			unpaidSessions: UnpaidSession[];
		};
	}
	let { data }: Props = $props();

	let fromDate = $state(data.period.from);
	let toDate = $state(data.period.to);
	let showUnpaid = $state(false);

	function applyPeriod(e: Event) {
		e.preventDefault();
		goto(`?from=${fromDate}&to=${toDate}`, { replaceState: true });
	}
</script>

<div class="space-y-8">
	<div class="flex flex-wrap items-start justify-between gap-4 border-b border-primary-100/40 pb-6 dark:border-white/5">
		<div>
			<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Financeiro</h1>
			<p class="mt-1 text-sm text-ink-muted">Período: {data.period.from} a {data.period.to}</p>
		</div>
		<!-- Period selector -->
		<form onsubmit={applyPeriod} class="flex items-end gap-2">
			<div>
				<label for="from-date" class="mb-1 block text-xs font-medium text-ink-muted">De</label>
				<input
					id="from-date"
					type="date"
					bind:value={fromDate}
					class="input text-sm"
				/>
			</div>
			<div>
				<label for="to-date" class="mb-1 block text-xs font-medium text-ink-muted">Até</label>
				<input
					id="to-date"
					type="date"
					bind:value={toDate}
					class="input text-sm"
				/>
			</div>
			<button type="submit" class="btn btn-secondary text-sm">Filtrar</button>
		</form>
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

		<!-- A receber: clickable drill-down -->
		<button
			type="button"
			class="surface border-l-4 border-l-secondary p-5 text-left hover:ring-1 hover:ring-secondary/40 transition-shadow"
			onclick={() => (showUnpaid = !showUnpaid)}
			aria-expanded={showUnpaid}
			data-testid="fin-outstanding-btn"
		>
			<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">A receber</p>
			<p class="mt-2 text-2xl font-bold tabular-nums text-secondary-600" data-testid="fin-outstanding">
				{formatBRL(data.kpis.outstanding)}
			</p>
			{#if data.unpaidSessions.length > 0}
				<p class="mt-1 text-xs text-secondary-500">
					{data.unpaidSessions.length} sessão{data.unpaidSessions.length !== 1 ? 'ões' : ''} pendente{data.unpaidSessions.length !== 1 ? 's' : ''} · {showUnpaid ? 'fechar ▲' : 'ver detalhes ▼'}
				</p>
			{:else}
				<p class="mt-1 text-xs text-ink-muted">Nenhuma pendência</p>
			{/if}
		</button>
	</div>

	<!-- Unpaid sessions drill-down -->
	{#if showUnpaid && data.unpaidSessions.length > 0}
		<Card title="Sessões a receber">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead>
						<tr class="border-b border-primary-100/60 dark:border-white/5">
							<th class="pb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Data</th>
							<th class="pb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Paciente</th>
							<th class="pb-3 text-right text-[11px] font-medium uppercase tracking-wide text-ink-muted">Valor da sessão</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-primary-100/40 dark:divide-white/5">
						{#each data.unpaidSessions as s (s.id)}
							<tr>
								<td class="py-3 text-ink-muted">{formatDateTime(s.scheduled_at)}</td>
								<td class="py-3 font-medium">
									<a href="/app/patients/{s.patient_id}" class="hover:text-primary">{s.patient_name}</a>
								</td>
								<td class="py-3 text-right tabular-nums font-semibold">{formatBRL(s.fee)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="mt-4 text-right text-xs text-ink-muted">
				Para marcar como pagas, acesse a página de <a href="/app/sessions" class="text-primary hover:underline">Sessões</a>.
			</p>
		</Card>
	{/if}

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
