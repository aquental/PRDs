<script lang="ts">
	import { Check, CheckCircle } from 'phosphor-svelte';
	import SessionItem from './SessionItem.svelte';
	import type { AttendanceSession } from './SessionItem.svelte';

	interface Props {
		sessions: AttendanceSession[]; // all month sessions — filtered internally to pending
		isClosed: boolean;
		onAppoint?: (sessionId: string, status: 'presente' | 'faltou') => void;
		onBulkAppoint?: (date: string) => void;
	}

	let {
		sessions,
		isClosed,
		onAppoint = (id, status) => console.log('[appoint stub]', id, status),
		onBulkAppoint = (date) => console.log('[bulk appoint stub]', date)
	}: Props = $props();

	const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
	const MONTHS_SHORT = [
		'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
		'jul', 'ago', 'set', 'out', 'nov', 'dez'
	];

	function dayLabel(dayStr: string): string {
		const d = new Date(dayStr + 'T00:00:00Z');
		return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
	}

	// Filter to sessions that have ended but are not yet appointed, sorted chronologically.
	// nowMs is captured when sessions changes — acceptable for an appointment workflow
	// (sessions don't flip from past to future).
	function buildGroups(all: AttendanceSession[]) {
		const nowMs = Date.now();
		const pending = all
			.filter(
				(s) =>
					s.attendance_status === null &&
					new Date(s.scheduled_at).getTime() + s.duration_minutes * 60_000 < nowMs
			)
			.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

		const map = new Map<string, AttendanceSession[]>();
		for (const s of pending) {
			const d = s.scheduled_at.slice(0, 10);
			const arr = map.get(d);
			if (arr) arr.push(s);
			else map.set(d, [s]);
		}
		return [...map.entries()].map(([dayStr, daySessions]) => ({ dayStr, daySessions }));
	}

	const groups = $derived(buildGroups(sessions));
</script>

{#if groups.length === 0}
	<!-- Empty state: nothing pending -->
	<div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
		<div
			class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30"
		>
			<CheckCircle size={24} weight="fill" class="text-emerald-600 dark:text-emerald-400" />
		</div>
		<div>
			<p class="text-sm font-medium text-ink dark:text-bg">Tudo apontado</p>
			<p class="mt-0.5 text-xs text-ink-muted">Nenhuma sessão pendente neste mês.</p>
		</div>
	</div>
{:else}
	<div class="flex flex-col gap-4">
		{#each groups as { dayStr, daySessions } (dayStr)}
			<div class="rounded-xl border border-primary-100/60 dark:border-white/5">
				<!-- Day header -->
				<div
					class="flex items-center justify-between border-b border-primary-100/40 px-4 py-2.5 dark:border-white/5"
				>
					<span class="text-sm font-medium text-ink dark:text-bg">{dayLabel(dayStr)}</span>
					<span class="text-xs text-amber-600 dark:text-amber-400">
						{daySessions.length}
						{daySessions.length === 1 ? 'pendente' : 'pendentes'}
					</span>
				</div>

				<!-- Sessions -->
				<div class="px-3 pb-2 pt-1.5">
					<div class="flex flex-col gap-0.5" role="rowgroup">
						{#each daySessions as session (session.id)}
							<SessionItem session={session} {isClosed} isFuture={false} {onAppoint} />
						{/each}
					</div>

					<!-- Bulk button: only when >1 pending and month is open -->
					{#if daySessions.length > 1 && !isClosed}
						<button
							onclick={() => onBulkAppoint(dayStr)}
							class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary-100/80 py-1.5 text-xs text-ink-muted transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:hover:border-primary-400/60 dark:hover:text-primary-300"
						>
							<Check size={12} weight="bold" />
							Marcar todas como presente
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}
