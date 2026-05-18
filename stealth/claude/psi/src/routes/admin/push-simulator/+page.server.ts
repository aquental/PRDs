import type { PageServerLoad } from "./$types";
import {
  generateDuePaymentsPush,
  generateMonthCloseReminderPush,
  generateMonthReopenedPush,
  generateUnregisteredSessionsPush,
} from "$lib/core/push-notifications";
import type {
  DuePayment,
  MonthClosure,
  OperationalSession,
} from "$lib/core/types";

const TZ = "America/Sao_Paulo";

// ── Fixtures realistas usados para simulação ──────────────────────────────────

const MOCK_SESSIONS: OperationalSession[] = [
  {
    id: "s1",
    patientId: "p1",
    patientName: "Ana Silva",
    scheduledAt: new Date().toISOString(),
    durationMinutes: 50,
    fee: 180,
    status: "scheduled",
    paid: false,
  },
  {
    id: "s2",
    patientId: "p2",
    patientName: "João Costa",
    scheduledAt: new Date().toISOString(),
    durationMinutes: 50,
    fee: 200,
    status: "scheduled",
    paid: false,
  },
  {
    id: "s3",
    patientId: "p3",
    patientName: "Maria Oliveira",
    scheduledAt: new Date().toISOString(),
    durationMinutes: 50,
    fee: 180,
    status: "completed",
    paid: true,
  },
];

const MOCK_PAYMENTS: DuePayment[] = [
  {
    id: "e1",
    description: "Internet fibra",
    amount: 120,
    dueDate: new Date().toLocaleDateString("sv"),
    paid: false,
  },
  {
    id: "e2",
    description: "Aluguel sala",
    amount: 800,
    dueDate: new Date().toLocaleDateString("sv"),
    paid: false,
  },
  {
    id: "e3",
    description: "Plano de saúde",
    amount: 450,
    dueDate: "2026-04-01",
    paid: false,
  },
];

const MOCK_CLOSURE: MonthClosure = {
  id: "c1",
  clinicId: "cl1",
  therapistId: "t1",
  monthYear: "2026-04",
  status: "closed",
  log: [
    {
      action: "closed",
      at: "2026-05-01T10:00:00Z",
      by: "Dra. Beatriz Andrade",
      role: "profissional",
    },
  ],
  createdAt: "2026-05-01T10:00:00Z",
  updatedAt: "2026-05-01T10:00:00Z",
};

const REOPEN_ENTRY = {
  action: "reopened" as const,
  at: new Date().toISOString(),
  by: "Clínica Crescer e Ser",
  role: "clinica" as const,
};

// ── Load — gera os 4 payloads com "now" simulado para cada janela horária ─────

export const load: PageServerLoad = async () => {
  const results = [
    {
      label: "Sessões sem registro (simulado às 19h)",
      description:
        "Janela: 18h–20h. Só dispara se houver sessões scheduled no dia.",
      payload: generateUnregisteredSessionsPush(
        simulatedAt(19),
        MOCK_SESSIONS,
        TZ,
      ),
    },
    {
      label: "Contas a pagar (simulado às 8h)",
      description:
        "Janela: 7h–9h. Só dispara se houver contas vencidas ou vencendo hoje.",
      payload: generateDuePaymentsPush(simulatedAt(8), MOCK_PAYMENTS, TZ),
    },
    {
      label: "Lembrete de fechar mês (simulado às 9h, dia 1)",
      description:
        "Janela: 8h–10h do dia 1. Só dispara se for o primeiro dia do mês.",
      payload: generateMonthCloseReminderPush(firstOfMonthAt(9), TZ),
    },
    {
      label: "Mês reaberto (evento imediato)",
      description:
        "Dispara imediatamente após reabertura. Notifica a outra parte.",
      payload: generateMonthReopenedPush(
        MOCK_CLOSURE,
        REOPEN_ENTRY,
        "Dra. Beatriz Andrade",
      ),
    },
  ];

  return { results, generatedAt: new Date().toISOString() };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function simulatedAt(localHour: number): Date {
  const now = new Date();
  // Build a Date with the current calendar date but at the given hour in BRT (UTC-3)
  const dateStr = now.toLocaleDateString("sv", { timeZone: TZ });
  return new Date(
    `${dateStr}T${String(localHour).padStart(2, "0")}:00:00-03:00`,
  );
}

function firstOfMonthAt(localHour: number): Date {
  const now = new Date();
  const [yr, mo] = now
    .toLocaleDateString("sv", { timeZone: TZ })
    .split("-")
    .map(Number);
  // Use the first day of next month so the reminder refers to the current month
  const nextMo = mo === 12 ? 1 : mo + 1;
  const nextYr = mo === 12 ? yr + 1 : yr;
  return new Date(
    `${nextYr}-${String(nextMo).padStart(2, "0")}-01T${String(localHour).padStart(2, "0")}:00:00-03:00`,
  );
}
