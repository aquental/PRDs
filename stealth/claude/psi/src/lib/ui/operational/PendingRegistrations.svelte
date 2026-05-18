<script lang="ts">
	import { enhance } from '$app/forms';
	import { CheckCircle, ArrowRight } from 'phosphor-svelte';
	import { formatBRL } from '$lib/utils/format';

	interface Session {
		id: string;
		scheduled_at: string;
		fee: number | null;
		patients: { name: string }[] | null;
	}

	interface Props {
		sessions: Session[];
		tz: string;
	}

	let { sessions, tz }: Props = $props();

	let submitting = $state<string | null>(null);

	function sessionTime(scheduledAt: string): string {
		return new Date(scheduledAt).toLocaleTimeString('pt-BR', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: tz,
		});
	}

	function patientName(session: Session): string {
		return (session.patients as { name: string }[] | null)?.[0]?.name ?? 'Paciente';
	}
</script>

{#if sessions.length === 0}
	<div
		class="flex min-h-[44px] items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm dark:border-green-900/40 dark:bg-green-900/15"
		role="status"
	>
		<CheckCircle size={18} class="shrink-0 text-green-600 dark:text-green-400" weight="fill" />
		<span class="text-green-800 dark:text-green-300">Tudo registrado hoje</span>
		<a
			href="/app/sessions"
			class="ml-auto flex min-h-[44px] items-center gap-1 text-xs text-green-700 hover:underline dark:text-green-400"
		>
			ver histórico <ArrowRight size={12} />
		</a>
	</div>
{:else}
	<section class="surface p-5" aria-label="Registros pendentes">
		<header class="mb-4 flex items-center justify-between border-b border-primary-100/60 pb-3 dark:border-white/15">
			<h2 class="text-base font-semibold text-ink dark:text-bg">Registros pendentes</h2>
			<span
				class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
				aria-label="{sessions.length} sessões pendentes"
			>
				{sessions.length}
			</span>
		</header>

		<ul class="space-y-3">
			{#each sessions as session (session.id)}
				{@const name = patientName(session)}
				<li class="rounded-lg border border-primary-100/40 bg-primary-50/30 p-3 dark:border-white/5 dark:bg-white/5">
					<div class="mb-2.5 flex items-center justify-between gap-2">
						<div class="min-w-0">
							<p class="truncate text-sm font-medium text-ink dark:text-bg">{name}</p>
							<p class="text-xs text-ink-muted">{sessionTime(session.scheduled_at)}</p>
						</div>
						<span class="shrink-0 text-sm font-medium text-ink dark:text-bg">
							{formatBRL(session.fee ?? 0)}
						</span>
					</div>

					<form
						method="POST"
						use:enhance={() => {
							submitting = session.id;
							return async ({ update }) => {
								await update();
								submitting = null;
							};
						}}
						class="flex gap-2"
					>
						<input type="hidden" name="session_id" value={session.id} />
						<button
							formaction="?/registerSession"
							name="status"
							value="completed"
							disabled={submitting === session.id}
							aria-label="Marcar {name} como realizada"
							class="min-h-[44px] flex-1 rounded-lg bg-green-600 px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
						>
							Realizada
						</button>
						<button
							formaction="?/registerSession"
							name="status"
							value="no_show"
							disabled={submitting === session.id}
							aria-label="Marcar {name} como falta"
							class="min-h-[44px] flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
						>
							Falta
						</button>
						<button
							formaction="?/registerSession"
							name="status"
							value="cancelled"
							disabled={submitting === session.id}
							aria-label="Marcar {name} como abono"
							class="min-h-[44px] flex-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
						>
							Abono
						</button>
					</form>
				</li>
			{/each}
		</ul>

		<div class="mt-3 border-t border-primary-100/40 pt-3 dark:border-white/5">
			<a
				href="/app/sessions"
				class="flex min-h-[44px] items-center gap-1 text-xs text-primary hover:underline"
			>
				Ver todas as sessões <ArrowRight size={12} />
			</a>
		</div>
	</section>
{/if}
