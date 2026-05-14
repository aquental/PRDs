/**
 * Tests for UI formatting utilities (pt-BR locale).
 */
import { describe, it, expect } from 'vitest';
import { formatBRL, formatDateTime, formatPhone } from './format';

// ── formatBRL ────────────────────────────────────────────────────────────────

describe('formatBRL', () => {
	it('returns em-dash for null', () => {
		expect(formatBRL(null)).toBe('—');
	});

	it('returns em-dash for undefined', () => {
		expect(formatBRL(undefined)).toBe('—');
	});

	it('includes BRL currency symbol', () => {
		expect(formatBRL(1000)).toMatch(/R\$/);
	});

	it('formats thousands separator', () => {
		// pt-BR uses period as thousands separator: 1.000
		expect(formatBRL(1000)).toMatch(/1[.,\s]000/);
	});

	it('formats zero as currency', () => {
		expect(formatBRL(0)).toMatch(/R\$/);
	});

	it('formats negative values', () => {
		const result = formatBRL(-500);
		expect(result).toMatch(/R\$/);
		expect(result).toMatch(/500/);
	});

	// EC-06: NaN and Infinity pass `== null`, reaching Intl.NumberFormat and rendering "R$ NaN"
	it('EC-06: returns em-dash for NaN', () => {
		expect(formatBRL(NaN)).toBe('—');
	});

	it('EC-06: returns em-dash for Infinity', () => {
		expect(formatBRL(Infinity)).toBe('—');
	});

	it('EC-06: returns em-dash for -Infinity', () => {
		expect(formatBRL(-Infinity)).toBe('—');
	});
});

// ── formatDateTime ───────────────────────────────────────────────────────────

describe('formatDateTime', () => {
	it('returns a non-empty string for a valid ISO timestamp', () => {
		const result = formatDateTime('2024-01-15T10:30:00Z');
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
	});

	it('includes the day and year from the input date', () => {
		// Use midday UTC so the date stays on the 22nd in America/Sao_Paulo (UTC-3)
		const result = formatDateTime('2024-03-22T15:00:00Z');
		expect(result).toMatch(/2024/);
		expect(result).toMatch(/22/);
	});

	it('accepts a custom timezone without throwing', () => {
		expect(() => formatDateTime('2024-01-15T10:30:00Z', 'America/New_York')).not.toThrow();
	});

	// EC-02: was throwing RangeError from Intl.DateTimeFormat.format(Invalid Date)
	it('EC-02: returns em-dash for an invalid date string instead of throwing', () => {
		expect(formatDateTime('not-a-date')).toBe('—');
	});

	it('EC-02: returns em-dash for an empty string', () => {
		expect(formatDateTime('')).toBe('—');
	});

	it('EC-02: returns em-dash for a partially valid string', () => {
		expect(formatDateTime('2024-13-45')).toBe('—');
	});
});

// ── formatPhone ──────────────────────────────────────────────────────────────

describe('formatPhone', () => {
	it('formats 11-digit mobile number as (DD) NNNNN-NNNN', () => {
		expect(formatPhone('11999990001')).toBe('(11) 99999-0001');
	});

	it('formats 10-digit landline number as (DD) NNNN-NNNN', () => {
		expect(formatPhone('1133330001')).toBe('(11) 3333-0001');
	});

	it('returns the original string for unexpected lengths', () => {
		expect(formatPhone('1234')).toBe('1234');
		expect(formatPhone('123456789012')).toBe('123456789012');
	});

	it('strips formatting characters before re-formatting 11-digit numbers', () => {
		expect(formatPhone('(11) 99999-0001')).toBe('(11) 99999-0001');
	});

	it('strips formatting characters before re-formatting 10-digit numbers', () => {
		expect(formatPhone('(11) 3333-0001')).toBe('(11) 3333-0001');
	});
});
