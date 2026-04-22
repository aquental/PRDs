<script lang="ts">
	import Card from '$lib/ui/Card.svelte';
	import { Buildings, Users, Heartbeat, Robot } from 'phosphor-svelte';

	interface Props {
		data: {
			counts: { clinics: number; therapists: number; patients: number };
			usage: {
				total: { calls: number; input_tokens: number; output_tokens: number; characters: number; cost_usd: number };
				byType: Record<string, number>;
			};
		};
	}
	let { data }: Props = $props();

	const fmt = (n: number) => n.toLocaleString('pt-BR');
	const fmtUSD = (n: number) => `US$ ${n.toFixed(4)}`;
</script>

<div class="space-y-6">
	<div>
		<h1 class="font-heading text-3xl font-bold">Visão geral</h1>
		<p class="text-ink-muted">Estatísticas do sistema (últimos 30 dias).</p>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-sm text-ink-muted">Clínicas</p>
					<p class="mt-1 text-3xl font-semibold">{data.counts.clinics}</p>
				</div>
				<Buildings size={24} class="text-primary" weight="duotone" />
			</div>
		</Card>
		<Card>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-sm text-ink-muted">Terapeutas</p>
					<p class="mt-1 text-3xl font-semibold">{data.counts.therapists}</p>
				</div>
				<Users size={24} class="text-primary" weight="duotone" />
			</div>
		</Card>
		<Card>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-sm text-ink-muted">Pacientes</p>
					<p class="mt-1 text-3xl font-semibold">{data.counts.patients}</p>
				</div>
				<Heartbeat size={24} class="text-primary" weight="duotone" />
			</div>
		</Card>
		<Card>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-sm text-ink-muted">Chamadas IA</p>
					<p class="mt-1 text-3xl font-semibold">{fmt(data.usage.total.calls)}</p>
				</div>
				<Robot size={24} class="text-primary" weight="duotone" />
			</div>
		</Card>
	</div>

	<Card>
		<h2 class="font-heading text-lg font-semibold mb-4">Uso de IA</h2>
		<dl class="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
			<div>
				<dt class="text-ink-muted">Tokens entrada</dt>
				<dd class="font-semibold">{fmt(data.usage.total.input_tokens)}</dd>
			</div>
			<div>
				<dt class="text-ink-muted">Tokens saída</dt>
				<dd class="font-semibold">{fmt(data.usage.total.output_tokens)}</dd>
			</div>
			<div>
				<dt class="text-ink-muted">Caracteres TTS</dt>
				<dd class="font-semibold">{fmt(data.usage.total.characters)}</dd>
			</div>
			<div>
				<dt class="text-ink-muted">Custo total</dt>
				<dd class="font-semibold">{fmtUSD(data.usage.total.cost_usd)}</dd>
			</div>
		</dl>

		{#if Object.keys(data.usage.byType).length > 0}
			<div class="mt-4 border-t border-primary-100/50 dark:border-white/5 pt-4">
				<p class="text-sm text-ink-muted mb-2">Custo por tipo</p>
				<ul class="space-y-1 text-sm">
					{#each Object.entries(data.usage.byType) as [type, cost]}
						<li class="flex justify-between">
							<span class="text-ink-muted">{type}</span>
							<span class="font-medium">{fmtUSD(cost)}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</Card>
</div>
