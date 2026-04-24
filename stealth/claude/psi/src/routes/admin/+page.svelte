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

	const typeLabel: Record<string, string> = {
		llm_chat: 'LLM Chat',
		tts_synthesis: 'TTS (voz)',
		stt_transcription: 'STT (transcrição)'
	};
</script>

<div class="space-y-8">
	<!-- Page header -->
	<div class="border-b border-primary-100/40 pb-6 dark:border-white/5">
		<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Visão geral</h1>
		<p class="mt-1 text-sm text-ink-muted">Estatísticas da plataforma — últimos 30 dias.</p>
	</div>

	<!-- Platform counts -->
	<div>
		<p class="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Contas ativas</p>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<a href="/admin/data?tab=clinicas" class="surface p-5 transition hover:ring-1 hover:ring-primary/30">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Clínicas</p>
						<p class="mt-2 text-3xl font-bold tabular-nums text-ink dark:text-bg">
							{data.counts.clinics}
						</p>
					</div>
					<span class="rounded-xl bg-primary-50 p-2.5 dark:bg-primary-900/40">
						<Buildings size={20} class="text-primary" weight="duotone" />
					</span>
				</div>
			</a>

			<a href="/admin/data?tab=terapeutas" class="surface p-5 transition hover:ring-1 hover:ring-primary/30">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Terapeutas</p>
						<p class="mt-2 text-3xl font-bold tabular-nums text-ink dark:text-bg">
							{data.counts.therapists}
						</p>
					</div>
					<span class="rounded-xl bg-primary-50 p-2.5 dark:bg-primary-900/40">
						<Users size={20} class="text-primary" weight="duotone" />
					</span>
				</div>
			</a>

			<a href="/admin/data?tab=pacientes" class="surface p-5 transition hover:ring-1 hover:ring-primary/30">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Pacientes</p>
						<p class="mt-2 text-3xl font-bold tabular-nums text-ink dark:text-bg">
							{data.counts.patients}
						</p>
					</div>
					<span class="rounded-xl bg-primary-50 p-2.5 dark:bg-primary-900/40">
						<Heartbeat size={20} class="text-primary" weight="duotone" />
					</span>
				</div>
			</a>

			<!-- AI calls: secondary accent to distinguish from domain counts -->
			<section class="surface border-l-4 border-l-secondary p-5">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Chamadas IA</p>
						<p class="mt-2 text-3xl font-bold tabular-nums text-ink dark:text-bg">
							{fmt(data.usage.total.calls)}
						</p>
					</div>
					<span class="rounded-xl bg-secondary-50 p-2.5 dark:bg-secondary-900/20">
						<Robot size={20} class="text-secondary" weight="duotone" />
					</span>
				</div>
			</section>
		</div>
	</div>

	<!-- AI usage detail -->
	<Card title="Uso de IA">
		<!-- Token & character summary -->
		<dl class="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
			<div>
				<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Tokens entrada</dt>
				<dd class="mt-1 text-xl font-bold tabular-nums text-ink dark:text-bg">
					{fmt(data.usage.total.input_tokens)}
				</dd>
			</div>
			<div>
				<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Tokens saída</dt>
				<dd class="mt-1 text-xl font-bold tabular-nums text-ink dark:text-bg">
					{fmt(data.usage.total.output_tokens)}
				</dd>
			</div>
			<div>
				<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Caracteres TTS</dt>
				<dd class="mt-1 text-xl font-bold tabular-nums text-ink dark:text-bg">
					{fmt(data.usage.total.characters)}
				</dd>
			</div>
			<div>
				<dt class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Custo total</dt>
				<dd class="mt-1 text-xl font-bold tabular-nums text-secondary-600">
					{fmtUSD(data.usage.total.cost_usd)}
				</dd>
			</div>
		</dl>

		{#if Object.keys(data.usage.byType).length > 0}
			<div class="mt-6 border-t border-primary-100/50 pt-5 dark:border-white/5">
				<p class="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Custo por tipo</p>
				<ul class="space-y-2">
					{#each Object.entries(data.usage.byType) as [type, cost]}
						<li class="flex items-center justify-between rounded-lg bg-primary-50/60 px-3 py-2 dark:bg-white/5">
							<span class="text-sm font-medium text-ink dark:text-bg">
								{typeLabel[type] ?? type}
							</span>
							<span class="tabular-nums text-sm font-semibold text-secondary-600">
								{fmtUSD(cost)}
							</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</Card>
</div>
