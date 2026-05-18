<script lang="ts">
	import { ArrowLeft, FileCsv, ShareNetwork } from 'phosphor-svelte';
	import { formatBRL } from '$lib/utils/format';
	import WeeklyBarChart from '$lib/ui/operational/WeeklyBarChart.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const MONTHS_PT = [
		'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
		'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
	];

	const tz = $derived(data.tz ?? 'America/Sao_Paulo');

	// ── Period label ───────────────────────────────────────────
	const periodLabel = $derived.by(() => {
		if (data.period === '7d') return 'Últimos 7 dias';
		if (data.period === '3m') return 'Últimos 3 meses';
		// month
		const [yr, mo] = data.periodStart.split('-').map(Number);
		return `${MONTHS_PT[mo - 1]} de ${yr}`;
	});

	// ── Session filtering (client-side TZ-aware) ───────────────
	const periodSessions = $derived(
		data.sessions.filter((s) => {
			const d = new Date(s.scheduled_at).toLocaleDateString('sv', { timeZone: tz });
			return d >= data.periodStart && d <= data.periodEnd;
		}),
	);

	// ── Income metrics ─────────────────────────────────────────
	const completedSessions = $derived(
		periodSessions.filter((s) => s.status === 'completed'),
	);
	const noShowSessions = $derived(
		periodSessions.filter((s) => s.status === 'no_show'),
	);
	const completedTotal = $derived(
		completedSessions.reduce((sum, s) => sum + (s.fee ?? 0), 0),
	);
	const noShowTotal = $derived(
		noShowSessions.reduce((sum, s) => sum + (s.fee ?? 0), 0),
	);
	const totalIncome = $derived(completedTotal + noShowTotal);

	// ── Repasse ────────────────────────────────────────────────
	const repasseDisabled = $derived(
		data.clinicOp.repasse_fixo === 0 && data.clinicOp.repasse_percentual === 0,
	);
	const chargedCount = $derived(completedSessions.length + noShowSessions.length);
	const totalRepasse = $derived.by(() => {
		if (!data.isClinicMode || repasseDisabled) return 0;
		const { repasse_fixo: fixo, repasse_percentual: perc } = data.clinicOp;
		return (
			completedSessions.reduce((sum, s) => sum + fixo + (perc / 100) * (s.fee ?? 0), 0) +
			noShowSessions.reduce((sum, s) => sum + fixo + (perc / 100) * (s.fee ?? 0), 0)
		);
	});

	// ── Expenses ───────────────────────────────────────────────
	const totalExpenses = $derived(
		data.expenseEntries.reduce((sum, e) => sum + e.amount, 0),
	);

	// Group expenses by description for the list
	const expensesByCategory = $derived.by(() => {
		const map = new Map<string, number>();
		for (const e of data.expenseEntries) {
			const desc = (e.expenses as { description: string }[] | null)?.[0]?.description ?? 'Despesa';
			map.set(desc, (map.get(desc) ?? 0) + e.amount);
		}
		return [...map.entries()]
			.sort(([, a], [, b]) => b - a)
			.map(([description, amount]) => ({ description, amount }));
	});

	// ── Net balance ────────────────────────────────────────────
	const netBalance = $derived(totalIncome - totalRepasse - totalExpenses);

	// ── Weekly grouping for chart ──────────────────────────────
	function getWeekStart(dateStr: string): string {
		const [year, month, day] = dateStr.split('-').map(Number);
		const d = new Date(year, month - 1, day);
		d.setDate(d.getDate() - d.getDay()); // back to Sunday
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${dd}`;
	}

	const weekBuckets = $derived.by(() => {
		const map = new Map<string, { income: number; expenses: number }>();

		for (const s of periodSessions) {
			if (s.status !== 'completed' && s.status !== 'no_show') continue;
			const dateStr = new Date(s.scheduled_at).toLocaleDateString('sv', { timeZone: tz });
			const key = getWeekStart(dateStr);
			const b = map.get(key) ?? { income: 0, expenses: 0 };
			b.income += s.fee ?? 0;
			map.set(key, b);
		}

		for (const e of data.expenseEntries) {
			const key = getWeekStart(e.occurred_at);
			const b = map.get(key) ?? { income: 0, expenses: 0 };
			b.expenses += e.amount;
			map.set(key, b);
		}

		return [...map.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, vals]) => {
				const [, mo, dy] = key.split('-').map(Number);
				return { label: `${dy}/${mo}`, ...vals };
			});
	});

	// ── Open receivables (all-time unpaid, grouped by patient) ─
	const receivablesByPatient = $derived.by(() => {
		const map = new Map<string, { name: string; total: number; oldestAt: string }>();
		for (const s of data.openReceivables) {
			const patients = s.patients as { id: string; name: string }[] | null;
			const id = patients?.[0]?.id ?? `anon-${s.id}`;
			const name = patients?.[0]?.name ?? 'Paciente';
			const existing = map.get(id) ?? { name, total: 0, oldestAt: s.scheduled_at };
			existing.total += s.fee ?? 0;
			if (s.scheduled_at < existing.oldestAt) existing.oldestAt = s.scheduled_at;
			map.set(id, existing);
		}
		return [...map.values()].sort((a, b) => a.oldestAt.localeCompare(b.oldestAt));
	});

	function ageInDays(scheduledAt: string): number {
		const d = new Date(scheduledAt).toLocaleDateString('sv', { timeZone: tz });
		return Math.max(
			0,
			Math.floor(
				(new Date(data.today).getTime() - new Date(d).getTime()) / 86400000,
			),
		);
	}

	function ageColor(days: number): string {
		if (days > 14) return 'text-red-700 dark:text-red-400';
		if (days >= 7) return 'text-amber-700 dark:text-amber-400';
		return 'text-ink-muted';
	}

	// ── Income proportion bars ─────────────────────────────────
	const completedPct = $derived(totalIncome > 0 ? (completedTotal / totalIncome) * 100 : 0);
	const noShowPct = $derived(totalIncome > 0 ? (noShowTotal / totalIncome) * 100 : 0);

	// ── CSV export ─────────────────────────────────────────────
	function exportCSV() {
		const header = ['Data', 'Tipo', 'Paciente/Descrição', 'Valor (R$)', 'Status'];
		const rows: string[][] = [header];

		for (const s of periodSessions) {
			if (s.status !== 'completed' && s.status !== 'no_show') continue;
			const patients = s.patients as { name: string }[] | null;
			rows.push([
				new Date(s.scheduled_at).toLocaleDateString('sv', { timeZone: tz }),
				s.status === 'completed' ? 'Sessão realizada' : 'Falta cobrada',
				patients?.[0]?.name ?? '',
				((s.fee ?? 0) / 100).toFixed(2).replace('.', ','),
				s.paid ? 'Pago' : 'Em aberto',
			]);
		}

		for (const e of data.expenseEntries) {
			rows.push([
				e.occurred_at,
				'Despesa',
				(e.expenses as { description: string }[] | null)?.[0]?.description ?? 'Despesa',
				(e.amount / 100).toFixed(2).replace('.', ','),
				'Pago',
			]);
		}

		const csv = '﻿' + rows.map((r) => r.join(';')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `fluxo-${data.periodStart}-${data.periodEnd}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
</script>

<!-- ── Page header ─────────────────────────────────────────── -->
<div class="mb-6 flex items-center gap-3">
	<a
		href="/app/operations"
		class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-ink transition hover:bg-primary-100 dark:bg-white/5 dark:text-bg dark:hover:bg-white/10"
		aria-label="Voltar ao Operacional"
	>
		<ArrowLeft size={20} />
	</a>
	<h1 class="font-heading text-xl font-bold text-ink dark:text-bg">Fluxo de Caixa</h1>
	<div class="ml-auto flex items-center gap-2">
		<button
			disabled
			title="Em breve"
			aria-label="Compartilhar — em breve"
			class="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-400 opacity-50 dark:bg-white/5 dark:text-white/40"
		>
			<ShareNetwork size={20} />
		</button>
	</div>
</div>

<!-- ── Period selector ─────────────────────────────────────── -->
<div class="mb-6 flex gap-2" role="tablist" aria-label="Período">
	{#each [{ key: '7d', label: '7 dias' }, { key: 'month', label: 'Mês corrente' }, { key: '3m', label: '3 meses' }] as p (p.key)}
		<a
			href="?period={p.key}"
			role="tab"
			aria-selected={data.period === p.key}
			class="rounded-full px-4 py-2 text-sm font-medium transition {data.period === p.key
				? 'bg-primary text-white'
				: 'bg-primary-50 text-ink hover:bg-primary-100 dark:bg-white/5 dark:text-bg dark:hover:bg-white/10'}"
		>
			{p.label}
		</a>
	{/each}
</div>

<!-- ── Net balance card ────────────────────────────────────── -->
<div class="surface mb-4 p-5">
	<p class="mb-1 text-xs capitalize text-ink-muted">{periodLabel}</p>
	<p
		class="mb-4 text-4xl font-bold tabular-nums {netBalance >= 0
			? 'text-green-700 dark:text-green-400'
			: 'text-red-700 dark:text-red-400'}"
		aria-label="Saldo líquido do período: {formatBRL(netBalance)}"
	>
		{formatBRL(netBalance)}
	</p>
	<div class="flex flex-wrap gap-2">
		<span class="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
			<span class="h-2 w-2 rounded-full bg-green-500"></span>
			Entrou {formatBRL(totalIncome)}
		</span>
		{#if data.isClinicMode && !repasseDisabled}
			<span class="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
				<span class="h-2 w-2 rounded-full bg-blue-500"></span>
				Repasse {formatBRL(totalRepasse)}
			</span>
		{/if}
		<span class="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
			<span class="h-2 w-2 rounded-full bg-red-500"></span>
			Saiu {formatBRL(totalExpenses)}
		</span>
	</div>
</div>

<!-- ── Weekly bar chart ────────────────────────────────────── -->
<div class="surface mb-4 p-5">
	<h2 class="mb-4 text-base font-semibold text-ink dark:text-bg">Por semana</h2>
	<WeeklyBarChart weeks={weekBuckets} />
</div>

<!-- ── Income breakdown ────────────────────────────────────── -->
<div class="surface mb-4 p-5">
	<h2 class="mb-4 text-base font-semibold text-ink dark:text-bg">Entradas</h2>

	{#if totalIncome === 0}
		<p class="text-sm text-ink-muted">Nenhuma receita no período.</p>
	{:else}
		<div class="space-y-3">
			{#if completedTotal > 0}
				<div>
					<div class="mb-1 flex items-center justify-between text-sm">
						<span class="text-ink dark:text-bg">Sessões realizadas</span>
						<span class="font-medium text-ink dark:text-bg">{formatBRL(completedTotal)}</span>
					</div>
					<div class="h-1.5 overflow-hidden rounded-full bg-primary-100/60 dark:bg-white/10">
						<div
							class="h-full rounded-full bg-green-500 transition-all"
							style="width: {completedPct}%"
							aria-label="{completedPct.toFixed(0)}% do total"
						></div>
					</div>
					<p class="mt-0.5 text-right text-xs text-ink-muted">
						{completedSessions.length} sessão{completedSessions.length !== 1 ? 'ões' : ''} · {completedPct.toFixed(0)}%
					</p>
				</div>
			{/if}

			{#if noShowTotal > 0}
				<div>
					<div class="mb-1 flex items-center justify-between text-sm">
						<span class="text-ink dark:text-bg">Faltas cobradas</span>
						<span class="font-medium text-ink dark:text-bg">{formatBRL(noShowTotal)}</span>
					</div>
					<div class="h-1.5 overflow-hidden rounded-full bg-primary-100/60 dark:bg-white/10">
						<div
							class="h-full rounded-full bg-amber-500 transition-all"
							style="width: {noShowPct}%"
							aria-label="{noShowPct.toFixed(0)}% do total"
						></div>
					</div>
					<p class="mt-0.5 text-right text-xs text-ink-muted">
						{noShowSessions.length} falta{noShowSessions.length !== 1 ? 's' : ''} · {noShowPct.toFixed(0)}%
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- ── Repasse breakdown (clinic mode) ────────────────────── -->
{#if data.isClinicMode && !repasseDisabled}
	<div class="surface mb-4 p-5">
		<h2 class="mb-4 text-base font-semibold text-ink dark:text-bg">Repasse à clínica</h2>
		<div class="rounded-lg border border-blue-200/60 bg-blue-50/50 p-4 text-sm dark:border-blue-900/30 dark:bg-blue-900/10">
			<div class="space-y-1.5">
				{#if data.clinicOp.repasse_fixo > 0}
					<div class="flex items-center justify-between">
						<span class="text-ink-muted">Fixo × {chargedCount} sessões</span>
						<span class="text-ink dark:text-bg">
							{formatBRL(data.clinicOp.repasse_fixo)} × {chargedCount} = {formatBRL(data.clinicOp.repasse_fixo * chargedCount)}
						</span>
					</div>
				{/if}
				{#if data.clinicOp.repasse_percentual > 0}
					<div class="flex items-center justify-between">
						<span class="text-ink-muted">{data.clinicOp.repasse_percentual}% × receitas</span>
						<span class="text-ink dark:text-bg">
							{data.clinicOp.repasse_percentual}% × {formatBRL(totalIncome)} = {formatBRL((data.clinicOp.repasse_percentual / 100) * totalIncome)}
						</span>
					</div>
				{/if}
				<div class="mt-2 border-t border-blue-200/60 pt-2 dark:border-blue-900/30">
					<div class="flex items-center justify-between font-semibold">
						<span class="text-ink dark:text-bg">Total repasse</span>
						<span class="text-blue-700 dark:text-blue-400">{formatBRL(totalRepasse)}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- ── Expenses list ────────────────────────────────────────── -->
<div class="surface mb-4 p-5">
	<h2 class="mb-4 text-base font-semibold text-ink dark:text-bg">Saídas</h2>

	{#if expensesByCategory.length === 0}
		<p class="text-sm text-ink-muted">Nenhuma despesa registrada no período.</p>
	{:else}
		<ul class="space-y-2">
			{#each expensesByCategory as e (e.description)}
				<li class="flex items-center justify-between py-1">
					<span class="text-sm text-ink dark:text-bg">{e.description}</span>
					<span class="text-sm font-medium text-red-700 dark:text-red-400">{formatBRL(e.amount)}</span>
				</li>
			{/each}
		</ul>
		<div class="mt-3 flex items-center justify-between border-t border-primary-100/40 pt-3 text-sm font-semibold dark:border-white/5">
			<span class="text-ink dark:text-bg">Total</span>
			<span class="text-red-700 dark:text-red-400">{formatBRL(totalExpenses)}</span>
		</div>
	{/if}
</div>

<!-- ── Open receivables ────────────────────────────────────── -->
<div class="surface mb-6 p-5">
	<h2 class="mb-4 text-base font-semibold text-ink dark:text-bg">A receber em aberto</h2>

	{#if receivablesByPatient.length === 0}
		<div class="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
			<span>Nenhum valor em aberto.</span>
		</div>
	{:else}
		<ul class="space-y-2">
			{#each receivablesByPatient as patient (patient.name + patient.oldestAt)}
				{@const days = ageInDays(patient.oldestAt)}
				<li class="flex items-center justify-between py-1.5">
					<div>
						<p class="text-sm font-medium text-ink dark:text-bg">{patient.name}</p>
						<p class="text-xs {ageColor(days)}">
							{days === 0 ? 'hoje' : days === 1 ? '1 dia' : `${days} dias`}
						</p>
					</div>
					<span class="text-sm font-semibold {ageColor(days)}">{formatBRL(patient.total)}</span>
				</li>
			{/each}
		</ul>
		<p class="mt-3 border-t border-primary-100/40 pt-3 text-right text-xs text-ink-muted dark:border-white/5">
			Total em aberto: <strong class="text-ink dark:text-bg">{formatBRL(data.openReceivables.reduce((s, r) => s + (r.fee ?? 0), 0))}</strong>
		</p>
	{/if}
</div>

<!-- ── Export footer ───────────────────────────────────────── -->
<div class="flex justify-center pb-4">
	<button
		onclick={exportCSV}
		class="btn-secondary flex min-h-[44px] items-center gap-2 px-6"
		aria-label="Exportar período como CSV"
	>
		<FileCsv size={18} />
		Exportar CSV
	</button>
</div>
