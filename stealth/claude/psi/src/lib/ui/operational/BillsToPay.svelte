<script lang="ts">
	import { enhance } from '$app/forms';
	import { Warning, WarningCircle, ArrowRight, X, CheckCircle } from 'phosphor-svelte';
	import { formatBRL } from '$lib/utils/format';

	interface Expense {
		id: string;
		description: string;
		amount: number;
		color: string | null;
		dueDate: string | null;
	}

	function formatDueDate(dateStr: string): string {
		const [yr, mo, day] = dateStr.split('-').map(Number);
		return new Date(yr, mo - 1, day)
			.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
			.replace('.', '');
	}

	function dayDiff(dueDate: string, today: string): number {
		const [dy, dm, dd] = dueDate.split('-').map(Number);
		const [ty, tm, td] = today.split('-').map(Number);
		return Math.round(
			(new Date(dy, dm - 1, dd).getTime() - new Date(ty, tm - 1, td).getTime()) / 86_400_000,
		);
	}

	interface Props {
		overdue: Expense[];
		dueToday: Expense[];
		dueThisWeek: Expense[];
		paidExpenseIds: Set<string>;
		/** expense_id → occurred_at (YYYY-MM-DD) for entries paid this month */
		paidEntries: Map<string, string>;
		today: string;
	}

	let { overdue, dueToday, dueThisWeek, paidExpenseIds, paidEntries, today }: Props = $props();

	let submitting = $state<string | null>(null);
	let showPaidModal = $state(false);

	const paidBills = $derived(
		[...overdue, ...dueToday, ...dueThisWeek]
			.filter((e) => paidExpenseIds.has(e.id))
			.map((e) => ({ ...e, paidAt: paidEntries.get(e.id) ?? null }))
			.sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? '')),
	);

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) showPaidModal = false;
	}

	function handleModalKeydown(e: KeyboardEvent) {
		if (showPaidModal && e.key === 'Escape') showPaidModal = false;
	}

	const unpaidOverdue = $derived(overdue.filter((e) => !paidExpenseIds.has(e.id)));
	const unpaidDueToday = $derived(dueToday.filter((e) => !paidExpenseIds.has(e.id)));
	const unpaidDueThisWeek = $derived(dueThisWeek.filter((e) => !paidExpenseIds.has(e.id)));

	const paidCount = $derived(
		[...overdue, ...dueToday, ...dueThisWeek].filter((e) => paidExpenseIds.has(e.id)).length,
	);

	const hasBills = $derived(
		unpaidOverdue.length + unpaidDueToday.length + unpaidDueThisWeek.length > 0,
	);
</script>

<svelte:window onkeydown={handleModalKeydown} />

<section class="surface p-5" aria-label="Contas a pagar">
	<header class="mb-4 flex items-center justify-between border-b border-primary-100/60 pb-3 dark:border-white/15">
		<h2 class="text-base font-semibold text-ink dark:text-bg">Contas a pagar</h2>
		{#if paidCount > 0}
			<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
				{paidCount} {paidCount === 1 ? 'paga' : 'pagas'}
			</span>
		{/if}
	</header>

	{#if !hasBills && paidCount === 0}
		<p class="text-sm text-ink-muted">Nenhuma conta pendente esta semana.</p>
	{:else if !hasBills}
		<p class="text-sm text-ink-muted">Todas as contas desta semana estão pagas.</p>
	{:else}
		<div class="space-y-4">
			{#if unpaidOverdue.length > 0}
				<div>
					<p class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
						<Warning size={13} weight="fill" aria-hidden="true" /> Atrasadas
					</p>
					<ul class="space-y-1.5" aria-label="Contas atrasadas">
						{#each unpaidOverdue as e (e.id)}
							<li class="flex min-h-[44px] items-center gap-2 rounded-lg border border-red-200/60 bg-red-50/60 px-3 py-2 dark:border-red-900/30 dark:bg-red-900/10">
								<div class="min-w-0 flex-1">
									<span class="text-sm text-red-900 dark:text-red-300">{e.description}</span>
									{#if e.dueDate}
										{@const diff = dayDiff(e.dueDate, today)}
										<p class="mt-0.5 text-xs text-ink-muted">
											{formatDueDate(e.dueDate)}<span class="ml-1">({diff > 0 ? '+' : ''}{diff})</span>
										</p>
									{/if}
								</div>
								<span class="shrink-0 text-sm font-semibold text-red-700 dark:text-red-400">
									{formatBRL(e.amount)}
								</span>
								<form
									method="POST"
									action="?/markExpensePaid"
									use:enhance={() => {
										submitting = e.id;
										return async ({ update }) => {
											await update();
											submitting = null;
										};
									}}
								>
									<input type="hidden" name="expense_id" value={e.id} />
									<input type="hidden" name="amount" value={e.amount} />
									<input type="hidden" name="today" value={today} />
									<button
										type="submit"
										disabled={submitting === e.id}
										class="min-h-[44px] rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-transparent dark:text-red-400"
									>
										Marcar paga
									</button>
								</form>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if unpaidDueToday.length > 0}
				<div>
					<p class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
						<WarningCircle size={13} weight="fill" aria-hidden="true" /> Vence hoje
					</p>
					<ul class="space-y-1.5" aria-label="Contas que vencem hoje">
						{#each unpaidDueToday as e (e.id)}
							<li class="flex min-h-[44px] items-center gap-2 rounded-lg border border-amber-200/60 bg-amber-50/60 px-3 py-2 dark:border-amber-900/30 dark:bg-amber-900/10">
								<div class="min-w-0 flex-1">
									<span class="text-sm text-amber-900 dark:text-amber-300">{e.description}</span>
									{#if e.dueDate}
										{@const diff = dayDiff(e.dueDate, today)}
										<p class="mt-0.5 text-xs text-ink-muted">
											{formatDueDate(e.dueDate)}<span class="ml-1">({diff > 0 ? '+' : ''}{diff})</span>
										</p>
									{/if}
								</div>
								<span class="shrink-0 text-sm font-semibold text-amber-700 dark:text-amber-400">
									{formatBRL(e.amount)}
								</span>
								<form
									method="POST"
									action="?/markExpensePaid"
									use:enhance={() => {
										submitting = e.id;
										return async ({ update }) => {
											await update();
											submitting = null;
										};
									}}
								>
									<input type="hidden" name="expense_id" value={e.id} />
									<input type="hidden" name="amount" value={e.amount} />
									<input type="hidden" name="today" value={today} />
									<button
										type="submit"
										disabled={submitting === e.id}
										class="min-h-[44px] rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50 dark:border-amber-700 dark:bg-transparent dark:text-amber-400"
									>
										Marcar paga
									</button>
								</form>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if unpaidDueThisWeek.length > 0}
				<div>
					<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
						Esta semana
					</p>
					<ul class="space-y-1.5" aria-label="Contas que vencem esta semana">
						{#each unpaidDueThisWeek as e (e.id)}
							<li class="flex min-h-[44px] items-center gap-2 rounded-lg border border-primary-100/40 px-3 py-2 dark:border-white/5">
								<div class="min-w-0 flex-1">
									<span class="text-sm text-ink dark:text-bg">{e.description}</span>
									{#if e.dueDate}
										{@const diff = dayDiff(e.dueDate, today)}
										<p class="mt-0.5 text-xs text-ink-muted">
											{formatDueDate(e.dueDate)}<span class="ml-1">({diff > 0 ? '+' : ''}{diff})</span>
										</p>
									{/if}
								</div>
								<span class="shrink-0 text-sm text-ink-muted">{formatBRL(e.amount)}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}

	<div class="mt-3 flex items-center justify-between border-t border-primary-100/40 pt-3 dark:border-white/5">
		<a
			href="/app/settings"
			class="flex min-h-[44px] items-center gap-1 text-xs text-primary hover:underline"
		>
			Gerenciar despesas <ArrowRight size={12} />
		</a>
		{#if paidCount > 0}
			<button
				type="button"
				onclick={() => (showPaidModal = true)}
				class="flex min-h-[44px] items-center gap-1.5 text-xs text-ink-muted hover:text-ink dark:hover:text-bg"
				aria-label="Ver {paidCount} {paidCount === 1 ? 'conta paga' : 'contas pagas'} esta semana"
			>
				Ver pagas
				<span class="rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-green-700 dark:bg-green-900/30 dark:text-green-400">
					{paidCount}
				</span>
			</button>
		{/if}
	</div>
</section>

{#if showPaidModal}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="paid-bills-title"
		tabindex="-1"
	>
		<!-- Panel -->
		<div
			class="surface w-full max-w-md rounded-t-2xl p-6 sm:rounded-2xl"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="mb-4 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
						<CheckCircle size={20} class="text-green-700 dark:text-green-400" weight="fill" />
					</div>
					<div>
						<h2 id="paid-bills-title" class="text-base font-semibold text-ink dark:text-bg">
							Contas pagas
						</h2>
						<p class="text-sm text-ink-muted">Esta semana</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (showPaidModal = false)}
					class="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-primary-50 hover:text-ink dark:hover:bg-white/10 dark:hover:text-bg"
					aria-label="Fechar"
				>
					<X size={18} />
				</button>
			</div>

			<ul class="space-y-2">
				{#each paidBills as bill (bill.id)}
					<li class="flex min-h-[44px] items-center gap-3 rounded-lg border border-primary-100/40 px-3 py-2 dark:border-white/5">
						<CheckCircle size={16} class="shrink-0 text-green-600 dark:text-green-400" weight="fill" aria-hidden="true" />
						<div class="min-w-0 flex-1">
							<span class="text-sm text-ink dark:text-bg">{bill.description}</span>
							{#if bill.paidAt}
								<p class="mt-0.5 text-xs text-ink-muted">
									pago em {formatDueDate(bill.paidAt)}
								</p>
							{/if}
						</div>
						<span class="shrink-0 text-sm font-semibold text-green-700 dark:text-green-400">
							{formatBRL(bill.amount)}
						</span>
					</li>
				{/each}
			</ul>

			<div class="mt-4">
				<button
					type="button"
					onclick={() => (showPaidModal = false)}
					class="btn-secondary min-h-[44px] w-full"
				>
					Fechar
				</button>
			</div>
		</div>
	</div>
{/if}
