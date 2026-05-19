<script lang="ts">
	import { CheckCircle, Users, Check } from 'phosphor-svelte';
	import SessionItem from './SessionItem.svelte';
	import type { AttendanceSession } from './SessionItem.svelte';

	interface Props {
		dayStr: string; // YYYY-MM-DD (UTC date)
		sessions: AttendanceSession[];
		isClosed: boolean;
		isToday: boolean;
		isFuture: boolean;
		expanded?: boolean;
		onToggle?: () => void;
		onAppoint?: (sessionId: string, status: 'presente' | 'faltou') => void;
		onBulkAppoint?: (date: string) => void;
	}

	let {
		dayStr,
		sessions,
		isClosed,
		isToday,
		isFuture,
		expanded = false,
		onToggle = () => {},
		onAppoint = (id, status) => console.log('[appoint stub]', id, status),
		onBulkAppoint = (date) => console.log('[bulk appoint stub]', date)
	}: Props = $props();

	const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
	const MONTHS_SHORT = [
		'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
		'jul', 'ago', 'set', 'out', 'nov', 'dez'
	];

	// Use UTC methods so the label matches the UTC date stored in scheduled_at
	const dateUtc = $derived(new Date(dayStr + 'T00:00:00Z'));
	const dateLabel = $derived(
		`${WEEKDAYS[dateUtc.getUTCDay()]}, ${dateUtc.getUTCDate()} ${MONTHS_SHORT[dateUtc.getUTCMonth()]}`
	);

	const pendingCount = $derived(sessions.filter((s) => s.attendance_status === null).length);
	const allDone = $derived(sessions.length > 0 && pendingCount === 0);
	// Bulk button: only when day has ended, month is open, and there are pending sessions
	const hasBulkCandidate = $derived(!isFuture && !isClosed && pendingCount > 0);
</script>

<div
	class="overflow-hidden rounded-xl border transition-colors
		{isToday
		? 'border-primary/40 dark:border-primary-400/30'
		: 'border-primary-100/60 dark:border-white/5'}
		{isFuture ? 'opacity-60' : sessions.length === 0 && !isToday ? 'opacity-40 dark:opacity-30' : ''}"
>
	{#if sessions.length === 0}
		<!-- Non-interactive: day has no sessions; no expand/collapse needed -->
		<div class="flex items-center gap-3 px-4 py-2.5">
			{#if isToday}
				<span class="h-5 w-0.5 shrink-0 rounded-full bg-primary" aria-hidden="true"></span>
			{/if}
			<span class="flex-1 text-sm font-medium {isFuture ? 'text-ink-muted' : 'text-ink dark:text-bg'}">
				{dateLabel}
				{#if isToday}
					<span class="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Hoje</span>
				{/if}
			</span>
			<span class="text-xs text-ink-muted/50">Sem sessões</span>
		</div>
	{:else}
		<!-- Interactive header — expand/collapse -->
		<button
			onclick={onToggle}
			class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-50/40 dark:hover:bg-white/[0.02]"
			aria-expanded={expanded}
			aria-label="{dateLabel}: {allDone
				? `${sessions.length} ${sessions.length === 1 ? 'sessão apontada' : 'sessões apontadas'}`
				: pendingCount > 0
					? `${pendingCount} ${pendingCount === 1 ? 'sessão pendente' : 'sessões pendentes'} de ${sessions.length}`
					: `${sessions.length} ${sessions.length === 1 ? 'sessão futura' : 'sessões futuras'}`}"
		>
			{#if isToday}
				<span class="h-5 w-0.5 shrink-0 rounded-full bg-primary" aria-hidden="true"></span>
			{/if}

			<span class="flex-1 text-sm font-medium {isFuture ? 'text-ink-muted' : 'text-ink dark:text-bg'}">
				{dateLabel}
				{#if isToday}
					<span class="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Hoje</span>
				{/if}
			</span>

			<!-- Right summary chip -->
			{#if allDone}
				<span class="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
					<CheckCircle size={13} weight="fill" />
					{sessions.length}
					{sessions.length === 1 ? 'apontada' : 'apontadas'}
				</span>
			{:else}
				<span class="flex items-center gap-1 text-xs text-ink-muted">
					<Users size={13} />
					{sessions.length}
					{sessions.length === 1 ? 'sessão' : 'sessões'}
					{#if pendingCount > 0 && !isFuture}
						·&nbsp;<span class="font-medium text-amber-600 dark:text-amber-400"
							>{pendingCount} {pendingCount === 1 ? 'pendente' : 'pendentes'}</span
						>
					{/if}
				</span>
			{/if}

			<!-- Chevron -->
			<svg
				class="h-4 w-4 shrink-0 text-ink-muted/50 transition-transform {expanded ? 'rotate-180' : ''}"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		<!-- Body — shown when expanded -->
		{#if expanded}
			<div class="border-t border-primary-100/40 px-3 pb-3 pt-2 dark:border-white/5">
				<div class="flex flex-col gap-0.5" role="rowgroup">
					{#each sessions as session (session.id)}
						<SessionItem {session} {isClosed} {isFuture} {onAppoint} />
					{/each}
				</div>

				{#if hasBulkCandidate}
					<button
						onclick={() => onBulkAppoint(dayStr)}
						class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary-100/80 py-1.5 text-xs text-ink-muted transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:hover:border-primary-400/60 dark:hover:text-primary-300"
					>
						<Check size={12} weight="bold" />
						Marcar todas como presente
					</button>
				{/if}
			</div>
		{/if}
	{/if}
</div>
