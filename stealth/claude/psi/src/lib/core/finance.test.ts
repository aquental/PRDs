/**
 * Tests for pure finance business logic.
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
} from "./finance";
import type { Expense, FinanceEntry, Patient, Session } from "./types";

// ── helpers ──────────────────────────────────────────────────────────────────

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

// ── EC-10: negative session_fee ─────────────────────────────────────────────

describe("projectMonthlyRevenue — EC-10: negative fee", () => {
  it("treats a negative session_fee as 0, not reducing the total", () => {
    const patients = [
      makePatient({
        id: "p1",
        session_fee: 200,
        active: true,
      }),
      makePatient({
        id: "p2",
        session_fee: -100,
        active: true,
      }),
    ];
    // p2 contributes 0, not -400
    expect(projectMonthlyRevenue(patients)).toBe(800);
  });

  it("returns 0 when all active patients have negative fees", () => {
    const patients = [
      makePatient({ session_fee: -500, active: true }),
    ];
    expect(projectMonthlyRevenue(patients)).toBe(0);
  });
});

describe("patientRevenueRanking — EC-10: negative fee", () => {
  it("treats negative session_fee as 0 in monthly projection", () => {
    const patients = [
      makePatient({
        id: "p1",
        name: "Alice",
        session_fee: 100,
        active: true,
      }),
      makePatient({
        id: "p2",
        name: "Bob",
        session_fee: -999,
        active: true,
      }),
    ];
    const ranking = patientRevenueRanking(patients);
    expect(ranking[0].patient_id).toBe("p1"); // Alice first; Bob’s negative fee → 0
    expect(ranking[1].monthly).toBe(0);
  });
});

// ── projectMonthlyRevenue ────────────────────────────────────────────────────

describe("projectMonthlyRevenue", () => {
  it("returns 0 for empty list", () => {
    expect(projectMonthlyRevenue([])).toBe(0);
  });

  it("sums fee × sessions for active patients", () => {
    const patients = [
      makePatient({
        id: "p1",
        session_fee: 200,
        active: true,
      }),
      makePatient({
        id: "p2",
        session_fee: 150,
        active: true,
      }),
    ];
    expect(projectMonthlyRevenue(patients)).toBe(200 * 4 + 150 * 4);
  });

  it("excludes inactive patients", () => {
    const patients = [
      makePatient({
        id: "p1",
        session_fee: 200,
        active: true,
      }),
      makePatient({
        id: "p2",
        session_fee: 999,
        active: false,
      }),
    ];
    expect(projectMonthlyRevenue(patients)).toBe(800);
  });

  it("treats null session_fee as 0", () => {
    expect(
      projectMonthlyRevenue([
        makePatient({ session_fee: null }),
      ]),
    ).toBe(0);
  });
});

// ── actualRevenue ────────────────────────────────────────────────────────────

describe("actualRevenue — EC-01/EC-03: inverted range", () => {
  it("throws RangeError when from > to", () => {
    expect(() => actualRevenue([], "2024-06-01", "2024-01-31")).toThrow(
      RangeError,
    );
  });

  it("error message names both dates", () => {
    expect(() => actualRevenue([], "2024-06-01", "2024-01-31")).toThrow(
      /2024-06-01.*2024-01-31/,
    );
  });

  it("does NOT throw when from === to", () => {
    const entries = [
      makeEntry({ type: "revenue", amount: 50, occurred_at: "2024-03-15" }),
    ];
    expect(() =>
      actualRevenue(entries, "2024-03-15", "2024-03-15"),
    ).not.toThrow();
  });
});

describe("actualRevenue", () => {
  it("sums only revenue entries within range", () => {
    const entries = [
      makeEntry({
        id: "e1",
        type: "revenue",
        amount: 100,
        occurred_at: "2024-01-10",
      }),
      makeEntry({
        id: "e2",
        type: "revenue",
        amount: 200,
        occurred_at: "2024-01-31",
      }),
      makeEntry({
        id: "e3",
        type: "expense",
        amount: 50,
        occurred_at: "2024-01-15",
      }),
    ];
    expect(actualRevenue(entries, "2024-01-01", "2024-01-31")).toBe(300);
  });

  it("includes boundary dates", () => {
    const entries = [
      makeEntry({
        id: "e1",
        type: "revenue",
        amount: 100,
        occurred_at: "2024-01-01",
      }),
      makeEntry({
        id: "e2",
        type: "revenue",
        amount: 200,
        occurred_at: "2024-01-31",
      }),
    ];
    expect(actualRevenue(entries, "2024-01-01", "2024-01-31")).toBe(300);
  });

  it("excludes entries outside range", () => {
    const entries = [
      makeEntry({
        id: "e1",
        type: "revenue",
        amount: 100,
        occurred_at: "2023-12-31",
      }),
      makeEntry({
        id: "e2",
        type: "revenue",
        amount: 200,
        occurred_at: "2024-02-01",
      }),
    ];
    expect(actualRevenue(entries, "2024-01-01", "2024-01-31")).toBe(0);
  });
});

// ── totalExpenses ────────────────────────────────────────────────────────────

describe("totalExpenses — EC-01/EC-03: inverted range", () => {
  it("throws RangeError when from > to", () => {
    expect(() => totalExpenses([], "2024-06-01", "2024-01-31")).toThrow(
      RangeError,
    );
  });
});

describe("totalExpenses", () => {
  it("sums only expense entries within range", () => {
    const entries = [
      makeEntry({
        id: "e1",
        type: "expense",
        amount: 50,
        occurred_at: "2024-01-15",
      }),
      makeEntry({
        id: "e2",
        type: "expense",
        amount: 80,
        occurred_at: "2024-01-20",
      }),
      makeEntry({
        id: "e3",
        type: "revenue",
        amount: 999,
        occurred_at: "2024-01-15",
      }),
    ];
    expect(totalExpenses(entries, "2024-01-01", "2024-01-31")).toBe(130);
  });

  it("returns 0 when no expense entries", () => {
    expect(totalExpenses([], "2024-01-01", "2024-01-31")).toBe(0);
  });
});

// ── expensesForPeriod ────────────────────────────────────────────────────────

describe("expensesForPeriod — EC-01: inverted range", () => {
  it("throws RangeError when from > to", () => {
    const expenses = [makeExpense({ amount: 1000, frequency: "monthly" })];
    expect(() =>
      expensesForPeriod(expenses, "2024-06-01", "2024-01-31"),
    ).toThrow(RangeError);
  });

  it("throws when from and to are in the same month but from day > to day (same month-count but still ≤)", () => {
    // months = 1 (same month), so no throw — day differences are intentionally ignored
    const expenses = [makeExpense({ amount: 1000, frequency: "monthly" })];
    expect(() =>
      expensesForPeriod(expenses, "2024-01-15", "2024-01-01"),
    ).not.toThrow();
  });
});

describe("expensesForPeriod — EC-08: floating-point rounding", () => {
  it("quarterly for 1 month rounds to 2 decimal places (not 33.333…)", () => {
    const expenses = [makeExpense({ amount: 100, frequency: "quarterly" })];
    const result = expensesForPeriod(expenses, "2024-01-01", "2024-01-31");
    expect(result).toBe(33.33);
    // Verify it is exact centavos (no floating-point tail)
    expect(Number.isInteger(Math.round(result * 100))).toBe(true);
  });

  it("annual for 1 month rounds to 2 decimal places", () => {
    // 1000 × (1/12) = 83.333… → 83.33
    const expenses = [makeExpense({ amount: 1000, frequency: "annual" })];
    const result = expensesForPeriod(expenses, "2024-01-01", "2024-01-31");
    expect(result).toBe(83.33);
  });

  it("annual for 12 months returns exact amount (no rounding error)", () => {
    const expenses = [makeExpense({ amount: 1200, frequency: "annual" })];
    expect(expensesForPeriod(expenses, "2024-01-01", "2024-12-31")).toBe(1200);
  });
});

describe("expensesForPeriod", () => {
  it("monthly × 1 month", () => {
    const expenses = [makeExpense({ amount: 1000, frequency: "monthly" })];
    expect(expensesForPeriod(expenses, "2024-01-01", "2024-01-31")).toBe(1000);
  });

  it("monthly × 3 months", () => {
    const expenses = [makeExpense({ amount: 1000, frequency: "monthly" })];
    expect(expensesForPeriod(expenses, "2024-01-01", "2024-03-31")).toBe(3000);
  });

  it("quarterly prorated over 3 months equals full amount", () => {
    const expenses = [makeExpense({ amount: 900, frequency: "quarterly" })];
    expect(expensesForPeriod(expenses, "2024-01-01", "2024-03-31")).toBe(900);
  });

  it("annual prorated over 12 months equals full amount", () => {
    const expenses = [makeExpense({ amount: 1200, frequency: "annual" })];
    expect(expensesForPeriod(expenses, "2024-01-01", "2024-12-31")).toBe(1200);
  });

  it("one_time inside period counts once", () => {
    const expenses = [
      makeExpense({
        amount: 500,
        frequency: "one_time",
        due_date: "2024-01-15",
      }),
    ];
    expect(expensesForPeriod(expenses, "2024-01-01", "2024-01-31")).toBe(500);
  });

  it("one_time outside period is 0", () => {
    const expenses = [
      makeExpense({
        amount: 500,
        frequency: "one_time",
        due_date: "2024-02-15",
      }),
    ];
    expect(expensesForPeriod(expenses, "2024-01-01", "2024-01-31")).toBe(0);
  });

  it("one_time with no due_date is 0", () => {
    const expenses = [
      makeExpense({
        amount: 500,
        frequency: "one_time",
        due_date: undefined,
        due_day: null,
      }),
    ];
    expect(expensesForPeriod(expenses, "2024-01-01", "2024-01-31")).toBe(0);
  });

  it("inactive expense is skipped", () => {
    const expenses = [
      makeExpense({ amount: 1000, frequency: "monthly", is_active: false }),
    ];
    expect(expensesForPeriod(expenses, "2024-01-01", "2024-01-31")).toBe(0);
  });

  it("returns 0 for empty list", () => {
    expect(expensesForPeriod([], "2024-01-01", "2024-01-31")).toBe(0);
  });
});

// ── periodProfit ─────────────────────────────────────────────────────────────

describe("periodProfit", () => {
  it("revenue − finance expenses − recurring expenses", () => {
    const entries = [
      makeEntry({
        id: "e1",
        type: "revenue",
        amount: 1000,
        occurred_at: "2024-01-15",
      }),
      makeEntry({
        id: "e2",
        type: "expense",
        amount: 200,
        occurred_at: "2024-01-15",
      }),
    ];
    const expenses = [makeExpense({ amount: 300, frequency: "monthly" })];
    // 1000 - 200 - 300 = 500
    expect(periodProfit(entries, expenses, "2024-01-01", "2024-01-31")).toBe(
      500,
    );
  });

  it("returns negative when expenses exceed revenue", () => {
    const entries = [
      makeEntry({ type: "revenue", amount: 100, occurred_at: "2024-01-15" }),
    ];
    const expenses = [makeExpense({ amount: 500, frequency: "monthly" })];
    expect(periodProfit(entries, expenses, "2024-01-01", "2024-01-31")).toBe(
      -400,
    );
  });
});

// ── outstandingRevenue ───────────────────────────────────────────────────────

describe("outstandingRevenue", () => {
  it("sums completed unpaid session fees", () => {
    const sessions = [
      makeSession({ id: "s1", status: "completed", paid: false, fee: 200 }),
      makeSession({ id: "s2", status: "completed", paid: false, fee: 150 }),
      makeSession({ id: "s3", status: "completed", paid: true, fee: 100 }),
      makeSession({ id: "s4", status: "cancelled", paid: false, fee: 200 }),
    ];
    expect(outstandingRevenue(sessions)).toBe(350);
  });

  it("treats null fee as 0", () => {
    expect(
      outstandingRevenue([
        makeSession({ status: "completed", paid: false, fee: null }),
      ]),
    ).toBe(0);
  });

  it("returns 0 for empty list", () => {
    expect(outstandingRevenue([])).toBe(0);
  });
});

// ── patientRevenueRanking ────────────────────────────────────────────────────

describe("patientRevenueRanking", () => {
  it("ranks active patients by projected monthly revenue descending", () => {
    const patients = [
      makePatient({
        id: "p1",
        name: "Alice",
        session_fee: 100,
        active: true,
      }), // 400
      makePatient({
        id: "p2",
        name: "Bob",
        session_fee: 200,
        active: true,
      }), //  800
      makePatient({
        id: "p3",
        name: "Carol",
        session_fee: 150,
        active: true,
      }), //  450
    ];
    const ranking = patientRevenueRanking(patients);
    expect(ranking.map((r) => r.patient_id)).toEqual(["p2", "p3", "p1"]);
    expect(ranking.map((r) => r.monthly)).toEqual([800, 600, 400]);
  });

  it("excludes inactive patients", () => {
    const patients = [
      makePatient({
        id: "p1",
        active: true,
        session_fee: 100,
      }),
      makePatient({
        id: "p2",
        active: false,
        session_fee: 999,
      }),
    ];
    const ranking = patientRevenueRanking(patients);
    expect(ranking).toHaveLength(1);
    expect(ranking[0].patient_id).toBe("p1");
  });

  it("returns empty array for no active patients", () => {
    expect(patientRevenueRanking([])).toEqual([]);
  });

  it("includes name in each entry", () => {
    const patients = [
      makePatient({
        id: "p1",
        name: "Alice",
        session_fee: 100,
      }),
    ];
    expect(patientRevenueRanking(patients)[0].name).toBe("Alice");
  });
});
