/**
 * Lógica de negócio financeira — pura, sem IO.
 * Testada em `src/tests/core/finance.test.ts`.
 */
import type { Expense, FinanceEntry, Patient, Session } from './types';

/** Projeta receita mensal a partir dos pacientes ativos. */
export function projectMonthlyRevenue(patients: Patient[]): number {
	return patients
		.filter((p) => p.active)
		.reduce((total, p) => {
			const fee = p.session_fee ?? 0;
			const sessions = p.sessions_per_month ?? 0;
			return total + fee * sessions;
		}, 0);
}

/** Receita efetivamente registrada no período (ambas as datas inclusivas, ISO YYYY-MM-DD). */
export function actualRevenue(entries: FinanceEntry[], from: string, to: string): number {
	return entries
		.filter((e) => e.type === 'revenue' && e.occurred_at >= from && e.occurred_at <= to)
		.reduce((sum, e) => sum + e.amount, 0);
}

/** Despesas do período. */
export function totalExpenses(entries: FinanceEntry[], from: string, to: string): number {
	return entries
		.filter((e) => e.type === 'expense' && e.occurred_at >= from && e.occurred_at <= to)
		.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Soma as despesas recorrentes/avulsas da tabela `expenses` para o período.
 * Periódicas são prorrateadas pelo número de meses do período:
 *   mensal × meses, trimestral × meses/3, anual × meses/12.
 * Avulsas entram apenas se `due_date` cai dentro do período.
 */
export function expensesForPeriod(expenses: Expense[], from: string, to: string): number {
	const [fy, fm] = from.split('-').map(Number);
	const [ty, tm] = to.split('-').map(Number);
	const months = (ty - fy) * 12 + (tm - fm) + 1;

	return expenses
		.filter((e) => e.is_active)
		.reduce((sum, e) => {
			switch (e.frequency) {
				case 'monthly':
					return sum + e.amount * months;
				case 'quarterly':
					return sum + e.amount * (months / 3);
				case 'annual':
					return sum + e.amount * (months / 12);
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

/** Ranking de pacientes por receita projetada (desc). */
export function patientRevenueRanking(
	patients: Patient[]
): { patient_id: string; name: string; monthly: number }[] {
	return patients
		.filter((p) => p.active)
		.map((p) => ({
			patient_id: p.id,
			name: p.name,
			monthly: (p.session_fee ?? 0) * (p.sessions_per_month ?? 0)
		}))
		.sort((a, b) => b.monthly - a.monthly);
}

/** Formatação BRL. */
export function formatBRL(value: number): string {
	return new Intl.NumberFormat('pt-BR', {
		style: 'currency',
		currency: 'BRL'
	}).format(value);
}
