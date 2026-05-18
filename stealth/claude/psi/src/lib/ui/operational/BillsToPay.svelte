<script lang="ts">
	import { enhance } from '$app/forms';
	import { Warning, WarningCircle, ArrowRight, CheckCircle } from 'phosphor-svelte';
	import { formatBRL } from '$lib/utils/format';

	interface Expense {
		id: string;
		description: string;
		amount: number;
		color: string | null;
	}

	interface Props {
		overdue: Expense[];
		dueToday: Expense[];
		dueThisWeek: Expense[];
		paidDescriptions: Set<string>;
		today: string;
	}

	let { overdue, dueToday, dueThisWeek, paidDescriptions, today }: Props = $props();

	let submitting = $state<string | null>(null);

	const hasBills = $derived(overdue.length + dueToday.length + dueThisWeek.length > 0);
</script>

<section class="surface p-5" aria-label="Contas a pagar">
	<header class="mb-4 border-b border-primary-100/60 pb-3 dark:border-white/15">
		<h2 class="text-base font-semibold text-ink dark:text-bg">Contas a pagar</h2>
	</header>

	{#if !hasBills}
		<p class="text-sm text-ink-muted">Nenhuma conta pendente esta semana.</p>
	{:else}
		<div class="space-y-4">
			{#if overdue.length > 0}
				<div>
					<p class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
						<Warning size={13} weight="fill" aria-hidden="true" /> Atrasadas
					</p>
					<ul class="space-y-1.5" aria-label="Contas atrasadas">
						{#each overdue as e (e.id)}
							{@const paid = paidDescriptions.has(e.description)}
							<li class="flex min-h-[44px] items-center gap-2 rounded-lg border border-red-200/60 bg-red-50/60 px-3 py-2 dark:border-red-900/30 dark:bg-red-900/10">
								<div class="min-w-0 flex-1">
									<span class="text-sm text-red-900 dark:text-red-300">{e.description}</span>
								</div>
								<span class="shrink-0 text-sm font-semibold text-red-700 dark:text-red-400">
									{formatBRL(e.amount)}
								</span>
								{#if paid}
									<CheckCircle size={18} class="shrink-0 text-green-600 dark:text-green-400" weight="fill" aria-label="Paga" />
								{:else}
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
										<input type="hidden" name="description" value={e.description} />
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
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if dueToday.length > 0}
				<div>
					<p class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
						<WarningCircle size={13} weight="fill" aria-hidden="true" /> Vence hoje
					</p>
					<ul class="space-y-1.5" aria-label="Contas que vencem hoje">
						{#each dueToday as e (e.id)}
							{@const paid = paidDescriptions.has(e.description)}
							<li class="flex min-h-[44px] items-center gap-2 rounded-lg border border-amber-200/60 bg-amber-50/60 px-3 py-2 dark:border-amber-900/30 dark:bg-amber-900/10">
								<div class="min-w-0 flex-1">
									<span class="text-sm text-amber-900 dark:text-amber-300">{e.description}</span>
								</div>
								<span class="shrink-0 text-sm font-semibold text-amber-700 dark:text-amber-400">
									{formatBRL(e.amount)}
								</span>
								{#if paid}
									<CheckCircle size={18} class="shrink-0 text-green-600 dark:text-green-400" weight="fill" aria-label="Paga" />
								{:else}
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
										<input type="hidden" name="description" value={e.description} />
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
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if dueThisWeek.length > 0}
				<div>
					<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
						Esta semana
					</p>
					<ul class="space-y-1.5" aria-label="Contas que vencem esta semana">
						{#each dueThisWeek as e (e.id)}
							<li class="flex min-h-[44px] items-center justify-between rounded-lg border border-primary-100/40 px-3 py-2 dark:border-white/5">
								<span class="text-sm text-ink dark:text-bg">{e.description}</span>
								<span class="text-sm text-ink-muted">{formatBRL(e.amount)}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}

	<div class="mt-3 border-t border-primary-100/40 pt-3 dark:border-white/5">
		<a
			href="/app/settings"
			class="flex min-h-[44px] items-center gap-1 text-xs text-primary hover:underline"
		>
			Gerenciar despesas <ArrowRight size={12} />
		</a>
	</div>
</section>
