/**
 * Lógica pura de apontamento de presença — sem IO.
 * Testada em attendance.test.ts.
 */

/**
 * Retorna o intervalo de datas de um mês (end é exclusivo).
 * Entrada: "YYYY-MM". Saída: ISO date strings "YYYY-MM-DD".
 */
export function monthRangeDates(monthYear: string): { start: string; end: string } {
	const [year, month] = monthYear.split('-').map(Number);
	const start = new Date(Date.UTC(year, month - 1, 1));
	const end = new Date(Date.UTC(year, month, 1));
	return {
		start: start.toISOString().slice(0, 10),
		end: end.toISOString().slice(0, 10)
	};
}

/** Retorna true se o horário de término da sessão já passou o cutoff. */
export function sessionEndedBefore(
	scheduledAt: string,
	durationMinutes: number,
	cutoff: Date
): boolean {
	const endMs = new Date(scheduledAt).getTime() + durationMinutes * 60_000;
	return endMs < cutoff.getTime();
}

/** Sessão apontável: não cancelada e horário de término já passou. */
export function isAppointable(
	scheduledAt: string,
	durationMinutes: number,
	status: string,
	now: Date
): boolean {
	if (status === 'cancelled') return false;
	return sessionEndedBefore(scheduledAt, durationMinutes, now);
}

/** Sessão pendente: apontável e sem attendance_status. */
export function isPending(
	scheduledAt: string,
	durationMinutes: number,
	status: string,
	attendanceStatus: string | null,
	now: Date
): boolean {
	return isAppointable(scheduledAt, durationMinutes, status, now) && attendanceStatus === null;
}

/**
 * Retorna o mês não-fechado mais antigo entre os que têm pendências.
 * Ambos os arrays contêm strings "YYYY-MM".
 * Retorna null se todos os meses pendentes estiverem fechados (ou se não houver nenhum).
 */
export function oldestPendingMonth(
	pendingMonths: string[],
	closedMonths: string[]
): string | null {
	const closed = new Set(closedMonths);
	const open = pendingMonths.filter((m) => !closed.has(m)).sort();
	return open[0] ?? null;
}
