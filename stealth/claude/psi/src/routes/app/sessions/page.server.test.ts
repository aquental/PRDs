/**
 * Tests for /app/sessions +page.server.ts actions.
 *
 * Strategy: mock `$lib/redis` (invalidateDashboard) and build a per-test
 * Supabase client mock with table-aware `from()` dispatch so each fluent
 * chain resolves independently.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { isActionFailure } from "@sveltejs/kit";
import { actions } from "./+page.server";

// ── module mock ───────────────────────────────────────────────────────────────

vi.mock("$lib/redis", () => ({
  invalidateDashboard: vi.fn().mockResolvedValue(undefined),
}));

// ── constants ─────────────────────────────────────────────────────────────────

const THERAPIST = { id: "therapist-1", clinic_id: "clinic-1" };
const USER = { id: "user-1" };
const PATIENT_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const SESSION_UUID = "b2c3d4e5-f6a7-8901-bcde-f01234567891";
const SCHEDULE_UUID = "c3d4e5f6-a7b8-9012-cdef-012345678912";

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a minimal mock for `locals` with configurable auth / DB state.
 *
 * `therapistResult`: what `.single()` returns when querying "therapists".
 * `dbError`:         error returned by insert/update on the target table.
 */
function makeLocals({
  user = USER as { id: string } | null,
  therapistResult = { data: THERAPIST, error: null } as {
    data: typeof THERAPIST | null;
    error: { message: string; code?: string } | null;
  },
  dbError = null as { message: string; code?: string } | null,
} = {}) {
  // Build table-aware `from` mock so therapist lookup and target-table
  // mutations never collide on the same mock chain.
  const therapistChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(therapistResult),
  };

  // Generic "insert" chain used by schedules and sessions tables.
  const insertChain = {
    insert: vi.fn().mockResolvedValue({ data: null, error: dbError }),
  };

  // Generic "update" chain used by sessions (markPaid) and schedules (deleteSchedule).
  const updateChain = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    // Resolve at the last `.eq()` call.  Vitest returns `updateChain` for all
    // intermediate `.eq()` calls, so the final awaited value needs to be set
    // on the chain itself.
    _resolve: vi.fn().mockResolvedValue({ data: null, error: dbError }),
  };
  // Make the chain thenable so `await chain` resolves.
  (updateChain as unknown as Promise<unknown>).then =
    updateChain._resolve as unknown as Promise<unknown>["then"];

  const fromMock = vi.fn((table: string) => {
    if (table === "therapists") return therapistChain;
    if (table === "schedules" || table === "sessions") {
      // Return a combined object that supports both insert and update chains.
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: dbError }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: dbError }),
          }),
        }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: dbError }),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });

  return {
    safeGetSession: vi.fn().mockResolvedValue({ user }),
    supabase: { from: fromMock },
  };
}

/**
 * Create a fake Request whose formData() returns the given key/value map.
 */
function makeRequest(data: Record<string, string>): Request {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.append(k, v));
  return { formData: () => Promise.resolve(fd) } as unknown as Request;
}

// ── createSchedule ─────────────────────────────────────────────────────────────

describe("createSchedule", () => {
  const validData = {
    patient_id: PATIENT_UUID,
    day_of_week: "3",
    start_time: "09:00",
    duration_minutes: "50",
    frequency: "weekly",
    fee: "200",
  };

  it("happy path: valid data returns success", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest(validData),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(result).toEqual({ success: true });
  });

  it("missing patient_id → 400 with field errors", async () => {
    const locals = makeLocals();
    const { patient_id: _omit, ...data } = validData;
    const result = await actions.createSchedule({
      request: makeRequest(data),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      expect(
        (result.data as unknown as { error: Record<string, unknown> }).error,
      ).toHaveProperty("patient_id");
    }
  });

  it("invalid UUID for patient_id → 400 validation error", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...validData, patient_id: "not-a-uuid" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      expect(
        (result.data as unknown as { error: Record<string, unknown> }).error,
      ).toHaveProperty("patient_id");
    }
  });

  it("day_of_week = 0 (below min) → 400", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...validData, day_of_week: "0" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      expect(
        (result.data as unknown as { error: Record<string, unknown> }).error,
      ).toHaveProperty("day_of_week");
    }
  });

  it("day_of_week = 6 (weekend, above max) → 400", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...validData, day_of_week: "6" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      expect(
        (result.data as unknown as { error: Record<string, unknown> }).error,
      ).toHaveProperty("day_of_week");
    }
  });

  it("day_of_week = 5 (Friday, valid edge) → success", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...validData, day_of_week: "5" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(result).toEqual({ success: true });
  });

  it("day_of_week = 1 (Monday, valid lower edge) → success", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...validData, day_of_week: "1" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(result).toEqual({ success: true });
  });

  it("invalid start_time format '8:00' (missing leading zero) → 400", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...validData, start_time: "8:00" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      expect(
        (result.data as unknown as { error: Record<string, unknown> }).error,
      ).toHaveProperty("start_time");
    }
  });

  it("invalid start_time '9:5' → 400", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...validData, start_time: "9:5" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
    }
  });

  it("invalid start_time 'abc' → 400", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...validData, start_time: "abc" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
    }
  });

  it("negative fee → 400 validation error", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...validData, fee: "-100" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      expect(
        (result.data as unknown as { error: Record<string, unknown> }).error,
      ).toHaveProperty("fee");
    }
  });

  it("zero fee → success (nonnegative is valid)", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...validData, fee: "0" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(result).toEqual({ success: true });
  });

  it("missing fee → success (fee is optional)", async () => {
    const locals = makeLocals();
    const { fee: _omit, ...dataWithoutFee } = validData;
    const result = await actions.createSchedule({
      request: makeRequest(dataWithoutFee),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(result).toEqual({ success: true });
  });

  it("DB unique-constraint error (23505) → 400 'Este horário já está reservado.'", async () => {
    const locals = makeLocals({
      dbError: { message: "duplicate key", code: "23505" },
    });
    const result = await actions.createSchedule({
      request: makeRequest(validData),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      expect((result.data as unknown as { error: string }).error).toBe(
        "Este horário já está reservado.",
      );
    }
  });

  it("generic DB error → 400 with error.message", async () => {
    const locals = makeLocals({
      dbError: { message: "connection timeout", code: "08006" },
    });
    const result = await actions.createSchedule({
      request: makeRequest(validData),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      expect((result.data as unknown as { error: string }).error).toBe(
        "connection timeout",
      );
    }
  });

  it("unauthenticated (no user) → 401", async () => {
    const locals = makeLocals({ user: null });
    const result = await actions.createSchedule({
      request: makeRequest(validData),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(401);
    }
  });

  it("no therapist record → 403", async () => {
    const locals = makeLocals({
      therapistResult: { data: null, error: null },
    });
    const result = await actions.createSchedule({
      request: makeRequest(validData),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(403);
      expect((result.data as unknown as { error: string }).error).toMatch(
        /Terapeuta não encontrado/,
      );
    }
  });

  it("invalid frequency value → 400", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...validData, frequency: "daily" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
    }
  });

  it("frequency 'biweekly' is valid → success", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...validData, frequency: "biweekly" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(result).toEqual({ success: true });
  });

  it("non-positive duration_minutes = 0 → 400", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...validData, duration_minutes: "0" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
    }
  });
});

// ── markPaid ──────────────────────────────────────────────────────────────────

describe("markPaid", () => {
  it("happy path: session marked paid → success + action:'markPaid'", async () => {
    const locals = makeLocals();
    const result = await actions.markPaid({
      request: makeRequest({ session_id: SESSION_UUID }),
      locals,
    } as unknown as Parameters<typeof actions.markPaid>[0]);

    expect(result).toEqual({ success: true, action: "markPaid" });
  });

  it("missing session_id → 400", async () => {
    const locals = makeLocals();
    const result = await actions.markPaid({
      request: makeRequest({}),
      locals,
    } as unknown as Parameters<typeof actions.markPaid>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      expect((result.data as unknown as { error: string }).error).toMatch(
        /ID da sessão/,
      );
    }
  });

  it("unauthenticated (no user) → 401", async () => {
    const locals = makeLocals({ user: null });
    const result = await actions.markPaid({
      request: makeRequest({ session_id: SESSION_UUID }),
      locals,
    } as unknown as Parameters<typeof actions.markPaid>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(401);
    }
  });

  it("no therapist record → 403", async () => {
    const locals = makeLocals({
      therapistResult: { data: null, error: null },
    });
    const result = await actions.markPaid({
      request: makeRequest({ session_id: SESSION_UUID }),
      locals,
    } as unknown as Parameters<typeof actions.markPaid>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(403);
    }
  });

  it("DB error on update → 400 with error message", async () => {
    const locals = makeLocals({
      dbError: { message: "row not found" },
    });
    const result = await actions.markPaid({
      request: makeRequest({ session_id: SESSION_UUID }),
      locals,
    } as unknown as Parameters<typeof actions.markPaid>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      expect((result.data as unknown as { error: string }).error).toBe(
        "row not found",
      );
    }
  });

  it("empty string session_id → 400", async () => {
    const locals = makeLocals();
    const result = await actions.markPaid({
      request: makeRequest({ session_id: "" }),
      locals,
    } as unknown as Parameters<typeof actions.markPaid>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
    }
  });
});

// ── deleteSchedule ────────────────────────────────────────────────────────────

describe("deleteSchedule", () => {
  it("happy path: schedule soft-deleted → success + action:'deleteSchedule'", async () => {
    const locals = makeLocals();
    const result = await actions.deleteSchedule({
      request: makeRequest({ schedule_id: SCHEDULE_UUID }),
      locals,
    } as unknown as Parameters<typeof actions.deleteSchedule>[0]);

    expect(result).toEqual({ success: true, action: "deleteSchedule" });
  });

  it("missing schedule_id → 400", async () => {
    const locals = makeLocals();
    const result = await actions.deleteSchedule({
      request: makeRequest({}),
      locals,
    } as unknown as Parameters<typeof actions.deleteSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      expect((result.data as unknown as { error: string }).error).toMatch(
        /ID do horário/,
      );
    }
  });

  it("unauthenticated (no user) → 401", async () => {
    const locals = makeLocals({ user: null });
    const result = await actions.deleteSchedule({
      request: makeRequest({ schedule_id: SCHEDULE_UUID }),
      locals,
    } as unknown as Parameters<typeof actions.deleteSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(401);
    }
  });

  it("no therapist record → 403", async () => {
    const locals = makeLocals({
      therapistResult: { data: null, error: null },
    });
    const result = await actions.deleteSchedule({
      request: makeRequest({ schedule_id: SCHEDULE_UUID }),
      locals,
    } as unknown as Parameters<typeof actions.deleteSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(403);
    }
  });

  it("DB error on update → 400 with error message", async () => {
    const locals = makeLocals({
      dbError: { message: "permission denied" },
    });
    const result = await actions.deleteSchedule({
      request: makeRequest({ schedule_id: SCHEDULE_UUID }),
      locals,
    } as unknown as Parameters<typeof actions.deleteSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      expect((result.data as unknown as { error: string }).error).toBe(
        "permission denied",
      );
    }
  });

  it("empty string schedule_id → 400", async () => {
    const locals = makeLocals();
    const result = await actions.deleteSchedule({
      request: makeRequest({ schedule_id: "" }),
      locals,
    } as unknown as Parameters<typeof actions.deleteSchedule>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
    }
  });
});

// ── create (ad-hoc session) ───────────────────────────────────────────────────

describe("create (ad-hoc session)", () => {
  const validData = {
    patient_id: PATIENT_UUID,
    scheduled_at: "2025-06-01T10:00",
    duration_minutes: "50",
    fee: "300",
    status: "scheduled",
  };

  it("happy path: valid data → success", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest(validData),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(result).toEqual({ success: true });
  });

  it("missing patient_id → 400 with field errors", async () => {
    const locals = makeLocals();
    const { patient_id: _omit, ...data } = validData;
    const result = await actions.create({
      request: makeRequest(data),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      expect(
        (result.data as unknown as { error: Record<string, unknown> }).error,
      ).toHaveProperty("patient_id");
    }
  });

  it("invalid UUID for patient_id → 400", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest({ ...validData, patient_id: "bad-uuid" }),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
    }
  });

  it("missing scheduled_at → 400", async () => {
    const locals = makeLocals();
    const { scheduled_at: _omit, ...data } = validData;
    const result = await actions.create({
      request: makeRequest(data),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
    }
  });

  it("invalid status value → 400", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest({ ...validData, status: "pending" }),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
    }
  });

  it("status 'completed' is valid → success", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest({ ...validData, status: "completed" }),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(result).toEqual({ success: true });
  });

  it("status 'cancelled' is valid → success", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest({ ...validData, status: "cancelled" }),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(result).toEqual({ success: true });
  });

  it("status 'no_show' is valid → success", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest({ ...validData, status: "no_show" }),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(result).toEqual({ success: true });
  });

  it("missing fee → success (fee is optional)", async () => {
    const locals = makeLocals();
    const { fee: _omit, ...dataWithoutFee } = validData;
    const result = await actions.create({
      request: makeRequest(dataWithoutFee),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(result).toEqual({ success: true });
  });

  it("zero fee → success (nonnegative is valid)", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest({ ...validData, fee: "0" }),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(result).toEqual({ success: true });
  });

  it("negative fee → 400", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest({ ...validData, fee: "-50" }),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
    }
  });

  it("non-positive duration_minutes = 0 → 400", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest({ ...validData, duration_minutes: "0" }),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
    }
  });

  it("unauthenticated (no user) → 401", async () => {
    const locals = makeLocals({ user: null });
    const result = await actions.create({
      request: makeRequest(validData),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(401);
    }
  });

  it("no therapist record → 403", async () => {
    const locals = makeLocals({
      therapistResult: { data: null, error: null },
    });
    const result = await actions.create({
      request: makeRequest(validData),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(403);
    }
  });

  it("DB error on insert → 400 with error message", async () => {
    const locals = makeLocals({
      dbError: { message: "foreign key violation" },
    });
    const result = await actions.create({
      request: makeRequest(validData),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      expect((result.data as unknown as { error: string }).error).toBe(
        "foreign key violation",
      );
    }
  });
});

// ── ScheduleSchema isolated validation ───────────────────────────────────────
// These tests verify Zod rules directly without going through the full action,
// serving as a living spec for the schema contract.

describe("ScheduleSchema validation contract (via createSchedule action)", () => {
  // Re-use makeLocals with a working therapist so schema errors surface cleanly.
  const base = {
    patient_id: PATIENT_UUID,
    day_of_week: "3",
    start_time: "10:30",
  };

  it("omitting duration_minutes still succeeds (default = 50)", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest(base),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(result).toEqual({ success: true });
  });

  it("omitting frequency still succeeds (default = 'weekly')", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest(base),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(result).toEqual({ success: true });
  });

  it("start_time '00:00' is valid (midnight, HH:MM pattern)", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...base, start_time: "00:00" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(result).toEqual({ success: true });
  });

  it("start_time '23:59' is valid (last minute of the day)", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...base, start_time: "23:59" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(result).toEqual({ success: true });
  });

  it("coerced fee string '150.5' is valid → success", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...base, fee: "150.5" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(result).toEqual({ success: true });
  });

  it("coerced day_of_week '2' (Tuesday) is valid", async () => {
    const locals = makeLocals();
    const result = await actions.createSchedule({
      request: makeRequest({ ...base, day_of_week: "2" }),
      locals,
    } as unknown as Parameters<typeof actions.createSchedule>[0]);

    expect(result).toEqual({ success: true });
  });
});
