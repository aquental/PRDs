<script lang="ts">
	import { Microphone, Buildings, User, CaretDown, Lock, LockOpen } from 'phosphor-svelte';
	import DayMetrics from '$lib/ui/operational/DayMetrics.svelte';
	import PendingRegistrations from '$lib/ui/operational/PendingRegistrations.svelte';
	import BillsToPay from '$lib/ui/operational/BillsToPay.svelte';
	import RepasseCard from '$lib/ui/operational/RepasseCard.svelte';
	import CashFlowSummary from '$lib/ui/operational/CashFlowSummary.svelte';
	import QuickActions from '$lib/ui/operational/QuickActions.svelte';
	import CloseMonthModal from '$lib/ui/operational/CloseMonthModal.svelte';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
		form: { success?: boolean; action?: string; error?: unknown } | null;
	}

	let { data, form }: Props = $props();

	// ── Toast ─────────────────────────────────────────────────
	let toast = $state<string | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	function showToast(msg: string) {
		if (toastTimer) clearTimeout(toastTimer);
		toast = msg;
		toastTimer = setTimeout(() => (toast = null), 3500);
	}

	$effect(() => {
		if (form?.success) {
			if (form.action === 'registerSession') showToast('Sessão registrada com sucesso.');
			else if (form.action === 'markExpensePaid') showToast('Conta marcada como paga.');
			else if (form.action === 'closeMonth') showToast('Mês fechado com sucesso.');
			else if (form.action === 'reopenMonth') showToast('Mês reaberto.');
		}
	});

	// ── Close month modal ──────────────────────────────────────
	let showCloseModal = $state(false);

	// ── Date labels ────────────────────────────────────────────
	const MONTHS_PT = [
		'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
		'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
	];
	const DAYS_PT = [
		'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
		'quinta-feira', 'sexta-feira', 'sábado',
	];

	const todayLabel = $derived.by(() => {
		const [year, month, day] = data.today.split('-').map(Number);
		const d = new Date(year, month - 1, day);
		return `${DAYS_PT[d.getDay()]}, ${day} de ${MONTHS_PT[month - 1]}`;
	});

	const monthLabel = $derived.by(() => {
		const [yr, mo] = data.monthYear.split('-').map(Number);
		return `${MONTHS_PT[mo - 1]} de ${yr}`;
	});

	const tz = $derived(data.clinic?.timezone ?? 'America/Sao_Paulo');

	// ── Session metrics ────────────────────────────────────────
	const pendingSessions = $derived(
		data.todaySessions.filter((s) => s.status === 'scheduled'),
	);
	const completedToday = $derived(
		data.todaySessions.filter((s) => s.status === 'completed').length,
	);
	const cancelledToday = $derived(
		data.todaySessions.filter((s) => s.status === 'cancelled').length,
	);
	const noShowToday = $derived(
		data.todaySessions.filter((s) => s.status === 'no_show').length,
	);
	const todayRevenue = $derived(
		data.todaySessions
			.filter((s) => s.status === 'completed' || s.status === 'no_show')
			.reduce((sum, s) => sum + (s.fee ?? 0), 0),
	);

	// ── Repasse ────────────────────────────────────────────────
	const repasseDisabled = $derived(
		data.clinicOp.repasse_fixo === 0 && data.clinicOp.repasse_percentual === 0,
	);
	const repasseToday = $derived.by(() => {
		if (!data.isClinicMode || repasseDisabled) return 0;
		const { repasse_fixo: fixo, repasse_percentual: perc } = data.clinicOp;
		return data.todaySessions
			.filter((s) => s.status === 'completed' || s.status === 'no_show')
			.reduce((sum, s) => sum + fixo + (perc / 100) * (s.fee ?? 0), 0);
	});

	// ── Bills classification ───────────────────────────────────
	function expenseDueDate(e: (typeof data.expenses)[0]): string | null {
		if (e.frequency === 'one_time') return e.due_date ?? null;
		if (e.due_day) return `${data.monthYear}-${String(e.due_day).padStart(2, '0')}`;
		return null;
	}

	const expensesWithDueDate = $derived(
		data.expenses.map((e) => ({ ...e, dueDate: expenseDueDate(e) })),
	);

	const overdueExpenses = $derived(
		expensesWithDueDate.filter((e) => e.dueDate !== null && e.dueDate < data.today),
	);
	const dueTodayExpenses = $derived(
		expensesWithDueDate.filter((e) => e.dueDate === data.today),
	);
	const dueThisWeekExpenses = $derived(
		expensesWithDueDate.filter(
			(e) => e.dueDate !== null && e.dueDate > data.today && e.dueDate <= data.weekEnd,
		),
	);

	const paidExpenseIds = $derived(
		new Set(data.monthExpenseEntries.map((e) => e.expense_id).filter((id): id is string => id !== null)),
	);

	// ── Month cashflow ─────────────────────────────────────────
	const chargedSessions = $derived(
		data.monthSessions.filter(
			(s) => s.status === 'completed' || s.status === 'no_show',
		),
	);
	const monthSessionCount = $derived(chargedSessions.length);
	const monthRevenue = $derived(
		chargedSessions.reduce((sum, s) => sum + (s.fee ?? 0), 0),
	);
	const monthExpenseTotal = $derived(
		data.monthExpenseEntries.reduce((sum, e) => sum + e.amount, 0),
	);

	// ── Weekly cashflow ────────────────────────────────────────
	const weekRevenue = $derived.by(() => {
		return data.monthSessions
			.filter((s) => {
				if (s.status !== 'completed' && s.status !== 'no_show') return false;
				const d = new Date(s.scheduled_at).toLocaleDateString('sv', { timeZone: tz });
				return d >= data.weekStart && d <= data.weekEnd;
			})
			.reduce((sum, s) => sum + (s.fee ?? 0), 0);
	});

	const weekExpenses = $derived(
		data.monthExpenseEntries
			.filter((e) => e.occurred_at >= data.weekStart && e.occurred_at <= data.weekEnd)
			.reduce((sum, e) => sum + e.amount, 0),
	);

	const weekRepasse = $derived.by(() => {
		if (!data.isClinicMode || repasseDisabled) return 0;
		const { repasse_fixo: fixo, repasse_percentual: perc } = data.clinicOp;
		return data.monthSessions
			.filter((s) => {
				if (s.status !== 'completed' && s.status !== 'no_show') return false;
				const d = new Date(s.scheduled_at).toLocaleDateString('sv', { timeZone: tz });
				return d >= data.weekStart && d <= data.weekEnd;
			})
			.reduce((sum, s) => sum + fixo + (perc / 100) * (s.fee ?? 0), 0);
	});

	const openReceivables = $derived(
		data.monthSessions
			.filter((s) => (s.status === 'completed' || s.status === 'no_show') && !s.paid)
			.reduce((sum, s) => sum + (s.fee ?? 0), 0),
	);

	// ── Month closure ──────────────────────────────────────────
	const isClosed = $derived(data.monthClosure?.status === 'closed');
	const unregisteredCount = $derived(
		data.monthSessions.filter((s) => s.status === 'scheduled').length,
	);
	const unpaidOverdueCount = $derived(
		overdueExpenses.filter((e) => !paidExpenseIds.has(e.id)).length,
	);
</script>

<!-- ── Toast ──────────────────────────────────────────────── -->
{#if toast}
	<div
		role="status"
		aria-live="polite"
		class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-bg shadow-lg dark:bg-bg dark:text-ink"
	>
		{toast}
	</div>
{/if}

<!-- ── Page header ──────────────────────────────────────────── -->
<div class="mb-6 flex items-start justify-between gap-4">
	<div>
		<h1 class="font-heading text-2xl font-bold text-ink dark:text-bg">Operacional</h1>
		<p class="mt-0.5 text-sm capitalize text-ink-muted">{todayLabel}</p>
	</div>
	<div class="relative shrink-0">
		<button
			disabled
			title="Em breve"
			aria-label="Comando por voz — em breve"
			class="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-400 opacity-50 dark:bg-white/5 dark:text-white/40"
		>
			<Microphone size={22} />
		</button>
		<span
			class="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-ink-muted"
		>
			Em breve
		</span>
	</div>
</div>

<!-- ── Context strip (clinic mode) ────────────────────────── -->
{#if data.isClinicMode}
	<div
		class="mb-4 flex items-center gap-2 rounded-xl border border-primary-100/60 bg-primary-50/50 px-4 py-2.5 text-sm dark:border-white/5 dark:bg-white/5"
	>
		<Buildings size={16} class="shrink-0 text-primary" aria-hidden="true" />
		<span class="font-medium text-ink dark:text-bg">{data.clinic?.name}</span>
		<span class="text-ink-muted" aria-hidden="true">·</span>
		<User size={14} class="shrink-0 text-ink-muted" aria-hidden="true" />
		<span class="text-ink-muted">{data.therapist?.name}</span>
		<button
			class="ml-auto flex min-h-[44px] items-center gap-1 text-xs text-ink-muted"
			title="Trocar contexto — em breve"
			disabled
			aria-label="Trocar contexto — em breve"
		>
			<CaretDown size={14} />
		</button>
	</div>
{/if}

<!-- ── Month closed notice ─────────────────────────────────── -->
{#if isClosed}
	<div
		role="alert"
		class="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"
	>
		<Lock size={16} class="shrink-0" aria-hidden="true" />
		<span>Mês de <strong>{monthLabel}</strong> fechado — edições bloqueadas.</span>
		{#if data.monthClosure}
			<form
				method="POST"
				action="?/reopenMonth"
				use:enhance={() => async ({ update }) => { await update(); }}
				class="ml-auto shrink-0"
			>
				<input type="hidden" name="closure_id" value={data.monthClosure.id} />
				<input type="hidden" name="month_year" value={data.monthYear} />
				<button
					type="submit"
					class="flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
					aria-label="Reabrir mês {monthLabel}"
				>
					<LockOpen size={14} />
					Reabrir
				</button>
			</form>
		{/if}
	</div>
{/if}

<!-- ── Main grid ───────────────────────────────────────────── -->
<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">

	<!-- Resumo do dia — right col row 1 on desktop -->
	<div class="lg:col-start-2 lg:row-start-1">
		<DayMetrics
			total={data.todaySessions.length}
			pending={pendingSessions.length}
			completed={completedToday}
			cancelled={cancelledToday}
			noShow={noShowToday}
			revenue={todayRevenue}
			isClinicMode={data.isClinicMode}
			{repasseDisabled}
			{repasseToday}
		/>
	</div>

	<!-- Registros pendentes — left col row 1 on desktop -->
	<div class="lg:col-start-1 lg:row-start-1">
		<PendingRegistrations sessions={pendingSessions} {tz} />
	</div>

	<!-- Contas a pagar — left col row 2 on desktop -->
	<div class="lg:col-start-1 lg:row-start-2">
		<BillsToPay
			overdue={overdueExpenses}
			dueToday={dueTodayExpenses}
			dueThisWeek={dueThisWeekExpenses}
			paidExpenseIds={paidExpenseIds}
			today={data.today}
		/>
	</div>

	<!-- Repasse à clínica — right col row 2 (clinic mode only) -->
	{#if data.isClinicMode}
		<div class="lg:col-start-2 lg:row-start-2">
			<RepasseCard
				fixo={data.clinicOp.repasse_fixo}
				percentual={data.clinicOp.repasse_percentual}
				disabled={repasseDisabled}
				{monthRevenue}
				{monthSessionCount}
				monthYear={data.monthYear}
			/>
		</div>
	{/if}

	<!-- Fluxo de caixa — right col (auto row) -->
	<div class="lg:col-start-2">
		<CashFlowSummary
			{weekRevenue}
			{weekExpenses}
			{openReceivables}
			isClinicMode={data.isClinicMode}
			{repasseDisabled}
			{weekRepasse}
			{monthLabel}
		/>
	</div>

	<!-- Ações rápidas — full width -->
	<div class="lg:col-span-2">
		<QuickActions {isClosed} onCloseMonth={() => (showCloseModal = true)} />
	</div>
</div>

<!-- ── Close month modal ───────────────────────────────────── -->
{#if showCloseModal}
	<CloseMonthModal
		monthYear={data.monthYear}
		{monthLabel}
		{unregisteredCount}
		{unpaidOverdueCount}
		onClose={() => (showCloseModal = false)}
	/>
{/if}
