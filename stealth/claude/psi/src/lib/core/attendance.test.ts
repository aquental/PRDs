import { describe, it, expect } from 'vitest';
import {
	monthRangeDates,
	sessionEndedBefore,
	isAppointable,
	isPending,
	oldestPendingMonth
} from './attendance';

// ── monthRangeDates ───────────────────────────────────────────────────────────

describe('monthRangeDates', () => {
	it('janeiro → start 2026-01-01, end 2026-02-01 (exclusive)', () => {
		expect(monthRangeDates('2026-01')).toEqual({ start: '2026-01-01', end: '2026-02-01' });
	});

	it('dezembro → end vira janeiro do ano seguinte', () => {
		expect(monthRangeDates('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' });
	});

	it('fevereiro ano bissexto 2024', () => {
		expect(monthRangeDates('2024-02')).toEqual({ start: '2024-02-01', end: '2024-03-01' });
	});

	it('maio 2026', () => {
		expect(monthRangeDates('2026-05')).toEqual({ start: '2026-05-01', end: '2026-06-01' });
	});
});

// ── sessionEndedBefore ────────────────────────────────────────────────────────

describe('sessionEndedBefore', () => {
	const scheduledAt = '2026-05-01T10:00:00.000Z';
	const duration = 50;

	it('cutoff bem depois do fim → true', () => {
		expect(sessionEndedBefore(scheduledAt, duration, new Date('2026-05-01T11:30:00.000Z'))).toBe(
			true
		);
	});

	it('cutoff exatamente no fim (não inclusivo) → false', () => {
		expect(sessionEndedBefore(scheduledAt, duration, new Date('2026-05-01T10:50:00.000Z'))).toBe(
			false
		);
	});

	it('cutoff durante a sessão → false', () => {
		expect(sessionEndedBefore(scheduledAt, duration, new Date('2026-05-01T10:30:00.000Z'))).toBe(
			false
		);
	});

	it('cutoff antes de começar → false', () => {
		expect(sessionEndedBefore(scheduledAt, duration, new Date('2026-05-01T09:00:00.000Z'))).toBe(
			false
		);
	});

	it('duração 0 minutos: cutoff no instante exato → false (boundary exclusivo)', () => {
		expect(sessionEndedBefore(scheduledAt, 0, new Date(scheduledAt))).toBe(false);
	});

	it('duração 0 minutos: cutoff 1 ms depois → true', () => {
		const cutoff = new Date(new Date(scheduledAt).getTime() + 1);
		expect(sessionEndedBefore(scheduledAt, 0, cutoff)).toBe(true);
	});
});

// ── isAppointable ─────────────────────────────────────────────────────────────

describe('isAppointable', () => {
	const scheduledAt = '2026-05-01T10:00:00.000Z';
	const duration = 50;
	const afterEnd = new Date('2026-05-01T11:30:00.000Z');
	const beforeEnd = new Date('2026-05-01T10:30:00.000Z');

	it('scheduled + já terminou → true', () => {
		expect(isAppointable(scheduledAt, duration, 'scheduled', afterEnd)).toBe(true);
	});

	it('completed + já terminou → true', () => {
		expect(isAppointable(scheduledAt, duration, 'completed', afterEnd)).toBe(true);
	});

	it('no_show + já terminou → true', () => {
		expect(isAppointable(scheduledAt, duration, 'no_show', afterEnd)).toBe(true);
	});

	it('cancelled + já terminou → false (canceladas não aparecem na fila)', () => {
		expect(isAppointable(scheduledAt, duration, 'cancelled', afterEnd)).toBe(false);
	});

	it('scheduled + ainda não terminou → false', () => {
		expect(isAppointable(scheduledAt, duration, 'scheduled', beforeEnd)).toBe(false);
	});

	it('cancelled + não terminou → false', () => {
		expect(isAppointable(scheduledAt, duration, 'cancelled', beforeEnd)).toBe(false);
	});
});

// ── isPending ─────────────────────────────────────────────────────────────────

describe('isPending', () => {
	const scheduledAt = '2026-05-01T10:00:00.000Z';
	const duration = 50;
	const afterEnd = new Date('2026-05-01T11:30:00.000Z');

	it('apontável + attendance_status null → true', () => {
		expect(isPending(scheduledAt, duration, 'scheduled', null, afterEnd)).toBe(true);
	});

	it('apontável + attendance_status = presente → false', () => {
		expect(isPending(scheduledAt, duration, 'scheduled', 'presente', afterEnd)).toBe(false);
	});

	it('apontável + attendance_status = faltou → false', () => {
		expect(isPending(scheduledAt, duration, 'scheduled', 'faltou', afterEnd)).toBe(false);
	});

	it('cancelada + null → false', () => {
		expect(isPending(scheduledAt, duration, 'cancelled', null, afterEnd)).toBe(false);
	});

	it('ainda não terminou + null → false', () => {
		const notYet = new Date('2026-05-01T10:20:00.000Z');
		expect(isPending(scheduledAt, duration, 'scheduled', null, notYet)).toBe(false);
	});
});

// ── oldestPendingMonth ────────────────────────────────────────────────────────

describe('oldestPendingMonth', () => {
	it('sem meses pendentes → null', () => {
		expect(oldestPendingMonth([], [])).toBe(null);
	});

	it('todos os meses pendentes estão fechados → null', () => {
		expect(oldestPendingMonth(['2026-01', '2026-02'], ['2026-01', '2026-02'])).toBe(null);
	});

	it('sem fechamentos → retorna o mais antigo', () => {
		expect(oldestPendingMonth(['2026-05', '2026-03', '2026-04'], [])).toBe('2026-03');
	});

	it('um fechado → retorna o mais antigo não-fechado', () => {
		expect(oldestPendingMonth(['2026-03', '2026-01', '2026-02'], ['2026-01'])).toBe('2026-02');
	});

	it('misto: vários fechados, alguns abertos', () => {
		const pending = ['2026-01', '2026-02', '2026-03', '2026-04'];
		const closed = ['2026-01', '2026-02'];
		expect(oldestPendingMonth(pending, closed)).toBe('2026-03');
	});

	it('único pendente não fechado', () => {
		expect(oldestPendingMonth(['2026-05'], ['2026-04'])).toBe('2026-05');
	});

	it('fechado não relevante (mes não pendente)', () => {
		expect(oldestPendingMonth(['2026-05'], ['2026-03'])).toBe('2026-05');
	});
});
