<script lang="ts">
	import { enhance } from '$app/forms';
	import { Warning, Lock } from 'phosphor-svelte';

	interface Props {
		monthYear: string;
		monthLabel: string;
		unregisteredCount: number;
		unpaidOverdueCount: number;
		onClose: () => void;
	}

	let { monthYear, monthLabel, unregisteredCount, unpaidOverdueCount, onClose }: Props = $props();

	const hasPendencies = $derived(unregisteredCount > 0 || unpaidOverdueCount > 0);
	let acknowledged = $state(false);
	let submitting = $state(false);

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
	onclick={handleBackdropClick}
	role="dialog"
	aria-modal="true"
	aria-labelledby="close-month-title"
	tabindex="-1"
>
	<!-- Panel -->
	<div
		class="surface w-full max-w-md rounded-t-2xl p-6 sm:rounded-2xl"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="mb-4 flex items-center gap-3">
			<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
				<Lock size={20} class="text-amber-700 dark:text-amber-400" />
			</div>
			<div>
				<h2 id="close-month-title" class="text-base font-semibold text-ink dark:text-bg">
					Fechar mês
				</h2>
				<p class="text-sm capitalize text-ink-muted">{monthLabel}</p>
			</div>
		</div>

		<p class="mb-4 text-sm text-ink-muted">
			Fechar o mês bloqueia edições retroativas de sessões e despesas de
			<strong class="capitalize text-ink dark:text-bg">{monthLabel}</strong>.
		</p>

		<!-- Pendencies list -->
		{#if hasPendencies}
			<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/15">
				<p class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
					<Warning size={13} weight="fill" aria-hidden="true" /> Pendências encontradas
				</p>
				<ul class="space-y-1 text-sm text-amber-900 dark:text-amber-300">
					{#if unregisteredCount > 0}
						<li>
							{unregisteredCount} sessão{unregisteredCount !== 1 ? 'ões' : ''} sem registro neste mês
						</li>
					{/if}
					{#if unpaidOverdueCount > 0}
						<li>
							{unpaidOverdueCount} conta{unpaidOverdueCount !== 1 ? 's' : ''} atrasada{unpaidOverdueCount !== 1 ? 's' : ''} sem pagamento
						</li>
					{/if}
				</ul>
			</div>
		{/if}

		<form
			method="POST"
			action="?/closeMonth"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
					onClose();
				};
			}}
			class="space-y-4"
		>
			<input type="hidden" name="month_year" value={monthYear} />

			{#if hasPendencies}
				<label class="flex min-h-[44px] cursor-pointer items-start gap-3">
					<input
						type="checkbox"
						bind:checked={acknowledged}
						class="mt-0.5 h-4 w-4 shrink-0 accent-primary"
						aria-describedby="acknowledge-desc"
					/>
					<span id="acknowledge-desc" class="text-sm text-ink dark:text-bg">
						Entendo que ainda há pendências e quero fechar assim mesmo.
					</span>
				</label>
			{/if}

			<div class="flex gap-3">
				<button
					type="button"
					onclick={onClose}
					class="btn-secondary min-h-[44px] flex-1"
				>
					Cancelar
				</button>
				<button
					type="submit"
					disabled={submitting || (hasPendencies && !acknowledged)}
					class="min-h-[44px] flex-1 rounded-xl bg-amber-600 px-4 py-2.5 font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
				>
					{submitting ? 'Fechando…' : 'Fechar mês'}
				</button>
			</div>
		</form>
	</div>
</div>
