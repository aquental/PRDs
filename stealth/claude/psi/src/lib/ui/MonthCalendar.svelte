<script lang="ts">
	export interface CalendarExpense {
		description: string;
		color: string;
		amount: number;
	}

	interface Props {
		year: number;
		month: number; // 1–12
		today: string; // 'YYYY-MM-DD'
		holidays: { day: number; name: string }[];
		expenseDays: Record<number, CalendarExpense[]>;
	}

	let { year, month, today, holidays, expenseDays }: Props = $props();

	const MONTHS = [
		'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
		'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
	];
	const DOW_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

	const todayDate = $derived(new Date(today + 'T00:00:00'));

	// Current-week range (Sun–Sat)
	const weekStart = $derived(
		new Date(todayDate.getTime() - todayDate.getDay() * 86_400_000)
	);
	const weekEnd = $derived(
		new Date(todayDate.getTime() + (6 - todayDate.getDay()) * 86_400_000)
	);

	const daysInMonth = $derived(new Date(year, month, 0).getDate());

	// Grid: null for padding cells, number for days
	const weeks = $derived.by(() => {
		const startDow = new Date(year, month - 1, 1).getDay();
		const cells: (number | null)[] = [
			...Array<null>(startDow).fill(null),
			...Array.from({ length: daysInMonth }, (_, i) => i + 1)
		];
		while (cells.length % 7 !== 0) cells.push(null);
		const rows: (number | null)[][] = [];
		for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
		return rows;
	});

	const holidayMap = $derived(new Map(holidays.map((h) => [h.day, h.name])));

	function isToday(day: number): boolean {
		return (
			year === todayDate.getFullYear() &&
			month === todayDate.getMonth() + 1 &&
			day === todayDate.getDate()
		);
	}

	function inCurrentWeek(day: number): boolean {
		const d = new Date(year, month - 1, day);
		return d >= weekStart && d <= weekEnd;
	}

	function titleFor(day: number, holidayName: string | undefined): string {
		const parts: string[] = [];
		if (holidayName) parts.push(holidayName);
		const exps = expenseDays[day];
		if (exps?.length) parts.push(exps.map((e) => e.description).join(', '));
		return parts.join(' · ');
	}
</script>

<div class="select-none">
	<!-- Month + year header -->
	<p class="mb-3 text-center text-sm font-semibold text-ink dark:text-bg">
		{MONTHS[month - 1]}/{year}
	</p>

	<!-- Day-of-week headers -->
	<div class="mb-1 grid grid-cols-7">
		{#each DOW_LABELS as h}
			<div class="py-0.5 text-center text-[11px] font-medium text-ink-muted">{h}</div>
		{/each}
	</div>

	<!-- Weeks -->
	{#each weeks as week}
		<div class="grid grid-cols-7">
			{#each week as day}
				<div class="flex justify-center py-[3px]">
					{#if day !== null}
						{@const holidayName = holidayMap.get(day)}
						{@const todayMark = isToday(day)}
						{@const weekMark = inCurrentWeek(day)}
						{@const expColor = expenseDays[day]?.[0]?.color ?? null}
						{@const cellTitle = titleFor(day, holidayName)}
						<span
							class="inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] leading-none
							       {todayMark ? 'font-bold ring-2 ring-offset-1 ring-ink dark:ring-bg' : ''}
							       {holidayName ? 'italic text-ink-muted/60 dark:text-bg/50' : 'text-ink dark:text-bg'}
							       {weekMark ? 'underline underline-offset-2' : ''}"
							style={expColor ? `background-color:${expColor}` : ''}
							title={cellTitle || undefined}
						>{day}</span>
					{:else}
						<span class="h-7 w-7"></span>
					{/if}
				</div>
			{/each}
		</div>
	{/each}
</div>
