/**
 * Service-layer tests for numeric(15,2) monetary precision.
 *
 * Verifies that all finance functions handle the full value range
 * of the widened column type — including values that would have
 * overflowed the old numeric(10,2) (max ~99,999,999.99).
 */
import { describe, it, expect } from "vitest";
import {
  projectMonthlyRevenue,
  actualRevenue,
  totalExpenses,
  expensesForPeriod,
  periodProfit,
  outstandingRevenue,
  patientRevenueRanking,
  SESSIONS_PER_MONTH,
} from "./finance";
import type { Expense, FinanceEntry, Patient, Session } from "./types";

// ── helpers ───────────────────────────────────────────────────────────────────

const makePatient = (overrides: Partial<Patient> = {}): Patient => ({
  id: "p1",
  clinic_id: "c1",
  therapist_id: "t1",
  name: "Test Patient",
  email: "patient@example.com",
  active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const makeEntry = (overrides: Partial<FinanceEntry> = {}): FinanceEntry => ({
  id: "e1",
  clinic_id: "c1",
  therapist_id: "t1",
  type: "revenue",
  amount: 100,
  occurred_at: "2024-01-15",
  created_at: "2024-01-15T00:00:00Z",
  ...overrides,
});

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "x1",
  clinic_id: "c1",
  description: "Rent",
  amount: 1000,
  frequency: "monthly",
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: "s1",
  clinic_id: "c1",
  therapist_id: "t1",
  patient_id: "p1",
  scheduled_at: "2024-01-15T10:00:00Z",
  duration_minutes: 50,
  status: "completed",
  frequency: "weekly",
  paid: false,
  created_at: "2024-01-15T00:00:00Z",
  updated_at: "2024-01-15T00:00:00Z",
  ...overrides,
});

// ── projectMonthlyRevenue ─────────────────────────────────────────────────────

describe("projectMonthlyRevenue — numeric(15,2) value range", () => {
  it("handles a typical decimal fee (19.99)", () => {
    const patients = [makePatient({ session_fee: 19.99 })];
    expect(projectMonthlyRevenue(patients)).toBeCloseTo(
      19.99 * SESSIONS_PER_MONTH,
      5,
    );
  });

  it("returns 0 for zero fee", () => {
    const patients = [makePatient({ session_fee: 0 })];
    expect(projectMonthlyRevenue(patients)).toBe(0);
  });

  it("handles a large fee value within numeric(15,2) range (9999999.99)", () => {
    const fee = 9_999_999.99;
    const patients = [makePatient({ session_fee: fee })];
    expect(projectMonthlyRevenue(patients)).toBeCloseTo(
      fee * SESSIONS_PER_MONTH,
      2,
    );
  });

  it("handles a fee that exceeds old numeric(10,2) max (100_000_000.00)", () => {
    const fee = 100_000_000.0;
    const patients = [makePatient({ session_fee: fee })];
    expect(projectMonthlyRevenue(patients)).toBe(fee * SESSIONS_PER_MONTH);
  });

  it("treats null session_fee as 0", () => {
    const patients = [makePatient({ session_fee: null })];
    expect(projectMonthlyRevenue(patients)).toBe(0);
  });

  it("excludes inactive patients regardless of fee size", () => {
    const patients = [
      makePatient({ id: "p1", session_fee: 500, active: true }),
      makePatient({ id: "p2", session_fee: 9_999_999.99, active: false }),
    ];
    expect(projectMonthlyRevenue(patients)).toBe(500 * SESSIONS_PER_MONTH);
  });
});

// ── actualRevenue ─────────────────────────────────────────────────────────────

describe("actualRevenue — numeric(15,2) value range", () => {
  it("sums typical decimal amounts (19.99)", () => {
    const entries = [makeEntry({ amount: 19.99, type: "revenue" })];
    expect(actualRevenue(entries, "2024-01-01", "2024-01-31")).toBeCloseTo(
      19.99,
      5,
    );
  });

  it("returns 0 with no entries", () => {
    expect(actualRevenue([], "2024-01-01", "2024-01-31")).toBe(0);
  });

  it("handles a large amount (9999999.99)", () => {
    const entries = [makeEntry({ amount: 9_999_999.99, type: "revenue" })];
    expect(actualRevenue(entries, "2024-01-01", "2024-01-31")).toBeCloseTo(
      9_999_999.99,
      2,
    );
  });

  it("handles an amount that exceeds old numeric(10,2) max", () => {
    const entries = [makeEntry({ amount: 100_000_000.0, type: "revenue" })];
    expect(actualRevenue(entries, "2024-01-01", "2024-01-31")).toBe(
      100_000_000.0,
    );
  });

  it("ignores expense entries in revenue sum", () => {
    const entries = [
      makeEntry({ amount: 500, type: "revenue" }),
      makeEntry({ id: "e2", amount: 999, type: "expense" }),
    ];
    expect(actualRevenue(entries, "2024-01-01", "2024-01-31")).toBe(500);
  });

  it("throws RangeError when from > to", () => {
    expect(() => actualRevenue([], "2024-02-01", "2024-01-01")).toThrow(
      RangeError,
    );
  });
});

// ── totalExpenses ─────────────────────────────────────────────────────────────

describe("totalExpenses — numeric(15,2) value range", () => {
  it("sums decimal amounts (19.99)", () => {
    const entries = [makeEntry({ amount: 19.99, type: "expense" })];
    expect(totalExpenses(entries, "2024-01-01", "2024-01-31")).toBeCloseTo(
      19.99,
      5,
    );
  });

  it("returns 0 with zero amount", () => {
    const entries = [makeEntry({ amount: 0, type: "expense" })];
    expect(totalExpenses(entries, "2024-01-01", "2024-01-31")).toBe(0);
  });

  it("handles large expense amount (9999999.99)", () => {
    const entries = [makeEntry({ amount: 9_999_999.99, type: "expense" })];
    expect(totalExpenses(entries, "2024-01-01", "2024-01-31")).toBeCloseTo(
      9_999_999.99,
      2,
    );
  });
});

// ── expensesForPeriod ─────────────────────────────────────────────────────────

describe("expensesForPeriod — numeric(15,2) value range", () => {
  it("prorates a monthly expense correctly for 1 month (19.99)", () => {
    const expenses = [makeExpense({ amount: 19.99, frequency: "monthly" })];
    const result = expensesForPeriod(expenses, "2024-01-01", "2024-01-31");
    expect(result).toBeCloseTo(19.99, 5);
  });

  it("returns 0 for zero-amount expense", () => {
    const expenses = [makeExpense({ amount: 0 })];
    expect(expensesForPeriod(expenses, "2024-01-01", "2024-01-31")).toBe(0);
  });

  it("handles large monthly expense (9999999.99)", () => {
    const expenses = [
      makeExpense({ amount: 9_999_999.99, frequency: "monthly" }),
    ];
    const result = expensesForPeriod(expenses, "2024-01-01", "2024-01-31");
    expect(result).toBeCloseTo(9_999_999.99, 2);
  });

  it("throws RangeError when from > to", () => {
    expect(() => expensesForPeriod([], "2024-02-01", "2024-01-01")).toThrow(
      RangeError,
    );
  });
});

// ── outstandingRevenue ────────────────────────────────────────────────────────

describe("outstandingRevenue — numeric(15,2) value range", () => {
  it("sums unpaid completed sessions (19.99)", () => {
    const sessions = [
      makeSession({ fee: 19.99, paid: false, status: "completed" }),
    ];
    expect(outstandingRevenue(sessions)).toBeCloseTo(19.99, 5);
  });

  it("returns 0 when all sessions are paid", () => {
    const sessions = [
      makeSession({ fee: 250, paid: true, status: "completed" }),
    ];
    expect(outstandingRevenue(sessions)).toBe(0);
  });

  it("returns 0 when fee is null", () => {
    const sessions = [
      makeSession({ fee: null, paid: false, status: "completed" }),
    ];
    expect(outstandingRevenue(sessions)).toBe(0);
  });

  it("handles large unpaid fee (9999999.99)", () => {
    const sessions = [
      makeSession({ fee: 9_999_999.99, paid: false, status: "completed" }),
    ];
    expect(outstandingRevenue(sessions)).toBeCloseTo(9_999_999.99, 2);
  });

  it("excludes scheduled (not completed) sessions", () => {
    const sessions = [
      makeSession({ fee: 500, paid: false, status: "scheduled" }),
    ];
    expect(outstandingRevenue(sessions)).toBe(0);
  });
});

// ── periodProfit ──────────────────────────────────────────────────────────────
// Signature: periodProfit(entries, expenses, from, to)
// entries = finance_entries (revenue/expense rows)
// expenses = recurring Expense rows (prorated by expensesForPeriod)

describe("periodProfit — numeric(15,2) value range", () => {
  it("returns revenue minus expenses for typical values", () => {
    const entries = [
      makeEntry({ id: "e1", amount: 1000, type: "revenue" }),
      makeEntry({ id: "e2", amount: 300, type: "expense" }),
    ];
    expect(periodProfit(entries, [], "2024-01-01", "2024-01-31")).toBeCloseTo(
      700,
      5,
    );
  });

  it("returns negative profit when expenses exceed revenue", () => {
    const entries = [
      makeEntry({ id: "e1", amount: 100, type: "revenue" }),
      makeEntry({ id: "e2", amount: 500, type: "expense" }),
    ];
    expect(periodProfit(entries, [], "2024-01-01", "2024-01-31")).toBeCloseTo(
      -400,
      5,
    );
  });

  it("handles large values (9999999.99 revenue, 1.00 recurring expense)", () => {
    const entries = [makeEntry({ amount: 9_999_999.99, type: "revenue" })];
    const recurring = [makeExpense({ amount: 1.0, frequency: "monthly" })];
    expect(
      periodProfit(entries, recurring, "2024-01-01", "2024-01-31"),
    ).toBeCloseTo(9_999_998.99, 2);
  });
});

// ── patientRevenueRanking ─────────────────────────────────────────────────────
// Returns { patient_id, name, monthly }[] sorted desc by monthly revenue.

describe("patientRevenueRanking — numeric(15,2) value range", () => {
  it("ranks patients with decimal fees correctly (19.99 vs 9.99)", () => {
    const patients = [
      makePatient({ id: "p1", session_fee: 9.99 }),
      makePatient({ id: "p2", session_fee: 19.99 }),
    ];
    const ranked = patientRevenueRanking(patients);
    expect(ranked[0].patient_id).toBe("p2");
    expect(ranked[1].patient_id).toBe("p1");
  });

  it("handles zero fees (sorted last)", () => {
    const patients = [
      makePatient({ id: "p1", session_fee: 0 }),
      makePatient({ id: "p2", session_fee: 250 }),
    ];
    const ranked = patientRevenueRanking(patients);
    expect(ranked[0].patient_id).toBe("p2");
  });

  it("handles large fees without overflow", () => {
    const patients = [
      makePatient({ id: "p1", session_fee: 9_999_999.99 }),
      makePatient({ id: "p2", session_fee: 100_000_000.0 }),
    ];
    const ranked = patientRevenueRanking(patients);
    expect(ranked[0].patient_id).toBe("p2");
  });

  it("returns empty array for empty input", () => {
    expect(patientRevenueRanking([])).toEqual([]);
  });
});
