<script lang="ts">
	import { Globe, Robot, SpeakerHigh, Stack, Database, ArrowClockwise } from 'phosphor-svelte';
	import type { ServiceCheck } from './+page.server';

	interface Props {
		data: { services: ServiceCheck[] };
	}
	let { data }: Props = $props();

	const iconMap = {
		cep: Globe,
		llm: Robot,
		tts: SpeakerHigh,
		redis: Stack,
		supabase: Database
	};

	function getIcon(id: string) {
		return iconMap[id as keyof typeof iconMap] ?? Globe;
	}

	const statusDot: Record<string, string> = {
		ok:      'bg-green-500',
		warning: 'bg-amber-400',
		error:   'bg-red-500'
	};

	const statusRing: Record<string, string> = {
		ok:      'ring-green-200 dark:ring-green-800',
		warning: 'ring-amber-200 dark:ring-amber-800',
		error:   'ring-red-200 dark:ring-red-800'
	};

	const statusText: Record<string, string> = {
		ok:      'text-green-600 dark:text-green-400',
		warning: 'text-amber-600 dark:text-amber-400',
		error:   'text-red-600 dark:text-red-400'
	};

	const statusLabel: Record<string, string> = {
		ok:      'Operacional',
		warning: 'Atenção',
		error:   'Falha'
	};

	function fmtMs(ms: number | null): string {
		if (ms == null) return '—';
		return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
	}

	function fmtCheckedAt(iso: string): string {
		return new Date(iso).toLocaleTimeString('pt-BR');
	}

	const summary = $derived(() => {
		const errors   = data.services.filter((s) => s.status === 'error').length;
		const warnings = data.services.filter((s) => s.status === 'warning').length;
		if (errors > 0) return { text: `${errors} com falha`, cls: 'text-red-600 dark:text-red-400' };
		if (warnings > 0) return { text: `${warnings} com aviso`, cls: 'text-amber-600 dark:text-amber-400' };
		return { text: 'Todos operacionais', cls: 'text-green-600 dark:text-green-400' };
	});
</script>

<div class="space-y-8">
	<!-- Cabeçalho -->
	<div class="border-b border-primary-100/40 pb-6 dark:border-white/5">
		<div class="flex items-start justify-between">
			<div>
				<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Serviços</h1>
				<p class="mt-1 text-sm text-ink-muted">Estado dos serviços externos e infraestrutura.</p>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium {summary().cls}">{summary().text}</span>
				<a
					href="/admin/services"
					class="flex items-center gap-1.5 rounded-lg border border-primary-100/60 bg-bg px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-primary-50/60 dark:border-white/10 dark:bg-bg-dark dark:hover:bg-white/5"
				>
					<ArrowClockwise size={13} /> Atualizar
				</a>
			</div>
		</div>
	</div>

	<!-- Grid de cards -->
	<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
		{#each data.services as svc (svc.id)}
			{@const Icon = getIcon(svc.id)}

			<article class="surface flex flex-col gap-0 overflow-hidden p-0">
				<!-- Header do card -->
				<div class="flex items-start justify-between p-5">
					<div class="flex items-center gap-3">
						<!-- Ícone do serviço -->
						<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-white/5">
							<Icon size={20} class="text-ink-muted" weight="duotone" />
						</span>
						<div>
							<p class="font-semibold leading-tight text-ink dark:text-bg">{svc.name}</p>
							<p class="mt-0.5 text-xs text-ink-muted">verificado às {fmtCheckedAt(svc.checked_at)}</p>
						</div>
					</div>

					<!-- Indicador de status -->
					<div class="flex flex-col items-end gap-1">
						<span class="flex items-center gap-1.5">
							<span class="relative flex h-3 w-3">
								{#if svc.status === 'ok'}
									<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-50"></span>
								{/if}
								<span class="relative inline-flex h-3 w-3 rounded-full ring-2 ring-offset-1 {statusDot[svc.status]} {statusRing[svc.status]}"></span>
							</span>
							<span class="text-xs font-semibold {statusText[svc.status]}">{statusLabel[svc.status]}</span>
						</span>
						{#if svc.latency_ms != null}
							<span class="text-[11px] tabular-nums text-ink-muted">{fmtMs(svc.latency_ms)}</span>
						{/if}
					</div>
				</div>

				<!-- Mensagem de status -->
				<div class="border-t border-primary-100/40 px-5 py-2.5 dark:border-white/5">
					<p class="text-xs {statusText[svc.status]}">{svc.message}</p>
				</div>

				<!-- Log lines -->
				{#if svc.logs.length > 0}
					<div class="border-t border-primary-100/40 bg-primary-50/40 px-5 py-3 dark:border-white/5 dark:bg-white/[0.03]">
						<p class="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-ink-muted/60">Últimos registros</p>
						<ul class="space-y-0.5 font-mono text-[11px] leading-snug text-ink-muted">
							{#each svc.logs as line}
								<li class="truncate" title={line}>{line}</li>
							{/each}
						</ul>
					</div>
				{:else}
					<div class="border-t border-primary-100/40 px-5 py-3 dark:border-white/5">
						<p class="font-mono text-[11px] text-ink-muted/50">— sem registros —</p>
					</div>
				{/if}
			</article>
		{/each}
	</div>
</div>
