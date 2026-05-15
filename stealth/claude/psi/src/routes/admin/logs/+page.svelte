<script lang="ts">
	import Card from '$lib/ui/Card.svelte';
	import { Robot, SpeakerHigh, Microphone, CheckCircle, XCircle, ArrowLeft, ArrowRight } from 'phosphor-svelte';
	import type { AIUsageLog } from '$core/types';

	interface Props {
		data: {
			logs: AIUsageLog[];
			count: number;
			page: number;
			totalPages: number;
			filters: { from: string; to: string; callType: string; status: string; therapistId: string };
			usage: {
				total: { calls: number; input_tokens: number; output_tokens: number; characters: number; cost_usd: number };
				byType: Record<string, number>;
			};
			therapistMap: Record<string, string>;
			therapistList: { id: string; name: string }[];
		};
	}
	let { data }: Props = $props();

	// ── Formatters ───────────────────────────────────────────────────────────
	const fmt    = (n: number) => n.toLocaleString('pt-BR');
	const fmtUSD = (n: number) => `US$ ${n.toFixed(4)}`;
	const fmtMs  = (ms: number | null | undefined) =>
		ms == null ? '—' : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

	function fmtDate(iso: string): string {
		return new Intl.DateTimeFormat('pt-BR', {
			timeZone: 'America/Sao_Paulo',
			dateStyle: 'short',
			timeStyle: 'short'
		}).format(new Date(iso));
	}

	// ── Labels ────────────────────────────────────────────────────────────────
	const typeLabel: Record<string, string> = {
		llm_chat:         'LLM Chat',
		tts_synthesis:    'TTS (voz)',
		stt_transcription:'STT (transcrição)'
	};

	function typeIcon(callType: string) {
		if (callType === 'tts_synthesis')    return SpeakerHigh;
		if (callType === 'stt_transcription') return Microphone;
		return Robot;
	}

	// ── Pagination URL helpers ────────────────────────────────────────────────
	function pageUrl(p: number): string {
		const params = new URLSearchParams({
			from:       data.filters.from,
			to:         data.filters.to,
			type:       data.filters.callType,
			status:     data.filters.status,
			therapist:  data.filters.therapistId,
			page:       String(p)
		});
		// Remove empty params for cleaner URLs
		for (const [k, v] of [...params.entries()]) {
			if (!v || v === '1') params.delete(k);
		}
		const qs = params.toString();
		return `/admin/logs${qs ? `?${qs}` : ''}`;
	}

	// ── Token / character display ─────────────────────────────────────────────
	function usage(log: AIUsageLog): string {
		if (log.call_type === 'llm_chat') {
			return `${fmt(log.input_tokens)} / ${fmt(log.output_tokens)} tok`;
		}
		if (log.call_type === 'tts_synthesis' || log.call_type === 'stt_transcription') {
			return `${fmt(log.characters)} chars`;
		}
		return '—';
	}
</script>

<div class="space-y-6">
	<!-- ── Page header ───────────────────────────────────────────────────────── -->
	<div class="border-b border-primary-100/40 pb-6 dark:border-white/5">
		<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Logs de IA</h1>
		<p class="mt-1 text-sm text-ink-muted">
			{fmt(data.count)} registro{data.count !== 1 ? 's' : ''} no período · página {data.page} de {Math.max(1, data.totalPages)}
		</p>
	</div>

	<!-- ── Filter form ───────────────────────────────────────────────────────── -->
	<form method="GET" class="flex flex-wrap items-end gap-3">
		<div class="flex flex-col gap-1">
			<label for="from" class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">De</label>
			<input
				id="from" name="from" type="date"
				value={data.filters.from}
				class="input text-sm"
			/>
		</div>
		<div class="flex flex-col gap-1">
			<label for="to" class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Até</label>
			<input
				id="to" name="to" type="date"
				value={data.filters.to}
				class="input text-sm"
			/>
		</div>
		<div class="flex flex-col gap-1">
			<label for="type" class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Tipo</label>
			<select id="type" name="type" class="input text-sm">
				<option value="" selected={!data.filters.callType}>Todos</option>
				<option value="llm_chat"          selected={data.filters.callType === 'llm_chat'}>LLM Chat</option>
				<option value="tts_synthesis"     selected={data.filters.callType === 'tts_synthesis'}>TTS (voz)</option>
				<option value="stt_transcription" selected={data.filters.callType === 'stt_transcription'}>STT (transcrição)</option>
			</select>
		</div>
		<div class="flex flex-col gap-1">
			<label for="status" class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Status</label>
			<select id="status" name="status" class="input text-sm">
				<option value="" selected={!data.filters.status}>Todos</option>
				<option value="success" selected={data.filters.status === 'success'}>Sucesso</option>
				<option value="error"   selected={data.filters.status === 'error'}>Erro</option>
			</select>
		</div>
		<div class="flex flex-col gap-1">
			<label for="therapist" class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Terapeuta</label>
			<select id="therapist" name="therapist" class="input text-sm">
				<option value="" selected={!data.filters.therapistId}>Todos</option>
				{#each data.therapistList as t}
					<option value={t.id} selected={data.filters.therapistId === t.id}>{t.name}</option>
				{/each}
			</select>
		</div>
		<button type="submit" class="btn btn-primary h-9 text-sm">Filtrar</button>
		{#if data.filters.from || data.filters.callType || data.filters.status || data.filters.therapistId}
			<a href="/admin/logs" class="btn btn-secondary h-9 text-sm">Limpar</a>
		{/if}
	</form>

	<!-- ── Aggregate stats ───────────────────────────────────────────────────── -->
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
		<div class="surface p-4">
			<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Chamadas</p>
			<p class="mt-1.5 text-2xl font-bold tabular-nums text-ink dark:text-bg">
				{fmt(data.usage.total.calls)}
			</p>
		</div>
		<div class="surface p-4">
			<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Tokens entrada</p>
			<p class="mt-1.5 text-2xl font-bold tabular-nums text-ink dark:text-bg">
				{fmt(data.usage.total.input_tokens)}
			</p>
		</div>
		<div class="surface p-4">
			<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Tokens saída</p>
			<p class="mt-1.5 text-2xl font-bold tabular-nums text-ink dark:text-bg">
				{fmt(data.usage.total.output_tokens)}
			</p>
		</div>
		<div class="surface p-4">
			<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Caracteres TTS</p>
			<p class="mt-1.5 text-2xl font-bold tabular-nums text-ink dark:text-bg">
				{fmt(data.usage.total.characters)}
			</p>
		</div>
		<div class="surface border-l-4 border-l-secondary p-4">
			<p class="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Custo total</p>
			<p class="mt-1.5 text-2xl font-bold tabular-nums text-secondary-600">
				{fmtUSD(data.usage.total.cost_usd)}
			</p>
		</div>
	</div>

	<!-- ── Cost by type ──────────────────────────────────────────────────────── -->
	{#if Object.keys(data.usage.byType).length > 0}
		<Card title="Custo por tipo">
			<ul class="space-y-2">
				{#each Object.entries(data.usage.byType) as [type, cost]}
					{@const Icon = typeIcon(type)}
					<li class="flex items-center justify-between rounded-lg bg-primary-50/60 px-3 py-2 dark:bg-white/5">
						<span class="flex items-center gap-2 text-sm font-medium text-ink dark:text-bg">
							<Icon size={15} class="text-ink-muted" />
							{typeLabel[type] ?? type}
						</span>
						<span class="tabular-nums text-sm font-semibold text-secondary-600">
							{fmtUSD(cost)}
						</span>
					</li>
				{/each}
			</ul>
		</Card>
	{/if}

	<!-- ── Log table ─────────────────────────────────────────────────────────── -->
	<Card title="Registros individuais">
		{#if data.logs.length === 0}
			<p class="py-8 text-center text-sm text-ink-muted">Nenhum registro no período.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-primary-100/50 text-left dark:border-white/5">
							<th class="pb-2 pr-4 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Data/hora</th>
							<th class="pb-2 pr-4 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Terapeuta</th>
							<th class="pb-2 pr-4 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Tipo</th>
							<th class="pb-2 pr-4 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Modelo</th>
							<th class="pb-2 pr-4 text-[11px] font-medium uppercase tracking-wide text-ink-muted tabular-nums">Uso</th>
							<th class="pb-2 pr-4 text-[11px] font-medium uppercase tracking-wide text-ink-muted tabular-nums">Custo</th>
							<th class="pb-2 pr-4 text-[11px] font-medium uppercase tracking-wide text-ink-muted tabular-nums">Duração</th>
							<th class="pb-2 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-primary-100/30 dark:divide-white/5">
						{#each data.logs as log (log.id)}
							<tr class="group">
								<td class="py-2.5 pr-4 font-mono text-xs tabular-nums text-ink-muted">
									{fmtDate(log.created_at)}
								</td>
								<td class="py-2.5 pr-4 text-ink dark:text-bg">
									{log.therapist_id ? (data.therapistMap[log.therapist_id] ?? '—') : '—'}
								</td>
								<td class="py-2.5 pr-4">
									{@const Icon = typeIcon(log.call_type)}
									<span class="flex items-center gap-1.5 text-ink-muted">
										<Icon size={13} />
										{typeLabel[log.call_type] ?? log.call_type}
									</span>
								</td>
								<td class="py-2.5 pr-4 font-mono text-xs text-ink-muted">
									{log.model ?? log.provider ?? '—'}
								</td>
								<td class="py-2.5 pr-4 font-mono text-xs tabular-nums text-ink dark:text-bg">
									{usage(log)}
								</td>
								<td class="py-2.5 pr-4 font-mono text-xs tabular-nums text-secondary-600">
									{fmtUSD(log.cost_usd)}
								</td>
								<td class="py-2.5 pr-4 font-mono text-xs tabular-nums text-ink-muted">
									{fmtMs(log.duration_ms)}
								</td>
								<td class="py-2.5">
									{#if log.status === 'success'}
										<span class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
											<CheckCircle size={11} weight="fill" /> ok
										</span>
									{:else}
										<span
											class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300"
											title={log.error_message ?? ''}
										>
											<XCircle size={11} weight="fill" /> erro
										</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- ── Pagination ──────────────────────────────────────────────────── -->
			{#if data.totalPages > 1}
				<div class="mt-4 flex items-center justify-between border-t border-primary-100/50 pt-4 dark:border-white/5">
					<p class="text-xs text-ink-muted">
						{((data.page - 1) * 50) + 1}–{Math.min(data.page * 50, data.count)} de {fmt(data.count)}
					</p>
					<div class="flex items-center gap-2">
						{#if data.page > 1}
							<a
								href={pageUrl(data.page - 1)}
								class="flex items-center gap-1 rounded-lg border border-primary-100/60 px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-primary-50/60 dark:border-white/10 dark:hover:bg-white/5"
							>
								<ArrowLeft size={13} /> Anterior
							</a>
						{/if}
						<span class="text-xs font-medium text-ink dark:text-bg">
							{data.page} / {data.totalPages}
						</span>
						{#if data.page < data.totalPages}
							<a
								href={pageUrl(data.page + 1)}
								class="flex items-center gap-1 rounded-lg border border-primary-100/60 px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-primary-50/60 dark:border-white/10 dark:hover:bg-white/5"
							>
								Próxima <ArrowRight size={13} />
							</a>
						{/if}
					</div>
				</div>
			{/if}
		{/if}
	</Card>
</div>
