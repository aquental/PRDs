<script lang="ts">
	import { Bell, CheckCircle, XCircle } from 'phosphor-svelte';
	import type { PushPayload } from '$lib/core/types';

	interface SimResult {
		label: string;
		description: string;
		payload: PushPayload | null;
	}

	interface Props {
		data: { results: SimResult[]; generatedAt: string };
	}
	let { data }: Props = $props();

	function formatTs(iso: string): string {
		return new Date(iso).toLocaleString('pt-BR', {
			day: '2-digit', month: '2-digit', year: '2-digit',
			hour: '2-digit', minute: '2-digit', second: '2-digit'
		});
	}

	const TRIGGER_LABELS: Record<string, string> = {
		unregistered_sessions: 'Sessões sem registro',
		due_payments: 'Contas a pagar',
		month_close_reminder: 'Lembrete de fechamento',
		month_reopened: 'Mês reaberto',
	};
</script>

<div class="space-y-6">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Push Simulator</h1>
			<p class="mt-1 text-sm text-ink-muted">
				Payloads gerados com fixtures realistas. Nenhum push é enviado.
			</p>
		</div>
		<span class="shrink-0 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
			Dev only
		</span>
	</div>

	<p class="text-xs text-ink-muted">
		Gerado em {formatTs(data.generatedAt)}
	</p>

	<div class="space-y-4">
		{#each data.results as result (result.label)}
			<div class="surface rounded-2xl p-5">
				<!-- Header -->
				<div class="mb-3 flex items-start gap-3">
					{#if result.payload}
						<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
							<CheckCircle size={18} class="text-green-600 dark:text-green-400" weight="fill" />
						</div>
					{:else}
						<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
							<XCircle size={18} class="text-red-500 dark:text-red-400" weight="fill" />
						</div>
					{/if}
					<div class="min-w-0">
						<p class="font-medium text-ink dark:text-bg">{result.label}</p>
						<p class="mt-0.5 text-xs text-ink-muted">{result.description}</p>
					</div>
				</div>

				{#if result.payload}
					<!-- Mock push notification card -->
					<div class="mb-4 flex items-start gap-3 rounded-xl border border-primary-100/60 bg-primary-50/40 p-3 dark:border-white/5 dark:bg-white/5">
						<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
							<Bell size={18} weight="fill" />
						</div>
						<div>
							<p class="text-sm font-semibold text-ink dark:text-bg">{result.payload.title}</p>
							<p class="mt-0.5 text-sm text-ink-muted">{result.payload.body}</p>
							{#if result.payload.scheduledFor}
								<p class="mt-1 text-xs text-ink-muted/70">{formatTs(result.payload.scheduledFor)}</p>
							{/if}
						</div>
					</div>

					<!-- Raw payload -->
					<details class="group">
						<summary class="cursor-pointer select-none text-xs font-medium text-primary hover:underline">
							Ver payload JSON
						</summary>
						<pre class="mt-2 overflow-x-auto rounded-lg bg-ink/5 p-3 text-xs text-ink dark:bg-white/5 dark:text-bg">{JSON.stringify(result.payload, null, 2)}</pre>
					</details>
				{:else}
					<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
						Não dispararia — condição não atendida com os fixtures atuais.
					</p>
				{/if}
			</div>
		{/each}
	</div>

	<div class="rounded-xl border border-primary-100/40 bg-primary-50/20 p-4 text-sm text-ink-muted dark:border-white/5 dark:bg-white/5">
		<p class="font-medium text-ink dark:text-bg">Como usar</p>
		<ul class="mt-2 list-inside list-disc space-y-1 text-xs">
			<li>Cada card mostra o payload que <em>seria</em> enviado ao serviço de push.</li>
			<li>Payloads nulos indicam que a condição de disparo não foi atendida (janela horária, pendências, etc.).</li>
			<li>Para integrar com FCM/APNs: passe o payload para o SDK de notificação no seu worker de agendamento.</li>
			<li>O campo <code class="rounded bg-ink/10 px-1 dark:bg-white/10">data</code> carrega metadados extras para deep-link e analytics.</li>
		</ul>
	</div>
</div>
