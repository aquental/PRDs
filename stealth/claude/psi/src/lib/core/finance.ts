/**
 * Lógica de negócio financeira — pura, sem IO.
 * Testada em `src/tests/core/finance.test.ts`.
 */
import type { Expense, FinanceEntry, Patient, Session } from './types';

/** Projeta receita mensal a partir dos pacientes ativos.
 * Fees negativas são ignoradas (tratadas como 0). Ver EC-10.
 */
export function projectMonthlyRevenue(patients: Patient[]): number {
	return patients
		.filter((p) => p.active)
		.reduce((total, p) => {
			const fee = Math.max(0, p.session_fee ?? 0); // EC-10: negative fee → 0
			const sessions = p.sessions_per_month ?? 0;
			return total + fee * sessions;
		}, 0);
}

/**
 * Receita efetivamente registrada no período (ambas as datas inclusivas, ISO YYYY-MM-DD).
 * `occurred_at` deve estar no formato YYYY-MM-DD (zero-padded) para a comparação lexicográfica
 * funcionar corretamente. Ver EC-03.
 * @throws {RangeError} se `from` > `to`
 */
export function actualRevenue(entries: FinanceEntry[], from: string, to: string): number {
	if (from > to) throw new RangeError(`Invalid date range: "from" (${from}) must be ≤ "to" (${to})`);
	return entries
		.filter((e) => e.type === 'revenue' && e.occurred_at >= from && e.occurred_at <= to)
		.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Despesas do período.
 * @throws {RangeError} se `from` > `to`
 */
export function totalExpenses(entries: FinanceEntry[], from: string, to: string): number {
	if (from > to) throw new RangeError(`Invalid date range: "from" (${from}) must be ≤ "to" (${to})`);
	return entries
		.filter((e) => e.type === 'expense' && e.occurred_at >= from && e.occurred_at <= to)
		.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Soma as despesas recorrentes/avulsas da tabela `expenses` para o período.
 * Periódicas são prorrateadas pelo número de meses do período:
 *   mensal × meses, trimestral × meses/3, anual × meses/12.
 * Avulsas entram apenas se `due_date` cai dentro do período.
 *
 * NOTA (EC-09): opera em meses calendários completos. `from` e `to` devem ser o
 * primeiro/último dia dos respectivos meses. Períodos parciais dentro do mês
 * são contados como mês inteiro.
 *
 * @throws {RangeError} se `from` > `to` (EC-01)
 */
export function expensesForPeriod(expenses: Expense[], from: string, to: string): number {
	const [fy, fm] = from.split('-').map(Number);
	const [ty, tm] = to.split('-').map(Number);
	const months = (ty - fy) * 12 + (tm - fm) + 1;

	if (months <= 0) {
		throw new RangeError(`Invalid date range: "from" (${from}) must be ≤ "to" (${to})`);
	}

	return expenses
		.filter((e) => e.is_active)
		.reduce((sum, e) => {
			switch (e.frequency) {
				case 'monthly':
					return sum + e.amount * months;
				case 'quarterly':
					// EC-08: round to 2 decimal places to avoid floating-point drift
					return sum + Math.round(e.amount * (months / 3) * 100) / 100;
				case 'annual':
					// EC-08: round to 2 decimal places
					return sum + Math.round(e.amount * (months / 12) * 100) / 100;
				case 'one_time':
					if (!e.due_date) return sum;
					return e.due_date >= from && e.due_date <= to ? sum + e.amount : sum;
			}
		}, 0);
}

/** Lucro = receita − despesas (finance_entries + expenses recorrentes). */
export function periodProfit(
	entries: FinanceEntry[],
	expenses: Expense[],
	from: string,
	to: string
): number {
	return (
		actualRevenue(entries, from, to) -
		totalExpenses(entries, from, to) -
		expensesForPeriod(expenses, from, to)
	);
}

/**
 * Receita pendente (sessões realizadas não pagas).
 * Considera apenas sessões com status 'completed' e `paid = false`.
 */
export function outstandingRevenue(sessions: Session[]): number {
	return sessions
		.filter((s) => s.status === 'completed' && !s.paid)
		.reduce((sum, s) => sum + (s.fee ?? 0), 0);
}

/** Ranking de pacientes por receita projetada (desc). Fees negativas são ignoradas. */
export function patientRevenueRanking(
	patients: Patient[]
): { patient_id: string; name: string; monthly: number }[] {
	return patients
		.filter((p) => p.active)
		.map((p) => ({
			patient_id: p.id,
			name: p.name,
			monthly: Math.max(0, p.session_fee ?? 0) * (p.sessions_per_month ?? 0) // EC-10
		}))
		.sort((a, b) => b.monthly - a.monthly);
}

/** Formatação BRL. */
function formatBRL(value: number): string {
	return new Intl.NumberFormat('pt-BR', {
		style: 'currency',
		currency: 'BRL'
	}).format(value);
}
