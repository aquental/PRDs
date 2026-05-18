<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { CaretLeft, CaretRight, Lock, LockOpen } from 'phosphor-svelte';

	let { data } = $props();

	const MONTHS_PT = [
		'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
		'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
	];

	function monthLabel(monthYear: string) {
		const [year, month] = monthYear.split('-').map(Number);
		return `${MONTHS_PT[month - 1]} ${year}`;
	}

	function shiftMonth(monthYear: string, delta: number): string {
		const [year, month] = monthYear.split('-').map(Number);
		const d = new Date(Date.UTC(year, month - 1 + delta, 1));
		return d.toISOString().slice(0, 7);
	}

	function navigate(mes: string) {
		const url = new URL(page.url);
		url.searchParams.set('mes', mes);
		goto(url.toString(), { keepFocus: true });
	}

	// Progresso
	const { total, apontadas, pendentes, fechado } = $derived(data.summary);
	const progressPct = $derived(total > 0 ? Math.round((apontadas / total) * 100) : 0);
	const canClose = $derived(pendentes === 0 && !fechado && total > 0);

	// View toggle (Calendário / Só pendentes) — estado preservado em URL
	const currentView = $derived(page.url.searchParams.get('view') ?? 'calendario');

	function toggleView(v: string) {
		const url = new URL(page.url);
		url.searchParams.set('view', v);
		goto(url.toString(), { keepFocus: true });
	}

	// Modal de confirmação do fechamento
	let showCloseModal = $state(false);
	let closing = $state(false);
</script>

<!-- ── Header ─────────────────────────────────────────────────────────────── -->
<div class="mb-6 flex flex-col gap-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<!-- Seletor de mês -->
		<div class="flex items-center gap-1">
			<button
				onclick={() => navigate(shiftMonth(data.selectedMonth, -1))}
				class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-primary-50 hover:text-ink dark:hover:bg-white/5 dark:hover:text-bg"
				aria-label="Mês anterior"
			>
				<CaretLeft size={16} weight="bold" />
			</button>

			<span class="min-w-[10rem] text-center text-base font-semibold text-ink dark:text-bg">
				{monthLabel(data.selectedMonth)}
			</span>

			<button
				onclick={() => navigate(shiftMonth(data.selectedMonth, 1))}
				class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-primary-50 hover:text-ink dark:hover:bg-white/5 dark:hover:text-bg"
				aria-label="Próximo mês"
			>
				<CaretRight size={16} weight="bold" />
			</button>
		</div>

		<!-- Ações do header -->
		<div class="flex items-center gap-2">
			<!-- Toggle Calendário / Só pendentes -->
			<div
				class="flex rounded-lg border border-primary-100/70 p-0.5 text-sm dark:border-white/10"
				role="group"
				aria-label="Alternar visualização"
			>
				<button
					onclick={() => toggleView('calendario')}
					class="rounded-md px-3 py-1 transition-colors {currentView === 'calendario'
						? 'bg-primary text-white'
						: 'text-ink-muted hover:text-ink dark:hover:text-bg'}"
					aria-pressed={currentView === 'calendario'}
				>
					Calendário
				</button>
				<button
					onclick={() => toggleView('pendentes')}
					class="rounded-md px-3 py-1 transition-colors {currentView === 'pendentes'
						? 'bg-primary text-white'
						: 'text-ink-muted hover:text-ink dark:hover:text-bg'}"
					aria-pressed={currentView === 'pendentes'}
				>
					Só pendentes
					{#if pendentes > 0}
						<span class="ml-1 text-xs font-semibold text-amber-500">({pendentes})</span>
					{/if}
				</button>
			</div>

			<!-- Fechar mês / Reabrir -->
			{#if fechado}
				<form method="POST" action="?/reopenMonth" use:enhance>
					<input type="hidden" name="closure_id" value={data.closure?.id ?? ''} />
					<button
						type="submit"
						class="flex items-center gap-1.5 rounded-lg border border-primary-200 px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:hover:border-primary-400 dark:hover:text-primary-300"
					>
						<LockOpen size={15} />
						Reabrir mês
					</button>
				</form>
			{:else}
				<div class="relative" title={!canClose ? `Faltam ${pendentes} apontamento(s)` : ''}>
					<button
						onclick={() => (showCloseModal = true)}
						disabled={!canClose}
						class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
							{canClose
								? 'bg-primary text-white hover:bg-primary/90'
								: 'cursor-not-allowed bg-primary-100/60 text-ink-muted dark:bg-white/5'}"
						aria-disabled={!canClose}
					>
						<Lock size={15} weight={canClose ? 'fill' : 'regular'} />
						Fechar mês
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Barra de progresso -->
	<div class="space-y-1.5">
		<div class="flex items-center justify-between text-xs text-ink-muted">
			<span>
				{apontadas} de {total} sessão{total !== 1 ? 'ões' : ''} apontada{apontadas !== 1 ? 's' : ''}
				{#if pendentes > 0}
					· <span class="font-medium text-amber-600 dark:text-amber-400">{pendentes} pendente{pendentes !== 1 ? 's' : ''}</span>
				{:else if total > 0}
					· <span class="font-medium text-emerald-600 dark:text-emerald-400">Tudo apontado</span>
				{/if}
			</span>
			<span class="font-medium">{progressPct}%</span>
		</div>

		<div
			class="h-2 w-full overflow-hidden rounded-full bg-primary-100/60 dark:bg-white/10"
			role="progressbar"
			aria-valuenow={progressPct}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label="Progresso de apontamentos"
		>
			<div
				class="h-full rounded-full transition-all duration-500
					{progressPct === 100
						? 'bg-emerald-500'
						: progressPct > 0
							? 'bg-primary'
							: 'bg-primary/30'}"
				style="width: {progressPct}%"
			></div>
		</div>
	</div>

	<!-- Banner: mês fechado -->
	{#if fechado && data.closure?.closed_at}
		<div
			class="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300"
			role="status"
		>
			<Lock size={15} weight="fill" class="shrink-0" />
			Mês fechado em
			{new Date(data.closure.closed_at).toLocaleDateString('pt-BR', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric'
			})}
		</div>
	{/if}
</div>

<!-- ── Corpo ───────────────────────────────────────────────────────────────── -->
<div class="min-h-[24rem]">
	{#if total === 0}
		<!-- Estado vazio -->
		<div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
			<p class="text-sm font-medium text-ink dark:text-bg">Nenhuma sessão neste mês</p>
			<p class="text-xs text-ink-muted">Sessões canceladas não aparecem na fila de apontamento.</p>
		</div>
	{:else}
		<!-- Placeholder — visualização implementada na Fase 5 -->
		<div
			class="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary-200/70 py-20 text-center dark:border-white/10"
		>
			<p class="text-sm text-ink-muted">
				Visualização {currentView === 'pendentes' ? '"Só pendentes"' : 'calendário'} — em construção
			</p>
			<p class="text-xs text-ink-muted/60">({total} sessões · {apontadas} apontadas · {pendentes} pendentes)</p>
		</div>
	{/if}
</div>

<!-- ── Modal: confirmar fechamento ────────────────────────────────────────── -->
{#if showCloseModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<div class="w-full max-w-md rounded-2xl bg-bg p-6 shadow-xl dark:bg-bg-dark">
			<h2 id="modal-title" class="mb-2 text-base font-semibold text-ink dark:text-bg">
				Fechar {monthLabel(data.selectedMonth)}?
			</h2>
			<p class="mb-6 text-sm text-ink-muted">
				Esta ação consolida os apontamentos e dispara o cálculo do faturamento.
				Você não poderá editar apontamentos após o fechamento.
			</p>

			<div class="flex justify-end gap-2">
				<button
					onclick={() => (showCloseModal = false)}
					class="rounded-lg px-4 py-2 text-sm text-ink-muted transition-colors hover:bg-primary-50/60 dark:hover:bg-white/5 dark:hover:text-bg"
				>
					Cancelar
				</button>

				<form
					method="POST"
					action="?/closeMonth"
					use:enhance={() => {
						closing = true;
						return async ({ update }) => {
							await update();
							closing = false;
							showCloseModal = false;
						};
					}}
				>
					<input type="hidden" name="month_year" value={data.selectedMonth} />
					<button
						type="submit"
						disabled={closing}
						class="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
					>
						<Lock size={14} weight="fill" />
						{closing ? 'Fechando…' : 'Confirmar fechamento'}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
