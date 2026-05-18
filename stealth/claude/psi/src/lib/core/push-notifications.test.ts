import { describe, expect, it } from "vitest";
import {
  generateDuePaymentsPush,
  generateMonthCloseReminderPush,
  generateMonthReopenedPush,
  generateUnregisteredSessionsPush,
} from "./push-notifications";
import type { DuePayment, MonthClosure, OperationalSession } from "./types";

// ─────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────

const TZ = "America/Sao_Paulo";

/** Build a Date for a specific local hour in São Paulo. */
function spDate(isoDate: string, localHour: number): Date {
  // isoDate = "2026-05-17" → parse as midnight UTC then shift to hit the right local hour
  const base = new Date(`${isoDate}T00:00:00`);
  // Brazil is UTC-3 (no DST in winter). The offset is baked in via the date string.
  // Easier: use a fixed UTC offset string.
  return new Date(
    `${isoDate}T${String(localHour).padStart(2, "0")}:00:00-03:00`,
  );
}

function makeSession(
  overrides: Partial<OperationalSession> = {},
): OperationalSession {
  return {
    id: "s1",
    patientId: "p1",
    patientName: "Ana Silva",
    scheduledAt: "2026-05-17T17:00:00Z", // 14h BRT
    durationMinutes: 50,
    fee: 180,
    status: "scheduled",
    paid: false,
    ...overrides,
  };
}

function makePayment(overrides: Partial<DuePayment> = {}): DuePayment {
  return {
    id: "e1",
    description: "Internet",
    amount: 120,
    dueDate: "2026-05-17",
    paid: false,
    ...overrides,
  };
}

function makeClosure(overrides: Partial<MonthClosure> = {}): MonthClosure {
  return {
    id: "c1",
    clinicId: "cl1",
    therapistId: "t1",
    monthYear: "2026-04",
    status: "closed",
    log: [
      {
        action: "closed",
        at: "2026-05-01T10:00:00Z",
        by: "Ana Terapeuta",
        role: "profissional",
      },
    ],
    createdAt: "2026-05-01T10:00:00Z",
    updatedAt: "2026-05-01T10:00:00Z",
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
// generateUnregisteredSessionsPush
// ─────────────────────────────────────────────────────────────

describe("generateUnregisteredSessionsPush", () => {
  it("returns payload inside 18h-20h window with unregistered sessions", () => {
    const now = spDate("2026-05-17", 18);
    const session = makeSession();
    const result = generateUnregisteredSessionsPush(now, [session], TZ);
    expect(result).not.toBeNull();
    expect(result?.trigger).toBe("unregistered_sessions");
    expect(result?.data?.count).toBe(1);
  });

  it("returns null before 18h (quiet day)", () => {
    const now = spDate("2026-05-17", 17);
    expect(
      generateUnregisteredSessionsPush(now, [makeSession()], TZ),
    ).toBeNull();
  });

  it("returns null at 20h (exclusive upper bound)", () => {
    const now = spDate("2026-05-17", 20);
    expect(
      generateUnregisteredSessionsPush(now, [makeSession()], TZ),
    ).toBeNull();
  });

  it("returns null when all sessions are registered", () => {
    const now = spDate("2026-05-17", 18);
    const session = makeSession({ status: "completed" });
    expect(generateUnregisteredSessionsPush(now, [session], TZ)).toBeNull();
  });

  it("returns null when sessions are from a different day", () => {
    const now = spDate("2026-05-17", 18);
    const session = makeSession({ scheduledAt: "2026-05-16T17:00:00Z" });
    expect(generateUnregisteredSessionsPush(now, [session], TZ)).toBeNull();
  });

  it("counts multiple unregistered sessions correctly", () => {
    const now = spDate("2026-05-17", 19);
    const sessions = [
      makeSession({ id: "s1" }),
      makeSession({ id: "s2" }),
      makeSession({ id: "s3", status: "completed" }), // already registered
    ];
    const result = generateUnregisteredSessionsPush(now, sessions, TZ);
    expect(result?.data?.count).toBe(2);
    expect(result?.body).toContain("2 sessões");
  });

  it("uses singular form for exactly 1 session", () => {
    const now = spDate("2026-05-17", 18);
    const result = generateUnregisteredSessionsPush(now, [makeSession()], TZ);
    expect(result?.body).toContain("1 sessão");
    expect(result?.body).not.toContain("sessões");
  });
});

// ─────────────────────────────────────────────────────────────
// generateDuePaymentsPush
// ─────────────────────────────────────────────────────────────

describe("generateDuePaymentsPush", () => {
  it("returns payload inside 7h-9h with overdue payment", () => {
    const now = spDate("2026-05-17", 8);
    const result = generateDuePaymentsPush(now, [makePayment()], TZ);
    expect(result).not.toBeNull();
    expect(result?.trigger).toBe("due_payments");
  });

  it("returns null before 7h", () => {
    const now = spDate("2026-05-17", 6);
    expect(generateDuePaymentsPush(now, [makePayment()], TZ)).toBeNull();
  });

  it("returns null at 9h (exclusive)", () => {
    const now = spDate("2026-05-17", 9);
    expect(generateDuePaymentsPush(now, [makePayment()], TZ)).toBeNull();
  });

  it("returns null when all payments are paid", () => {
    const now = spDate("2026-05-17", 8);
    expect(
      generateDuePaymentsPush(now, [makePayment({ paid: true })], TZ),
    ).toBeNull();
  });

  it("returns null on a quiet day (no due/overdue payments)", () => {
    const now = spDate("2026-05-17", 8);
    const future = makePayment({ dueDate: "2026-06-01" });
    expect(generateDuePaymentsPush(now, [future], TZ)).toBeNull();
  });

  it("includes extra count in body for multiple due payments", () => {
    const now = spDate("2026-05-17", 8);
    const payments = [
      makePayment({ id: "e1", description: "Internet" }),
      makePayment({ id: "e2", description: "Aluguel" }),
      makePayment({ id: "e3", description: "Luz" }),
    ];
    const result = generateDuePaymentsPush(now, payments, TZ);
    expect(result?.body).toContain("mais 2 contas");
    expect(result?.data?.count).toBe(3);
  });

  it("uses singular 'conta' for exactly 2 payments (1 extra)", () => {
    const now = spDate("2026-05-17", 8);
    const payments = [makePayment({ id: "e1" }), makePayment({ id: "e2" })];
    const result = generateDuePaymentsPush(now, payments, TZ);
    expect(result?.body).toContain("mais 1 conta.");
  });

  it("considers payments due in the past as overdue", () => {
    const now = spDate("2026-05-17", 8);
    const overdue = makePayment({ dueDate: "2026-05-01" });
    expect(generateDuePaymentsPush(now, [overdue], TZ)).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// generateMonthCloseReminderPush
// ─────────────────────────────────────────────────────────────

describe("generateMonthCloseReminderPush", () => {
  it("returns payload on day 1 between 8h-10h", () => {
    const now = spDate("2026-06-01", 8);
    const result = generateMonthCloseReminderPush(now, TZ);
    expect(result).not.toBeNull();
    expect(result?.trigger).toBe("month_close_reminder");
    expect(result?.body).toContain("maio");
    expect(result?.data?.monthYear).toBe("2026-05");
  });

  it("returns null on day 2", () => {
    const now = spDate("2026-06-02", 8);
    expect(generateMonthCloseReminderPush(now, TZ)).toBeNull();
  });

  it("returns null on day 1 before 8h", () => {
    const now = spDate("2026-06-01", 7);
    expect(generateMonthCloseReminderPush(now, TZ)).toBeNull();
  });

  it("returns null on day 1 at 10h (exclusive)", () => {
    const now = spDate("2026-06-01", 10);
    expect(generateMonthCloseReminderPush(now, TZ)).toBeNull();
  });

  it("refers to december when triggered on January 1st", () => {
    const now = spDate("2026-01-01", 9);
    const result = generateMonthCloseReminderPush(now, TZ);
    expect(result?.body).toContain("dezembro");
    expect(result?.data?.monthYear).toBe("2025-12");
  });
});

// ─────────────────────────────────────────────────────────────
// generateMonthReopenedPush
// ─────────────────────────────────────────────────────────────

describe("generateMonthReopenedPush", () => {
  const reopenEntry = {
    action: "reopened" as const,
    at: "2026-05-17T15:00:00Z",
    by: "Ana Terapeuta",
    role: "profissional" as const,
  };

  it("returns payload when closure is currently closed", () => {
    const closure = makeClosure();
    const result = generateMonthReopenedPush(
      closure,
      reopenEntry,
      "Clínica Crescer",
    );
    expect(result).not.toBeNull();
    expect(result?.trigger).toBe("month_reopened");
    expect(result?.body).toContain("Ana Terapeuta");
    expect(result?.body).toContain("abril");
    expect(result?.data?.notifyName).toBe("Clínica Crescer");
  });

  it("returns null when closure is already open (no double-fire)", () => {
    const closure = makeClosure({ status: "open" });
    expect(
      generateMonthReopenedPush(closure, reopenEntry, "Clínica"),
    ).toBeNull();
  });

  it("encodes monthYear and role in data payload", () => {
    const closure = makeClosure({ monthYear: "2026-03" });
    const result = generateMonthReopenedPush(closure, reopenEntry, "Clínica");
    expect(result?.data?.monthYear).toBe("2026-03");
    expect(result?.data?.role).toBe("profissional");
  });

  it("links to operations page", () => {
    const closure = makeClosure();
    const result = generateMonthReopenedPush(closure, reopenEntry, "X");
    expect(result?.url).toBe("/app/operations");
  });
});
