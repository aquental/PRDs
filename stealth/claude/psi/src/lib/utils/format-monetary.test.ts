/**
 * Format utility tests for numeric(15,2) monetary values.
 *
 * Verifies that formatBRL and formatBRLDecimal correctly display values
 * across the full range allowed by the widened column type, including
 * values that would have overflowed the old numeric(10,2).
 */
import { describe, it, expect } from "vitest";
import { formatBRL, formatBRLDecimal } from "./format";

// ── formatBRL — numeric(15,2) range ──────────────────────────────────────────

describe("formatBRL — numeric(15,2) value range", () => {
  it("formats a typical decimal value (19.99) with R$ symbol and two decimal places", () => {
    const result = formatBRL(19.99);
    expect(result).toMatch(/R\$/);
    expect(result).toMatch(/19/);
    expect(result).toMatch(/99/);
  });

  it("formats zero as a currency string (not em-dash)", () => {
    const result = formatBRL(0);
    expect(result).toMatch(/R\$/);
    expect(result).toMatch(/0,00/);
  });

  it("formats a large value within old numeric(10,2) range (9999999.99)", () => {
    const result = formatBRL(9_999_999.99);
    expect(result).toMatch(/R\$/);
    expect(result).not.toBe("—");
  });

  it("formats a value that exceeds old numeric(10,2) max (100_000_000.00) without crashing", () => {
    const result = formatBRL(100_000_000.0);
    expect(result).toMatch(/R\$/);
    expect(result).not.toBe("—");
  });

  it("formats the numeric(15,2) practical max (9_999_999_999_999.99) without crashing", () => {
    const result = formatBRL(9_999_999_999_999.99);
    expect(result).toMatch(/R\$/);
    expect(result).not.toBe("—");
  });

  it("returns em-dash for null (DB nullable fee columns)", () => {
    expect(formatBRL(null)).toBe("—");
  });

  it("returns em-dash for undefined", () => {
    expect(formatBRL(undefined)).toBe("—");
  });

  it("returns em-dash for NaN (guard against malformed DB reads)", () => {
    expect(formatBRL(NaN)).toBe("—");
  });

  it("always shows two decimal places for whole number values", () => {
    expect(formatBRL(250)).toMatch(/,00/);
  });

  it("shows two decimal places when value has cents (250.50 → ,50)", () => {
    expect(formatBRL(250.5)).toMatch(/,50/);
  });
});

// ── formatBRLDecimal — numeric(15,2) range (CSV export) ──────────────────────

describe("formatBRLDecimal — numeric(15,2) value range", () => {
  it('formats a typical decimal (19.99) as "19,99" without R$ symbol', () => {
    const result = formatBRLDecimal(19.99);
    expect(result).toMatch(/19,99/);
    expect(result).not.toMatch(/R\$/);
  });

  it('formats zero as "0,00"', () => {
    expect(formatBRLDecimal(0)).toMatch(/0,00/);
  });

  it("formats large value (9999999.99) correctly for CSV", () => {
    const result = formatBRLDecimal(9_999_999.99);
    expect(result).toMatch(/9\.999\.999,99/);
    expect(result).not.toMatch(/R\$/);
  });

  it("formats a value exceeding old numeric(10,2) max without crashing", () => {
    const result = formatBRLDecimal(100_000_000.0);
    expect(result).toMatch(/100\.000\.000,00/);
  });

  it("always shows two decimal places for whole numbers", () => {
    expect(formatBRLDecimal(1000)).toMatch(/1\.000,00/);
  });

  it("pads a single fractional digit to two (250.5 → 250,50)", () => {
    expect(formatBRLDecimal(250.5)).toMatch(/250,50/);
  });
});
