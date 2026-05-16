/**
 * Tests for /app/patients +page.server.ts actions.
 *
 * Covers: email required validation, email format validation, auth guards, and
 * happy-path creation. Uses the same table-aware mock pattern as sessions tests.
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

// ── helpers ───────────────────────────────────────────────────────────────────

function makeLocals({
  user = USER as { id: string } | null,
  therapistResult = { data: THERAPIST, error: null } as {
    data: typeof THERAPIST | null;
    error: { message: string } | null;
  },
  dbError = null as { message: string } | null,
} = {}) {
  const therapistChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(therapistResult),
  };

  const fromMock = vi.fn((table: string) => {
    if (table === "therapists") return therapistChain;
    return {
      insert: vi.fn().mockResolvedValue({ data: null, error: dbError }),
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

// ── create ────────────────────────────────────────────────────────────────────

describe("create", () => {
  const validData = {
    name: "Ana Souza",
    email: "ana@example.com",
    phone: "11999990001",
    session_fee: "200",
  };

  it("happy path: valid name + email returns success", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest(validData),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(result).toEqual({ success: true });
  });

  it("unauthenticated → 401", async () => {
    const locals = makeLocals({ user: null });
    const result = await actions.create({
      request: makeRequest(validData),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(401);
  });

  it("therapist not found → 403", async () => {
    const locals = makeLocals({
      therapistResult: { data: null, error: null },
    });
    const result = await actions.create({
      request: makeRequest(validData),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) expect(result.status).toBe(403);
  });

  it("missing name → 400 with name field error", async () => {
    const locals = makeLocals();
    const { name: _omit, ...data } = validData;
    const result = await actions.create({
      request: makeRequest(data),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      const error = (result.data as { error: Record<string, unknown> }).error;
      expect(error).toHaveProperty("name");
    }
  });

  it("missing email → 400 with email field error", async () => {
    const locals = makeLocals();
    const { email: _omit, ...data } = validData;
    const result = await actions.create({
      request: makeRequest(data),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      const error = (result.data as { error: Record<string, unknown> }).error;
      expect(error).toHaveProperty("email");
    }
  });

  it("empty email string → 400 with email field error", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest({ ...validData, email: "" }),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      const error = (result.data as { error: Record<string, unknown> }).error;
      expect(error).toHaveProperty("email");
    }
  });

  it("invalid email format → 400 with email field error", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest({ ...validData, email: "not-an-email" }),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      const error = (result.data as { error: Record<string, unknown> }).error;
      expect(error).toHaveProperty("email");
    }
  });

  it("missing both name and email → 400 with errors for both fields", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest({ phone: "11999990001" }),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      const error = (result.data as { error: Record<string, unknown> }).error;
      expect(error).toHaveProperty("name");
      expect(error).toHaveProperty("email");
    }
  });

  it("whitespace-only email → 400 with email field error", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest({ ...validData, email: "   " }),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      const error = (result.data as { error: Record<string, unknown> }).error;
      expect(error).toHaveProperty("email");
    }
  });

  it("DB insert error → 400 with _ error", async () => {
    const locals = makeLocals({ dbError: { message: "insert failed" } });
    const result = await actions.create({
      request: makeRequest(validData),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      const error = (result.data as { error: Record<string, unknown> }).error;
      expect(error).toHaveProperty("_");
    }
  });

  it("optional fields absent → success (only name + email required)", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest({ name: "Minimal Patient", email: "min@test.com" }),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(result).toEqual({ success: true });
  });

  it("valid email with subdomain → success", async () => {
    const locals = makeLocals();
    const result = await actions.create({
      request: makeRequest({
        ...validData,
        email: "user@mail.example.com.br",
      }),
      locals,
    } as unknown as Parameters<typeof actions.create>[0]);

    expect(result).toEqual({ success: true });
  });
});
