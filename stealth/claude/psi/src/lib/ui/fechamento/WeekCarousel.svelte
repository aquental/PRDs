<script lang="ts">
	import { CaretLeft, CaretRight } from 'phosphor-svelte';
	import DayBlock from './DayBlock.svelte';
	import type { AttendanceSession } from './SessionItem.svelte';
	import type { VoiceDecision } from './VoiceAppoint.svelte';

	interface Props {
		sessions: AttendanceSession[];
		selectedMonth: string; // YYYY-MM
		isClosed: boolean;
		onAppoint?: (sessionId: string, status: 'presente' | 'faltou') => void;
		onBulkAppoint?: (date: string) => void;
		onVoiceAppoint?: (decisions: VoiceDecision[]) => void;
	}

	let {
		sessions,
		selectedMonth,
		isClosed,
		onAppoint = (id, status) => console.log('[appoint stub]', id, status),
		onBulkAppoint = (date) => console.log('[bulk appoint stub]', date),
		onVoiceAppoint = () => {}
	}: Props = $props();

	// Today in UTC (matches scheduled_at UTC-date grouping)
	const todayStr = new Date().toISOString().slice(0, 10);

	/**
	 * Returns all 7-day weeks (Mon–Sun) that overlap with the given month.
	 * Each week is an array of YYYY-MM-DD strings.
	 */
	function getWeeks(month: string): string[][] {
		const [year, m] = month.split('-').map(Number);
		const firstOfMonth = new Date(Date.UTC(year, m - 1, 1));
		const lastOfMonth = new Date(Date.UTC(year, m, 0)); // last day of month

		// Find the Monday on or before the 1st
		const dowFirst = firstOfMonth.getUTCDay(); // 0=Sun..6=Sat
		const daysBack = dowFirst === 0 ? 6 : dowFirst - 1;
		const startMonday = new Date(firstOfMonth);
		startMonday.setUTCDate(startMonday.getUTCDate() - daysBack);

		const weeks: string[][] = [];
		const cursor = new Date(startMonday);

		while (cursor <= lastOfMonth) {
			const week: string[] = [];
			for (let i = 0; i < 7; i++) {
				week.push(cursor.toISOString().slice(0, 10));
				cursor.setUTCDate(cursor.getUTCDate() + 1);
			}
			weeks.push(week);
		}

		return weeks;
	}

	function findDefaultWeek(month: string): number {
		const all = getWeeks(month);
		const idx = all.findIndex((w) => w.includes(todayStr));
		return idx >= 0 ? idx : 0;
	}

	const weeks = $derived(getWeeks(selectedMonth));

	// weekIndex: user-navigable state, resets when month changes
	let weekIndex = $state(findDefaultWeek(selectedMonth));
	let _trackedMonth = $state(selectedMonth);

	$effect(() => {
		if (selectedMonth !== _trackedMonth) {
			_trackedMonth = selectedMonth;
			weekIndex = findDefaultWeek(selectedMonth);
		}
	});

	const currentWeek = $derived(weeks[weekIndex] ?? []);

	// Group sessions by UTC date
	const sessionsByDate = $derived(
		sessions.reduce<Record<string, AttendanceSession[]>>((acc, s) => {
			const d = s.scheduled_at.slice(0, 10);
			(acc[d] ??= []).push(s);
			return acc;
		}, {})
	);

	// Expanded days: today is open by default; cleared on week navigation
	let expandedDays = $state<Set<string>>(new Set([todayStr]));

	function goToPrev() {
		if (weekIndex > 0) {
			weekIndex--;
			resetExpanded();
		}
	}

	function goToNext() {
		if (weekIndex < weeks.length - 1) {
			weekIndex++;
			resetExpanded();
		}
	}

	function resetExpanded() {
		const week = weeks[weekIndex] ?? [];
		expandedDays = new Set(week.includes(todayStr) ? [todayStr] : []);
	}

	function toggleDay(dayStr: string) {
		const next = new Set(expandedDays);
		if (next.has(dayStr)) {
			next.delete(dayStr);
		} else {
			next.add(dayStr);
		}
		expandedDays = next;
	}

	// Parse selectedMonth for display
	const MONTHS_PT = [
		'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
		'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
	];

	// Month boundaries for greying out days outside the selected month
	const monthStart = $derived(selectedMonth + '-01');
	const monthEnd = $derived(
		(() => {
			const [y, m] = selectedMonth.split('-').map(Number);
			return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
		})()
	);
</script>

<div class="flex flex-col gap-3">
	<!-- Week navigation header -->
	<div class="flex items-center justify-between">
		<button
			onclick={goToPrev}
			disabled={weekIndex === 0}
			class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-primary-50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/5 dark:hover:text-bg"
			aria-label="Semana anterior"
		>
			<CaretLeft size={14} weight="bold" />
		</button>

		<!-- Dot indicators -->
		<div class="flex items-center gap-1.5" role="tablist" aria-label="Semanas do mês">
			{#each weeks as _, i}
				<button
					onclick={() => {
						weekIndex = i;
						resetExpanded();
					}}
					class="h-1.5 rounded-full transition-all {i === weekIndex
						? 'w-4 bg-primary'
						: 'w-1.5 bg-primary-200 dark:bg-white/20'}"
					role="tab"
					aria-selected={i === weekIndex}
					aria-label="Semana {i + 1}"
				></button>
			{/each}
		</div>

		<button
			onclick={goToNext}
			disabled={weekIndex === weeks.length - 1}
			class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-primary-50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/5 dark:hover:text-bg"
			aria-label="Próxima semana"
		>
			<CaretRight size={14} weight="bold" />
		</button>
	</div>

	<!-- Day blocks for the current week -->
	<div class="flex flex-col gap-2">
		{#each currentWeek as dayStr (dayStr)}
			{@const dayInMonth = dayStr >= monthStart && dayStr <= monthEnd}
			{@const daySessions = sessionsByDate[dayStr] ?? []}
			{@const isToday = dayStr === todayStr}
			{@const isFuture = dayStr > todayStr}

			{#if dayInMonth || daySessions.length > 0}
				<!-- Show days in month, plus days outside month that still have sessions (edge case) -->
				<DayBlock
					{dayStr}
					sessions={daySessions}
					{isClosed}
					{isToday}
					{isFuture}
					expanded={expandedDays.has(dayStr)}
					onToggle={() => toggleDay(dayStr)}
					{onAppoint}
					{onBulkAppoint}
					{onVoiceAppoint}
				/>
			{/if}
		{/each}
	</div>
</div>
