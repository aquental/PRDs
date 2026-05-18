/**
 * Tests for /app/patients/[id] +page.server.ts actions.
 *
 * Covers: auth/ownership guards, Zod validation, CPF valid/invalid/duplicate,
 * start_date, notes, and generic DB errors on the update action.
 */
import { describe, it, expect, vi } from "vitest";
import { isActionFailure } from "@sveltejs/kit";
import { actions } from "./+page.server";

// ── module mock ───────────────────────────────────────────────────────────────

vi.mock("$lib/redis", () => ({
  invalidateDashboard: vi.fn().mockResolvedValue(undefined),
}));

// ── constants ─────────────────────────────────────────────────────────────────

const USER = { id: "user-1" };
const THERAPIST = { id: "therapist-1" };
const PATIENT = { id: "patient-1" };
const PATIENT_ID = "patient-1";
const VALID_CPF_RAW = "52998224725";
const VALID_CPF_MASKED = "529.982.247-25";

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Build locals for the [id] route.
 *
 * The `patients` table is queried twice:
 *   1. assertPatientOwnership: .select("id").eq().eq().single()
 *   2. update mutation:        .update({}).eq().eq()
 *
 * Both calls hit the same returned chain object. `select` and `update` are
 * independent entry points, so they do not collide.
 */
function makeLocals({
  user = USER as { id: string } | null,
  therapistData = THERAPIST as typeof THERAPIST | null,
  patientData = PATIENT as typeof PATIENT | null,
  dbError = null as { message: string; code?: string } | null,
} = {}) {
  const patientsChain = {
    // ownership check branch: .select().eq().eq().single()
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: patientData, error: null }),
    // mutation branch: .update().eq().eq()
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: dbError }),
      }),
    }),
  };

  const fromMock = vi.fn((table: string) => {
    if (table === "therapists") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: therapistData, error: null }),
      };
    }
    return patientsChain;
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

// ── update ─────────────────────────────────────────────────────────────────────

describe("update", () => {
  const validData = { name: "Ana Souza", email: "ana@example.com" };

  it("happy path: valid data returns success", async () => {
    const locals = makeLocals();
    const result = await actions.update({
      request: makeRequest(validData),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(result).toEqual({ success: true });
  });

  it("unauthenticated → 401", async () => {
    const locals = makeLocals({ user: null });
    const result = await actions.update({
      request: makeRequest(validData),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(401);
  });

  it("therapist not found → 403", async () => {
    const locals = makeLocals({ therapistData: null });
    const result = await actions.update({
      request: makeRequest(validData),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(403);
  });

  it("patient not found (ownership) → 404", async () => {
    const locals = makeLocals({ patientData: null });
    const result = await actions.update({
      request: makeRequest(validData),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(404);
  });

  it("missing name → 400 with name field error", async () => {
    const locals = makeLocals();
    const result = await actions.update({
      request: makeRequest({ email: "ana@example.com" }),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      const error = (
        result.data as unknown as { error: Record<string, unknown> }
      ).error;
      expect(error).toHaveProperty("name");
    }
  });

  it("invalid email format → 400 with email field error", async () => {
    const locals = makeLocals();
    const result = await actions.update({
      request: makeRequest({ name: "Ana Souza", email: "not-an-email" }),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      const error = (
        result.data as unknown as { error: Record<string, unknown> }
      ).error;
      expect(error).toHaveProperty("email");
    }
  });

  // ── CPF ─────────────────────────────────────────────────────────────────────

  it("valid raw CPF → success", async () => {
    const locals = makeLocals();
    const result = await actions.update({
      request: makeRequest({ ...validData, cpf: VALID_CPF_RAW }),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(result).toEqual({ success: true });
  });

  it("valid masked CPF → success", async () => {
    const locals = makeLocals();
    const result = await actions.update({
      request: makeRequest({ ...validData, cpf: VALID_CPF_MASKED }),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(result).toEqual({ success: true });
  });

  it("empty CPF string → treated as null → success", async () => {
    const locals = makeLocals();
    const result = await actions.update({
      request: makeRequest({ ...validData, cpf: "" }),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(result).toEqual({ success: true });
  });

  it("invalid CPF check digits → 400 with cpf error", async () => {
    const locals = makeLocals();
    const result = await actions.update({
      request: makeRequest({ ...validData, cpf: "12345678901" }),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      const error = (
        result.data as unknown as { error: Record<string, unknown> }
      ).error;
      expect(error).toHaveProperty("cpf");
    }
  });

  it("all-same CPF (11111111111) → 400 with cpf error", async () => {
    const locals = makeLocals();
    const result = await actions.update({
      request: makeRequest({ ...validData, cpf: "11111111111" }),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      const error = (
        result.data as unknown as { error: Record<string, unknown> }
      ).error;
      expect(error).toHaveProperty("cpf");
    }
  });

  it("duplicate CPF (23505) → 409 with cpf field error", async () => {
    const locals = makeLocals({
      dbError: { message: "unique violation", code: "23505" },
    });
    const result = await actions.update({
      request: makeRequest({ ...validData, cpf: VALID_CPF_RAW }),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(409);
      const error = (
        result.data as unknown as { error: Record<string, unknown> }
      ).error;
      expect(error).toHaveProperty("cpf");
    }
  });

  // ── start_date ───────────────────────────────────────────────────────────────

  it("valid start_date (YYYY-MM-DD) → success", async () => {
    const locals = makeLocals();
    const result = await actions.update({
      request: makeRequest({ ...validData, start_date: "2025-03-10" }),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(result).toEqual({ success: true });
  });

  it("invalid start_date format → 400 with start_date error", async () => {
    const locals = makeLocals();
    const result = await actions.update({
      request: makeRequest({ ...validData, start_date: "31-01-2025" }),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      const error = (
        result.data as unknown as { error: Record<string, unknown> }
      ).error;
      expect(error).toHaveProperty("start_date");
    }
  });

  it("empty start_date → treated as null → success", async () => {
    const locals = makeLocals();
    const result = await actions.update({
      request: makeRequest({ ...validData, start_date: "" }),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(result).toEqual({ success: true });
  });

  // ── notes ─────────────────────────────────────────────────────────────────────

  it("notes provided → success", async () => {
    const locals = makeLocals();
    const result = await actions.update({
      request: makeRequest({
        ...validData,
        notes: "Paciente com histórico...",
      }),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(result).toEqual({ success: true });
  });

  // ── generic DB error ──────────────────────────────────────────────────────────

  it("generic DB error → 400", async () => {
    const locals = makeLocals({ dbError: { message: "connection error" } });
    const result = await actions.update({
      request: makeRequest(validData),
      locals,
      params: { id: PATIENT_ID },
    } as unknown as Parameters<typeof actions.update>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(400);
  });
});
