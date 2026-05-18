/**
 * Integration tests for /app/operations +page.server.ts actions.
 *
 * Covers the four server actions (registerSession, markExpensePaid,
 * closeMonth, reopenMonth) following the same table-aware mock pattern
 * used in src/routes/app/sessions/page.server.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { isActionFailure } from "@sveltejs/kit";
import { actions } from "./+page.server";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("$lib/redis", () => ({
  invalidateDashboard: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("$lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

// ── Constants ─────────────────────────────────────────────────────────────────

const USER = { id: "user-1" };
const THERAPIST = {
  id: "therapist-1",
  clinic_id: "clinic-1",
  name: "Dra. Ana",
};
const SESSION_UUID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const EXPENSE_UUID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CLOSURE_UUID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const MONTH_YEAR = "2026-04";
const CLOSURE = { id: CLOSURE_UUID, log: [], clinic_id: "clinic-1" };

// ── Helpers ───────────────────────────────────────────────────────────────────

interface LocalsOptions {
  user?: typeof USER | null;
  noTherapist?: boolean;
  sessionExists?: boolean;
  sessionUpdateError?: { message: string } | null;
  expenseExists?: boolean;
  financeInsertError?: { message: string } | null;
  existingClosure?: { id: string; log: unknown[] } | null;
  closureExists?: boolean;
  closureUpdateError?: { message: string } | null;
  upsertError?: { message: string } | null;
  therapistCount?: number;
}

/**
 * Builds a `locals`-compatible mock with per-table, per-call dispatch.
 * Each call to `from(table)` increments a counter for that table so the
 * second call can return a different chain (e.g. update after ownership check).
 */
function makeLocals({
  user = USER as typeof USER | null,
  noTherapist = false,
  sessionExists = true,
  sessionUpdateError = null,
  expenseExists = true,
  financeInsertError = null,
  existingClosure = null as { id: string; log: unknown[] } | null,
  closureExists = true,
  closureUpdateError = null,
  upsertError = null,
  therapistCount = 1,
}: LocalsOptions = {}) {
  const callCounts: Record<string, number> = {};

  const fromMock = vi.fn((table: string) => {
    callCounts[table] = (callCounts[table] ?? 0) + 1;
    const call = callCounts[table];

    // ── therapists ───────────────────────────────────────────
    if (table === "therapists") {
      if (call === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: noTherapist ? null : THERAPIST,
            error: null,
          }),
        };
      }
      // Second call: count check (reopenMonth clinic-mode branch)
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: therapistCount, error: null }),
        }),
      };
    }

    // ── sessions ─────────────────────────────────────────────
    if (table === "sessions") {
      if (call === 1) {
        // Ownership check: select().eq().eq().single()
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: sessionExists ? { id: SESSION_UUID } : null,
            error: null,
          }),
        };
      }
      // Mutation: update().eq()
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: sessionUpdateError }),
        }),
      };
    }

    // ── expenses ─────────────────────────────────────────────
    if (table === "expenses") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: expenseExists ? { id: EXPENSE_UUID } : null,
          error: null,
        }),
      };
    }

    // ── finance_entries ───────────────────────────────────────
    if (table === "finance_entries") {
      return {
        insert: vi.fn().mockResolvedValue({ error: financeInsertError }),
      };
    }

    // ── month_closures ────────────────────────────────────────
    if (table === "month_closures") {
      if (call === 1) {
        // First call: read existing record (maybeSingle for closeMonth,
        // single for reopenMonth)
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: existingClosure,
            error: null,
          }),
          single: vi.fn().mockResolvedValue({
            data: closureExists ? CLOSURE : null,
            error: null,
          }),
        };
      }
      // Second call: mutation (upsert for closeMonth, update for reopenMonth)
      return {
        upsert: vi.fn().mockResolvedValue({ error: upsertError }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: closureUpdateError }),
        }),
      };
    }

    // Fallback
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });

  return {
    safeGetSession: vi.fn().mockResolvedValue({ user }),
    supabase: { from: fromMock },
  };
}

function makeRequest(data: Record<string, string>): Request {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.append(k, v));
  return { formData: () => Promise.resolve(fd) } as unknown as Request;
}

// ── registerSession ───────────────────────────────────────────────────────────

describe("registerSession", () => {
  const validCompleted = { session_id: SESSION_UUID, status: "completed" };
  const validNoShow = { session_id: SESSION_UUID, status: "no_show" };
  const validCancelled = { session_id: SESSION_UUID, status: "cancelled" };

  it("marks session as completed", async () => {
    const result = await actions.registerSession({
      request: makeRequest(validCompleted),
      locals: makeLocals(),
    } as unknown as Parameters<typeof actions.registerSession>[0]);
    expect(result).toEqual({ success: true, action: "registerSession" });
  });

  it("marks session as no_show", async () => {
    const result = await actions.registerSession({
      request: makeRequest(validNoShow),
      locals: makeLocals(),
    } as unknown as Parameters<typeof actions.registerSession>[0]);
    expect(result).toEqual({ success: true, action: "registerSession" });
  });

  it("marks session as cancelled", async () => {
    const result = await actions.registerSession({
      request: makeRequest(validCancelled),
      locals: makeLocals(),
    } as unknown as Parameters<typeof actions.registerSession>[0]);
    expect(result).toEqual({ success: true, action: "registerSession" });
  });

  it("401 when no authenticated user", async () => {
    const result = await actions.registerSession({
      request: makeRequest(validCompleted),
      locals: makeLocals({ user: null }),
    } as unknown as Parameters<typeof actions.registerSession>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(401);
  });

  it("403 when therapist not found", async () => {
    const result = await actions.registerSession({
      request: makeRequest(validCompleted),
      locals: makeLocals({ noTherapist: true }),
    } as unknown as Parameters<typeof actions.registerSession>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(403);
  });

  it("400 on invalid status value", async () => {
    const result = await actions.registerSession({
      request: makeRequest({ session_id: SESSION_UUID, status: "pending" }),
      locals: makeLocals(),
    } as unknown as Parameters<typeof actions.registerSession>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(400);
  });

  it("400 on non-UUID session_id", async () => {
    const result = await actions.registerSession({
      request: makeRequest({ session_id: "not-a-uuid", status: "completed" }),
      locals: makeLocals(),
    } as unknown as Parameters<typeof actions.registerSession>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(400);
  });

  it("404 when session does not belong to therapist", async () => {
    const result = await actions.registerSession({
      request: makeRequest(validCompleted),
      locals: makeLocals({ sessionExists: false }),
    } as unknown as Parameters<typeof actions.registerSession>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(404);
  });

  it("400 on DB update error", async () => {
    const result = await actions.registerSession({
      request: makeRequest(validCompleted),
      locals: makeLocals({ sessionUpdateError: { message: "db error" } }),
    } as unknown as Parameters<typeof actions.registerSession>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(400);
  });
});

// ── markExpensePaid ───────────────────────────────────────────────────────────

describe("markExpensePaid", () => {
  const validData = {
    expense_id: EXPENSE_UUID,
    description: "Internet",
    amount: "120",
    today: "2026-05-17",
  };

  it("marks expense as paid", async () => {
    const result = await actions.markExpensePaid({
      request: makeRequest(validData),
      locals: makeLocals(),
    } as unknown as Parameters<typeof actions.markExpensePaid>[0]);
    expect(result).toEqual({ success: true, action: "markExpensePaid" });
  });

  it("401 when no authenticated user", async () => {
    const result = await actions.markExpensePaid({
      request: makeRequest(validData),
      locals: makeLocals({ user: null }),
    } as unknown as Parameters<typeof actions.markExpensePaid>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(401);
  });

  it("403 when therapist not found", async () => {
    const result = await actions.markExpensePaid({
      request: makeRequest(validData),
      locals: makeLocals({ noTherapist: true }),
    } as unknown as Parameters<typeof actions.markExpensePaid>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(403);
  });

  it("400 on invalid date format", async () => {
    const result = await actions.markExpensePaid({
      request: makeRequest({ ...validData, today: "17/05/2026" }),
      locals: makeLocals(),
    } as unknown as Parameters<typeof actions.markExpensePaid>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(400);
  });

  it("400 on negative amount", async () => {
    const result = await actions.markExpensePaid({
      request: makeRequest({ ...validData, amount: "-50" }),
      locals: makeLocals(),
    } as unknown as Parameters<typeof actions.markExpensePaid>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(400);
  });

  it("404 when expense does not belong to clinic", async () => {
    const result = await actions.markExpensePaid({
      request: makeRequest(validData),
      locals: makeLocals({ expenseExists: false }),
    } as unknown as Parameters<typeof actions.markExpensePaid>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(404);
  });

  it("400 on DB insert error", async () => {
    const result = await actions.markExpensePaid({
      request: makeRequest(validData),
      locals: makeLocals({ financeInsertError: { message: "constraint" } }),
    } as unknown as Parameters<typeof actions.markExpensePaid>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(400);
  });
});

// ── closeMonth ────────────────────────────────────────────────────────────────

describe("closeMonth", () => {
  const validData = { month_year: MONTH_YEAR };

  it("closes a fresh month (no prior closure)", async () => {
    const result = await actions.closeMonth({
      request: makeRequest(validData),
      locals: makeLocals({ existingClosure: null }),
    } as unknown as Parameters<typeof actions.closeMonth>[0]);
    expect(result).toEqual({ success: true, action: "closeMonth" });
  });

  it("closes a month that was previously reopened", async () => {
    const result = await actions.closeMonth({
      request: makeRequest(validData),
      locals: makeLocals({
        existingClosure: {
          id: CLOSURE_UUID,
          log: [{ action: "reopened", at: "2026-05-10T00:00:00Z" }],
        },
      }),
    } as unknown as Parameters<typeof actions.closeMonth>[0]);
    expect(result).toEqual({ success: true, action: "closeMonth" });
  });

  it("401 when no authenticated user", async () => {
    const result = await actions.closeMonth({
      request: makeRequest(validData),
      locals: makeLocals({ user: null }),
    } as unknown as Parameters<typeof actions.closeMonth>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(401);
  });

  it("403 when therapist not found", async () => {
    const result = await actions.closeMonth({
      request: makeRequest(validData),
      locals: makeLocals({ noTherapist: true }),
    } as unknown as Parameters<typeof actions.closeMonth>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(403);
  });

  it("400 on invalid month_year format", async () => {
    const result = await actions.closeMonth({
      request: makeRequest({ month_year: "04-2026" }),
      locals: makeLocals(),
    } as unknown as Parameters<typeof actions.closeMonth>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(400);
  });

  it("400 on DB upsert error", async () => {
    const result = await actions.closeMonth({
      request: makeRequest(validData),
      locals: makeLocals({ upsertError: { message: "unique_violation" } }),
    } as unknown as Parameters<typeof actions.closeMonth>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(400);
  });
});

// ── reopenMonth ───────────────────────────────────────────────────────────────

describe("reopenMonth", () => {
  const validData = { closure_id: CLOSURE_UUID, month_year: MONTH_YEAR };

  it("reopens a closed month (solo mode, no push log)", async () => {
    const result = await actions.reopenMonth({
      request: makeRequest(validData),
      locals: makeLocals({ therapistCount: 1 }),
    } as unknown as Parameters<typeof actions.reopenMonth>[0]);
    expect(result).toEqual({ success: true, action: "reopenMonth" });
  });

  it("reopens a closed month in clinic mode (push log fires)", async () => {
    const result = await actions.reopenMonth({
      request: makeRequest(validData),
      locals: makeLocals({ therapistCount: 3 }),
    } as unknown as Parameters<typeof actions.reopenMonth>[0]);
    expect(result).toEqual({ success: true, action: "reopenMonth" });
  });

  it("401 when no authenticated user", async () => {
    const result = await actions.reopenMonth({
      request: makeRequest(validData),
      locals: makeLocals({ user: null }),
    } as unknown as Parameters<typeof actions.reopenMonth>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(401);
  });

  it("403 when therapist not found", async () => {
    const result = await actions.reopenMonth({
      request: makeRequest(validData),
      locals: makeLocals({ noTherapist: true }),
    } as unknown as Parameters<typeof actions.reopenMonth>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(403);
  });

  it("400 on non-UUID closure_id", async () => {
    const result = await actions.reopenMonth({
      request: makeRequest({
        closure_id: "not-a-uuid",
        month_year: MONTH_YEAR,
      }),
      locals: makeLocals(),
    } as unknown as Parameters<typeof actions.reopenMonth>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(400);
  });

  it("400 on invalid month_year format", async () => {
    const result = await actions.reopenMonth({
      request: makeRequest({ closure_id: CLOSURE_UUID, month_year: "2026/04" }),
      locals: makeLocals(),
    } as unknown as Parameters<typeof actions.reopenMonth>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(400);
  });

  it("404 when closure not found", async () => {
    const result = await actions.reopenMonth({
      request: makeRequest(validData),
      locals: makeLocals({ closureExists: false }),
    } as unknown as Parameters<typeof actions.reopenMonth>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(404);
  });

  it("400 on DB update error", async () => {
    const result = await actions.reopenMonth({
      request: makeRequest(validData),
      locals: makeLocals({ closureUpdateError: { message: "db error" } }),
    } as unknown as Parameters<typeof actions.reopenMonth>[0]);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(400);
  });
});
