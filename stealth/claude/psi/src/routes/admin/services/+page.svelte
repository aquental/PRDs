<script lang="ts">
	import { enhance } from '$app/forms';
	import { Globe, Robot, SpeakerHigh, Stack, Database, ArrowClockwise, Warning } from 'phosphor-svelte';
	import type { ServiceCheck } from './+page.server';

	interface Props {
		data: { services: ServiceCheck[] };
	}
	let { data }: Props = $props();

	// ── Ícones por serviço ────────────────────────────────────────────────────
	const iconMap = { cep: Globe, llm: Robot, tts: SpeakerHigh, redis: Stack, supabase: Database };
	function getIcon(id: string) {
		return iconMap[id as keyof typeof iconMap] ?? Globe;
	}

	// ── Classes de status ─────────────────────────────────────────────────────
	const dotBg: Record<string, string> = {
		ok:      'bg-green-500',
		warning: 'bg-amber-400',
		error:   'bg-red-500'
	};
	const dotRing: Record<string, string> = {
		ok:      'ring-green-200 dark:ring-green-800',
		warning: 'ring-amber-200 dark:ring-amber-800',
		error:   'ring-red-200 dark:ring-red-800'
	};
	const statusText: Record<string, string> = {
		ok:      'text-green-600 dark:text-green-400',
		warning: 'text-amber-600 dark:text-amber-400',
		error:   'text-red-600 dark:text-red-400'
	};
	const statusLabel: Record<string, string> = { ok: 'Operacional', warning: 'Atenção', error: 'Falha' };

	function fmtMs(ms: number | null): string {
		if (ms == null || ms === 0) return '—';
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

	// ── Kill-switch: confirmação ──────────────────────────────────────────────
	interface PendingToggle {
		id: string;
		name: string;
		enabling: boolean; // true = está habilitando, false = está desabilitando
	}

	let pendingToggle = $state<PendingToggle | null>(null);
	let dialog: HTMLDialogElement;
	let toggleForm: HTMLFormElement;

	// Optimistic map: id → enabled value, applied immediately on confirm
	// so the pill flips before the server round-trip completes.
	let optimisticEnabled = $state<Record<string, boolean>>({});

	function requestToggle(svc: ServiceCheck) {
		const currentEnabled = optimisticEnabled[svc.id] ?? svc.enabled;
		pendingToggle = { id: svc.id, name: svc.name, enabling: !currentEnabled };
		dialog.showModal();
	}

	function cancelToggle() {
		pendingToggle = null;
		dialog.close();
	}

	function confirmToggle() {
		if (!pendingToggle) return;
		optimisticEnabled[pendingToggle.id] = pendingToggle.enabling;
		dialog.close();
		toggleForm.requestSubmit();
	}

	// Mapa de impacto para o dialog
	const IMPACT: Record<string, string> = {
		cep:   'A busca automática de endereço por CEP será desativada nas telas de configuração.',
		llm:   'O Assistente IA ficará indisponível para todos os terapeutas.',
		tts:   'O botão de voz (TTS/STT) ficará desabilitado no chat.',
		redis: 'O cache e o rate-limiting serão desativados. O sistema continuará funcional, porém mais lento.'
	};
</script>

<!-- ── Dialog de confirmação ─────────────────────────────────────────────── -->
<dialog
	bind:this={dialog}
	class="rounded-2xl border border-primary-100/60 bg-bg p-6 shadow-xl dark:border-white/10 dark:bg-bg-dark
	       backdrop:bg-black/40 backdrop:backdrop-blur-sm w-full max-w-sm"
>
	{#if pendingToggle}
		<div class="flex items-start gap-3">
			<span class="mt-0.5 rounded-xl bg-amber-100 p-2 dark:bg-amber-900/30">
				<Warning size={20} class="text-amber-600 dark:text-amber-400" weight="fill" />
			</span>
			<div class="min-w-0">
				<h2 class="font-semibold text-ink dark:text-bg">
					{pendingToggle.enabling ? 'Ativar' : 'Desabilitar'} {pendingToggle.name}?
				</h2>
				{#if !pendingToggle.enabling}
					<p class="mt-1.5 text-sm leading-relaxed text-ink-muted">
						{IMPACT[pendingToggle.id] ?? 'O serviço será desabilitado no sistema.'}
					</p>
				{:else}
					<p class="mt-1.5 text-sm leading-relaxed text-ink-muted">
						O serviço será reativado imediatamente.
					</p>
				{/if}
			</div>
		</div>
		<div class="mt-5 flex justify-end gap-2">
			<button
				type="button"
				onclick={cancelToggle}
				class="rounded-xl border border-primary-100/60 px-4 py-2 text-sm font-medium text-ink-muted transition hover:bg-primary-50/60 dark:border-white/10 dark:hover:bg-white/5"
			>
				Cancelar
			</button>
			<button
				type="button"
				onclick={confirmToggle}
				class="rounded-xl px-4 py-2 text-sm font-medium text-white transition
				       {pendingToggle.enabling
				         ? 'bg-green-600 hover:bg-green-700'
				         : 'bg-red-600 hover:bg-red-700'}"
			>
				{pendingToggle.enabling ? 'Ativar' : 'Desabilitar'}
			</button>
		</div>
	{/if}
</dialog>

<!-- Formulário compartilhado (submetido programaticamente ao confirmar) -->
<form
	bind:this={toggleForm}
	method="POST"
	action="?/toggle"
	class="hidden"
	use:enhance={() => async ({ update }) => {
		await update({ reset: false });
		optimisticEnabled = {};
		pendingToggle = null;
	}}
>
	<input type="hidden" name="id"      value={pendingToggle?.id ?? ''} />
	<input type="hidden" name="enabled" value={String(pendingToggle?.enabling ?? true)} />
</form>

<!-- ── Página ─────────────────────────────────────────────────────────────── -->
<div class="space-y-8">
	<div class="border-b border-primary-100/40 pb-6 dark:border-white/5">
		<div class="flex items-start justify-between">
			<div>
				<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Serviços</h1>
				<p class="mt-1 text-sm text-ink-muted">Estado e kill-switches dos serviços externos e infraestrutura.</p>
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

	<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
		{#each data.services as svc (svc.id)}
			{@const Icon = getIcon(svc.id)}
			{@const enabled = optimisticEnabled[svc.id] ?? svc.enabled}
			{@const dimmed = !enabled}

			<article
				class="surface flex flex-col overflow-hidden p-0 transition-opacity {dimmed ? 'opacity-60' : ''}"
			>
				<!-- Header -->
				<div class="flex items-start justify-between p-5">
					<div class="flex items-center gap-3">
						<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-white/5">
							<Icon size={20} class="text-ink-muted" weight="duotone" />
						</span>
						<div>
							<p class="font-semibold leading-tight text-ink dark:text-bg">{svc.name}</p>
							<p class="mt-0.5 text-xs text-ink-muted">às {fmtCheckedAt(svc.checked_at)}</p>
						</div>
					</div>

					<!-- Status dot + latência -->
					<div class="flex flex-col items-end gap-1">
						<span class="flex items-center gap-1.5">
							<span class="relative flex h-3 w-3">
								{#if svc.status === 'ok' && enabled}
									<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-50"></span>
								{/if}
								<span class="relative inline-flex h-3 w-3 rounded-full ring-2 ring-offset-1 {dotBg[svc.status]} {dotRing[svc.status]}"></span>
							</span>
							<span class="text-xs font-semibold {statusText[svc.status]}">{statusLabel[svc.status]}</span>
						</span>
						{#if svc.latency_ms != null && svc.latency_ms > 0}
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

				<!-- Kill-switch footer -->
				{#if svc.hasKillSwitch}
					<div class="flex items-center justify-between border-t border-primary-100/40 px-5 py-3 dark:border-white/5">
						<span class="text-xs text-ink-muted">Kill-switch</span>
						<button
							type="button"
							onclick={() => requestToggle(svc)}
							aria-label="{enabled ? 'Desabilitar' : 'Ativar'} {svc.name}"
							class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
							       transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
							       {enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-white/20'}"
						>
							<span
								class="pointer-events-none inline-block h-4 w-4 translate-x-0 rounded-full bg-white shadow ring-0
								       transition duration-200 ease-in-out
								       {enabled ? 'translate-x-4' : 'translate-x-0'}"
							></span>
						</button>
					</div>
				{:else}
					<div class="border-t border-primary-100/40 px-5 py-3 dark:border-white/5">
						<p class="text-[11px] text-ink-muted/50 italic">Sem kill-switch</p>
					</div>
				{/if}
			</article>
		{/each}
	</div>
</div>
