<script lang="ts">
	import {
		Microphone,
		Buildings,
		User,
		CaretDown,
		CheckCircle,
		WarningCircle,
		Warning,
		ArrowRight,
		Receipt,
		CalendarBlank,
		Gear,
		Lock,
	} from 'phosphor-svelte';
	import { formatBRL } from '$lib/utils/format';
	import Card from '$lib/ui/Card.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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

	function sessionTime(scheduledAt: string): string {
		return new Date(scheduledAt).toLocaleTimeString('pt-BR', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: tz,
		});
	}

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

	// ── Bills ──────────────────────────────────────────────────
	function expenseDueDate(e: (typeof data.expenses)[0]): string | null {
		if (e.frequency === 'one_time') return e.due_date ?? null;
		if (e.due_day) return `${data.monthYear}-${String(e.due_day).padStart(2, '0')}`;
		return null;
	}

	const overdueExpenses = $derived(
		data.expenses.filter((e) => {
			const d = expenseDueDate(e);
			return d !== null && d < data.today;
		}),
	);
	const dueTodayExpenses = $derived(
		data.expenses.filter((e) => expenseDueDate(e) === data.today),
	);
	const dueThisWeekExpenses = $derived(
		data.expenses.filter((e) => {
			const d = expenseDueDate(e);
			return d !== null && d > data.today && d <= data.weekEnd;
		}),
	);
	const hasBills = $derived(
		overdueExpenses.length + dueTodayExpenses.length + dueThisWeekExpenses.length > 0,
	);

	// ── Month cashflow ─────────────────────────────────────────
	const monthRevenue = $derived(
		data.monthSessions
			.filter((s) => s.status === 'completed' || s.status === 'no_show')
			.reduce((sum, s) => sum + (s.fee ?? 0), 0),
	);
	const monthExpenses = $derived(
		data.monthExpenseEntries.reduce((sum, e) => sum + e.amount, 0),
	);
	const monthNet = $derived(monthRevenue - monthExpenses);

	// ── Month closure ──────────────────────────────────────────
	const isClosed = $derived(data.monthClosure?.status === 'closed');
</script>

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
		<Buildings size={16} class="shrink-0 text-primary" />
		<span class="font-medium text-ink dark:text-bg">{data.clinic?.name}</span>
		<span class="text-ink-muted">·</span>
		<User size={14} class="shrink-0 text-ink-muted" />
		<span class="text-ink-muted">{data.therapist?.name}</span>
		<button
			class="ml-auto flex items-center gap-1 text-xs text-ink-muted hover:text-ink dark:hover:text-bg"
			title="Trocar contexto"
			disabled
		>
			<CaretDown size={14} />
		</button>
	</div>
{/if}

<!-- ── Month closed notice ─────────────────────────────────── -->
{#if isClosed}
	<div
		class="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"
	>
		<Lock size={16} class="shrink-0" />
		<span>Mês de <strong>{monthLabel}</strong> fechado — edições bloqueadas.</span>
	</div>
{/if}

<!-- ── Main grid ───────────────────────────────────────────── -->
<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">

	<!-- Resumo do dia — right col row 1 on desktop -->
	<div class="lg:col-start-2 lg:row-start-1">
		<Card title="Resumo do dia">
			<div class="grid grid-cols-2 gap-4">
				<div class="rounded-lg bg-primary-50/60 p-3 dark:bg-white/5">
					<p class="text-xs text-ink-muted">Sessões hoje</p>
					<p class="mt-1 text-2xl font-bold text-ink dark:text-bg">
						{data.todaySessions.length}
					</p>
					<p class="mt-0.5 text-xs text-ink-muted">
						{pendingSessions.length} pendente{pendingSessions.length !== 1 ? 's' : ''}
					</p>
				</div>
				<div class="rounded-lg bg-primary-50/60 p-3 dark:bg-white/5">
					<p class="text-xs text-ink-muted">Saldo do dia</p>
					<p class="mt-1 text-2xl font-bold text-ink dark:text-bg">
						{formatBRL(todayRevenue)}
					</p>
					{#if data.isClinicMode && !repasseDisabled}
						<p class="mt-0.5 text-xs text-ink-muted">
							líquido: {formatBRL(todayRevenue - repasseToday)}
						</p>
					{/if}
				</div>
			</div>

			{#if data.todaySessions.length > 0}
				<div class="mt-3 flex flex-wrap gap-2">
					{#if completedToday > 0}
						<span class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
							{completedToday} realizada{completedToday !== 1 ? 's' : ''}
						</span>
					{/if}
					{#if pendingSessions.length > 0}
						<span class="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
							{pendingSessions.length} agendada{pendingSessions.length !== 1 ? 's' : ''}
						</span>
					{/if}
					{#if cancelledToday > 0}
						<span class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
							{cancelledToday} cancelada{cancelledToday !== 1 ? 's' : ''}
						</span>
					{/if}
					{#if noShowToday > 0}
						<span class="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
							{noShowToday} falta{noShowToday !== 1 ? 's' : ''}
						</span>
					{/if}
				</div>
			{/if}
		</Card>
	</div>

	<!-- Registros pendentes — left col row 1 on desktop -->
	<div class="lg:col-start-1 lg:row-start-1">
		{#if pendingSessions.length === 0}
			<div
				class="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm dark:border-green-900/40 dark:bg-green-900/15"
			>
				<CheckCircle size={18} class="shrink-0 text-green-600 dark:text-green-400" weight="fill" />
				<span class="text-green-800 dark:text-green-300">
					Tudo registrado hoje
				</span>
				<a
					href="/app/sessions"
					class="ml-auto flex items-center gap-1 text-xs text-green-700 hover:underline dark:text-green-400"
				>
					ver histórico <ArrowRight size={12} />
				</a>
			</div>
		{:else}
			<Card title="Registros pendentes">
				{#snippet actions()}
					<span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
						{pendingSessions.length}
					</span>
				{/snippet}

				<ul class="space-y-2">
					{#each pendingSessions as session (session.id)}
						{@const patientName = (session.patients as { name: string }[] | null)?.[0]?.name ?? 'Paciente'}
						<li class="flex items-center gap-3 rounded-lg border border-primary-100/40 bg-primary-50/30 px-3 py-2.5 dark:border-white/5 dark:bg-white/5">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium text-ink dark:text-bg">
									{patientName}
								</p>
								<p class="text-xs text-ink-muted">{sessionTime(session.scheduled_at)}</p>
							</div>
							<span class="text-xs text-ink-muted">
								{formatBRL(session.fee ?? 0)}
							</span>
							<a
								href="/app/sessions"
								class="ml-1 shrink-0 text-xs font-medium text-primary hover:underline"
								aria-label="Registrar sessão de {patientName}"
							>
								registrar
							</a>
						</li>
					{/each}
				</ul>

				<div class="mt-3 border-t border-primary-100/40 pt-3 dark:border-white/5">
					<a
						href="/app/sessions"
						class="flex items-center gap-1 text-xs text-primary hover:underline"
					>
						Ir para sessões <ArrowRight size={12} />
					</a>
				</div>
			</Card>
		{/if}
	</div>

	<!-- Contas a pagar — left col row 2 on desktop -->
	<div class="lg:col-start-1 lg:row-start-2">
		<Card title="Contas a pagar">
			{#if !hasBills}
				<p class="text-sm text-ink-muted">Nenhuma conta pendente esta semana.</p>
			{:else}
				<div class="space-y-4">
					{#if overdueExpenses.length > 0}
						<div>
							<p class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
								<Warning size={13} weight="fill" /> Atrasadas
							</p>
							<ul class="space-y-1.5">
								{#each overdueExpenses as e (e.id)}
									<li class="flex items-center justify-between rounded-lg border border-red-200/60 bg-red-50/60 px-3 py-2 dark:border-red-900/30 dark:bg-red-900/10">
										<span class="text-sm text-red-900 dark:text-red-300">{e.description}</span>
										<span class="text-sm font-semibold text-red-700 dark:text-red-400">{formatBRL(e.amount)}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if dueTodayExpenses.length > 0}
						<div>
							<p class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
								<WarningCircle size={13} weight="fill" /> Vence hoje
							</p>
							<ul class="space-y-1.5">
								{#each dueTodayExpenses as e (e.id)}
									<li class="flex items-center justify-between rounded-lg border border-amber-200/60 bg-amber-50/60 px-3 py-2 dark:border-amber-900/30 dark:bg-amber-900/10">
										<span class="text-sm text-amber-900 dark:text-amber-300">{e.description}</span>
										<span class="text-sm font-semibold text-amber-700 dark:text-amber-400">{formatBRL(e.amount)}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if dueThisWeekExpenses.length > 0}
						<div>
							<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
								Esta semana
							</p>
							<ul class="space-y-1.5">
								{#each dueThisWeekExpenses as e (e.id)}
									<li class="flex items-center justify-between rounded-lg border border-primary-100/40 px-3 py-2 dark:border-white/5">
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
					class="flex items-center gap-1 text-xs text-primary hover:underline"
				>
					Gerenciar despesas <ArrowRight size={12} />
				</a>
			</div>
		</Card>
	</div>

	<!-- Repasse à clínica — right col row 2 on desktop (clinic mode only) -->
	{#if data.isClinicMode}
		<div class="lg:col-start-2 lg:row-start-2">
			<Card title="Repasse à clínica">
				{#if repasseDisabled}
					<p class="text-sm text-ink-muted">Repasse não configurado.</p>
					<a
						href="/app/settings"
						class="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
					>
						Configurar em Clínica <ArrowRight size={12} />
					</a>
				{:else}
					<div class="space-y-2 text-sm">
						<div class="flex items-center justify-between">
							<span class="text-ink-muted">Fixo por sessão</span>
							<span class="text-ink dark:text-bg">{formatBRL(data.clinicOp.repasse_fixo)}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-ink-muted">Percentual</span>
							<span class="text-ink dark:text-bg">{data.clinicOp.repasse_percentual}%</span>
						</div>
						<div class="mt-1 border-t border-primary-100/40 pt-2 dark:border-white/5">
							<div class="flex items-center justify-between font-semibold">
								<span class="text-ink dark:text-bg">Total hoje</span>
								<span class="text-ink dark:text-bg">{formatBRL(repasseToday)}</span>
							</div>
						</div>
					</div>
				{/if}
			</Card>
		</div>
	{/if}

	<!-- Fluxo de caixa — right col (auto row) on desktop -->
	<div class="lg:col-start-2">
		<Card title="Fluxo de caixa">
			<p class="mb-3 text-xs text-ink-muted capitalize">{monthLabel}</p>
			<div class="space-y-2 text-sm">
				<div class="flex items-center justify-between">
					<span class="text-ink-muted">Receitas realizadas</span>
					<span class="font-medium text-green-700 dark:text-green-400">{formatBRL(monthRevenue)}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-ink-muted">Despesas registradas</span>
					<span class="font-medium text-red-700 dark:text-red-400">{formatBRL(monthExpenses)}</span>
				</div>
				<div class="mt-1 border-t border-primary-100/40 pt-2 dark:border-white/5">
					<div class="flex items-center justify-between font-semibold">
						<span class="text-ink dark:text-bg">Saldo do mês</span>
						<span class={monthNet >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
							{formatBRL(monthNet)}
						</span>
					</div>
					{#if data.isClinicMode && !repasseDisabled}
						<div class="mt-1 flex items-center justify-between text-xs text-ink-muted">
							<span>Líquido após repasse</span>
							<span>{formatBRL(monthNet - repasseToday)}</span>
						</div>
					{/if}
				</div>
			</div>
		</Card>
	</div>

	<!-- Ações rápidas — full width -->
	<div class="lg:col-span-2">
		<Card title="Ações rápidas">
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<a
					href="/app/sessions"
					class="flex flex-col items-center gap-2 rounded-xl border border-primary-100/60 bg-primary-50/40 p-4 text-center transition hover:bg-primary-50 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10"
				>
					<CalendarBlank size={22} class="text-primary" />
					<span class="text-xs font-medium text-ink dark:text-bg">Sessões</span>
				</a>
				<a
					href="/app/patients"
					class="flex flex-col items-center gap-2 rounded-xl border border-primary-100/60 bg-primary-50/40 p-4 text-center transition hover:bg-primary-50 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10"
				>
					<User size={22} class="text-primary" />
					<span class="text-xs font-medium text-ink dark:text-bg">Pacientes</span>
				</a>
				<a
					href="/app/settings"
					class="flex flex-col items-center gap-2 rounded-xl border border-primary-100/60 bg-primary-50/40 p-4 text-center transition hover:bg-primary-50 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10"
				>
					<Receipt size={22} class="text-primary" />
					<span class="text-xs font-medium text-ink dark:text-bg">Despesas</span>
				</a>
				<a
					href="/app/settings"
					class="flex flex-col items-center gap-2 rounded-xl border border-primary-100/60 bg-primary-50/40 p-4 text-center transition hover:bg-primary-50 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10"
				>
					<Gear size={22} class="text-primary" />
					<span class="text-xs font-medium text-ink dark:text-bg">Configurações</span>
				</a>
			</div>
		</Card>
	</div>
</div>
