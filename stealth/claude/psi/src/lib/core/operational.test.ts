import { describe, expect, it } from "vitest";
import {
  classifyCancellation,
  computeRepasse,
  evaluateMonthClosure,
  canReopenMonth,
} from "./operational";
import type {
  CancellationPolicy,
  DuePayment,
  MonthClosure,
  OperationalSession,
} from "./types";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const policy24h: CancellationPolicy = { windowHours: 24 };

function makeSession(
  overrides: Partial<OperationalSession> = {},
): OperationalSession {
  return {
    id: "s1",
    patientId: "p1",
    patientName: "Ana Silva",
    scheduledAt: "2026-05-10T14:00:00Z",
    durationMinutes: 50,
    fee: 180,
    status: "scheduled",
    cancelledAt: null,
    paid: false,
    ...overrides,
  };
}

function makeClosure(overrides: Partial<MonthClosure> = {}): MonthClosure {
  return {
    id: "mc1",
    clinicId: "clinic1",
    therapistId: "t1",
    monthYear: "2026-05",
    status: "closed",
    log: [],
    createdAt: "2026-05-31T20:00:00Z",
    updatedAt: "2026-05-31T20:00:00Z",
    ...overrides,
  };
}

function makePayment(overrides: Partial<DuePayment> = {}): DuePayment {
  return {
    id: "pay1",
    description: "Aluguel",
    amount: 1200,
    dueDate: "2026-05-10",
    paid: false,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
// classifyCancellation
// ─────────────────────────────────────────────────────────────

describe("classifyCancellation", () => {
  it("sem cancelledAt → falta (ausência sem aviso)", () => {
    expect(classifyCancellation(null, "2026-05-10T14:00:00Z", policy24h)).toBe(
      "falta",
    );
  });

  it("sem cancelledAt (undefined) → falta", () => {
    expect(
      classifyCancellation(undefined, "2026-05-10T14:00:00Z", policy24h),
    ).toBe("falta");
  });

  it("cancelado 48h antes → abono", () => {
    expect(
      classifyCancellation(
        "2026-05-08T14:00:00Z",
        "2026-05-10T14:00:00Z",
        policy24h,
      ),
    ).toBe("abono");
  });

  it("cancelado 1h antes → falta", () => {
    expect(
      classifyCancellation(
        "2026-05-10T13:00:00Z",
        "2026-05-10T14:00:00Z",
        policy24h,
      ),
    ).toBe("falta");
  });

  it("cancelado exatamente na fronteira de 24h → abono (≥ aplica)", () => {
    expect(
      classifyCancellation(
        "2026-05-09T14:00:00Z",
        "2026-05-10T14:00:00Z",
        policy24h,
      ),
    ).toBe("abono");
  });

  it("cancelado após a sessão (retroativo) → falta", () => {
    expect(
      classifyCancellation(
        "2026-05-10T15:00:00Z",
        "2026-05-10T14:00:00Z",
        policy24h,
      ),
    ).toBe("falta");
  });

  it("override sempre_abona → abono independente de timestamp", () => {
    expect(
      classifyCancellation(
        "2026-05-10T13:59:00Z",
        "2026-05-10T14:00:00Z",
        policy24h,
        { policy: "sempre_abona" },
      ),
    ).toBe("abono");
  });

  it("override sempre_abona sem cancelledAt → abono", () => {
    expect(
      classifyCancellation(null, "2026-05-10T14:00:00Z", policy24h, {
        policy: "sempre_abona",
      }),
    ).toBe("abono");
  });

  it("override sempre_cobra → falta independente de antecedência", () => {
    expect(
      classifyCancellation(
        "2026-05-01T00:00:00Z",
        "2026-05-10T14:00:00Z",
        policy24h,
        { policy: "sempre_cobra" },
      ),
    ).toBe("falta");
  });

  it("override janela_custom 48h — cancelado 30h antes → abono", () => {
    expect(
      classifyCancellation(
        "2026-05-09T08:00:00Z",
        "2026-05-10T14:00:00Z",
        policy24h,
        { policy: "janela_custom", windowHours: 48 },
      ),
    ).toBe("falta");
  });

  it("override janela_custom 0h — qualquer cancelamento → abono", () => {
    expect(
      classifyCancellation(
        "2026-05-10T13:59:00Z",
        "2026-05-10T14:00:00Z",
        policy24h,
        { policy: "janela_custom", windowHours: 0 },
      ),
    ).toBe("abono");
  });

  it("override janela_custom sem windowHours → usa política global", () => {
    expect(
      classifyCancellation(
        "2026-05-09T14:00:00Z",
        "2026-05-10T14:00:00Z",
        policy24h,
        { policy: "janela_custom", windowHours: undefined },
      ),
    ).toBe("abono");
  });
});

// ─────────────────────────────────────────────────────────────
// computeRepasse
// ─────────────────────────────────────────────────────────────

describe("computeRepasse", () => {
  it("exemplo do spec: R$180, fixo=30, 40% → repasse=102, líquido=78", () => {
    const r = computeRepasse(180, { fixo: 30, percentual: 40 });
    expect(r.repasse).toBe(102);
    expect(r.liquido).toBe(78);
    expect(r.disabled).toBe(false);
  });

  it("fixo=0 e percentual=0 → repasse desativado", () => {
    const r = computeRepasse(180, { fixo: 0, percentual: 0 });
    expect(r.disabled).toBe(true);
    expect(r.repasse).toBe(0);
    expect(r.liquido).toBe(180);
  });

  it("fixo=0, percentual=50 → apenas percentual", () => {
    const r = computeRepasse(200, { fixo: 0, percentual: 50 });
    expect(r.repasse).toBe(100);
    expect(r.liquido).toBe(100);
    expect(r.disabled).toBe(false);
  });

  it("fixo=50, percentual=0 → apenas fixo", () => {
    const r = computeRepasse(200, { fixo: 50, percentual: 0 });
    expect(r.repasse).toBe(50);
    expect(r.liquido).toBe(150);
    expect(r.disabled).toBe(false);
  });

  it("sessionValue=0, fixo=30, percentual=40 → repasse=fixo, líquido negativo", () => {
    const r = computeRepasse(0, { fixo: 30, percentual: 40 });
    expect(r.repasse).toBe(30);
    expect(r.liquido).toBe(-30);
  });

  it("valores quebrados sem drift de ponto flutuante", () => {
    const r = computeRepasse(333.33, { fixo: 0, percentual: 30 });
    expect(r.repasse).toBe(100);
    expect(r.liquido).toBe(233.33);
  });

  it("fixo negativo é normalizado para zero", () => {
    const r = computeRepasse(180, { fixo: -10, percentual: 0 });
    expect(r.disabled).toBe(true);
  });

  it("sessionValue negativo é normalizado para zero", () => {
    const r = computeRepasse(-50, { fixo: 30, percentual: 0 });
    expect(r.repasse).toBe(30);
    expect(r.liquido).toBe(-30);
  });
});

// ─────────────────────────────────────────────────────────────
// evaluateMonthClosure
// ─────────────────────────────────────────────────────────────

describe("evaluateMonthClosure", () => {
  it("mês sem nada → pode fechar sem pendências", () => {
    const r = evaluateMonthClosure("2026-05", [], []);
    expect(r.canClose).toBe(true);
    expect(r.pendencies).toHaveLength(0);
  });

  it("todas as sessões concluídas e contas pagas → pode fechar", () => {
    const sessions = [
      makeSession({ status: "completed" }),
      makeSession({ id: "s2", status: "completed" }),
    ];
    const payments = [makePayment({ paid: true })];
    const r = evaluateMonthClosure("2026-05", sessions, payments);
    expect(r.canClose).toBe(true);
  });

  it("sessão sem registro (scheduled) no mês → pendência", () => {
    const r = evaluateMonthClosure(
      "2026-05",
      [makeSession({ status: "scheduled" })],
      [],
    );
    expect(r.canClose).toBe(false);
    expect(r.pendencies).toHaveLength(1);
    expect(r.pendencies[0].type).toBe("sessao_sem_registro");
  });

  it("conta atrasada não paga dentro do mês → pendência", () => {
    const r = evaluateMonthClosure(
      "2026-05",
      [],
      [makePayment({ paid: false })],
    );
    expect(r.canClose).toBe(false);
    expect(r.pendencies).toHaveLength(1);
    expect(r.pendencies[0].type).toBe("conta_atrasada");
  });

  it("pendências mistas: 2 sessões + 1 conta", () => {
    const sessions = [
      makeSession({ status: "scheduled" }),
      makeSession({ id: "s2", status: "scheduled", patientName: "Bruno" }),
    ];
    const payments = [makePayment()];
    const r = evaluateMonthClosure("2026-05", sessions, payments);
    expect(r.canClose).toBe(false);
    expect(r.pendencies).toHaveLength(3);
  });

  it("sessão do mês seguinte não é pendência", () => {
    const futureSession = makeSession({
      scheduledAt: "2026-06-01T10:00:00Z",
      status: "scheduled",
    });
    const r = evaluateMonthClosure("2026-05", [futureSession], []);
    expect(r.canClose).toBe(true);
  });

  it("conta vencendo no próximo mês não é pendência", () => {
    const r = evaluateMonthClosure(
      "2026-05",
      [],
      [makePayment({ dueDate: "2026-06-01", paid: false })],
    );
    expect(r.canClose).toBe(true);
  });

  it("conta vencida em meses anteriores não paga → pendência", () => {
    const r = evaluateMonthClosure(
      "2026-05",
      [],
      [makePayment({ dueDate: "2026-04-10", paid: false })],
    );
    expect(r.canClose).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// canReopenMonth
// ─────────────────────────────────────────────────────────────

describe("canReopenMonth", () => {
  it("mês já aberto → não pode reabrir", () => {
    const closure = makeClosure({ status: "open" });
    expect(canReopenMonth(closure, "profissional", false)).toBe(false);
    expect(canReopenMonth(closure, "clinica", true)).toBe(false);
  });

  it("profissional modo autônomo → pode reabrir", () => {
    expect(canReopenMonth(makeClosure(), "profissional", false)).toBe(true);
  });

  it("profissional modo clínica → pode reabrir", () => {
    expect(canReopenMonth(makeClosure(), "profissional", true)).toBe(true);
  });

  it("clínica em modo clínica → pode reabrir", () => {
    expect(canReopenMonth(makeClosure(), "clinica", true)).toBe(true);
  });

  it("clínica em modo autônomo → não pode reabrir", () => {
    expect(canReopenMonth(makeClosure(), "clinica", false)).toBe(false);
  });
});
