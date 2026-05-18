/**
 * Geração de payloads de push notification — pura, sem IO e sem envio real.
 * Cada função respeita as regras da seção 6 do spec (OPERACIONAL.md):
 * horário de disparo, frequência máxima, condição de pendência.
 */
import type {
  DuePayment,
  MonthClosure,
  MonthClosureLogEntry,
  OperationalSession,
  PushPayload,
} from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function localHour(now: Date, tz: string): number {
  return Number(
    now.toLocaleString("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }),
  );
}

function todayStr(now: Date, tz: string): string {
  return now.toLocaleDateString("sv", { timeZone: tz });
}

function monthYearStr(now: Date, tz: string): string {
  return todayStr(now, tz).slice(0, 7);
}

// ── generateUnregisteredSessionsPush ─────────────────────────────────────────

/**
 * Dispara entre 18h–20h (fuso da clínica) uma vez por dia se houver sessões
 * agendadas sem status na data `now`.
 *
 * Retorna null se: fora da janela horária, ou sem sessões sem registro no dia.
 */
export function generateUnregisteredSessionsPush(
  now: Date,
  sessions: OperationalSession[],
  tz = "America/Sao_Paulo",
): PushPayload | null {
  const hour = localHour(now, tz);
  if (hour < 18 || hour >= 20) return null;

  const today = todayStr(now, tz);
  const unregistered = sessions.filter(
    (s) => s.scheduledAt.startsWith(today) && s.status === "scheduled",
  );

  if (unregistered.length === 0) return null;

  const count = unregistered.length;
  const body =
    count === 1
      ? "Você tem 1 sessão sem registro hoje. Toque para registrar."
      : `Você tem ${count} sessões sem registro hoje. Toque para registrar.`;

  return {
    trigger: "unregistered_sessions",
    title: "Sessões pendentes",
    body,
    url: "/app/operations",
    scheduledFor: now.toISOString(),
    data: { count },
  };
}

// ── generateDuePaymentsPush ───────────────────────────────────────────────────

/**
 * Dispara pela manhã (entre 7h–9h, fuso da clínica) uma vez por dia se
 * houver contas vencendo hoje ou atrasadas.
 *
 * Retorna null se: fora da janela horária, ou sem contas pendentes.
 */
export function generateDuePaymentsPush(
  now: Date,
  payments: DuePayment[],
  tz = "America/Sao_Paulo",
): PushPayload | null {
  const hour = localHour(now, tz);
  if (hour < 7 || hour >= 9) return null;

  const today = todayStr(now, tz);
  const due = payments.filter((p) => !p.paid && p.dueDate <= today);

  if (due.length === 0) return null;

  const first = due[0];
  const extra = due.length - 1;
  const extraStr =
    extra > 0 ? ` e mais ${extra} conta${extra !== 1 ? "s" : ""}.` : ".";
  const body = `${first.description} vence hoje (R$ ${first.amount.toFixed(2).replace(".", ",")})${extraStr}`;

  return {
    trigger: "due_payments",
    title: "Contas a pagar",
    body,
    url: "/app/operations",
    scheduledFor: now.toISOString(),
    data: {
      count: due.length,
      totalAmount: due.reduce((s, p) => s + p.amount, 0),
    },
  };
}

// ── generateMonthCloseReminderPush ────────────────────────────────────────────

/**
 * Dispara no dia 1 de cada mês, entre 8h–10h (fuso da clínica).
 * Lembra o profissional de fechar o mês anterior.
 *
 * Retorna null se: não é dia 1, ou fora da janela horária.
 */
export function generateMonthCloseReminderPush(
  now: Date,
  tz = "America/Sao_Paulo",
): PushPayload | null {
  const hour = localHour(now, tz);
  if (hour < 8 || hour >= 10) return null;

  const localDateStr = todayStr(now, tz);
  const dayOfMonth = Number(localDateStr.slice(8, 10));
  if (dayOfMonth !== 1) return null;

  const [yr, mo] = localDateStr.split("-").map(Number);
  const prevMonth = mo === 1 ? 12 : mo - 1;
  const prevYear = mo === 1 ? yr - 1 : yr;
  const MONTHS_PT = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const monthLabel = MONTHS_PT[prevMonth - 1];

  return {
    trigger: "month_close_reminder",
    title: "Hora de fechar o mês",
    body: `Hora de fechar ${monthLabel}. Toque para revisar.`,
    url: "/app/operations",
    scheduledFor: now.toISOString(),
    data: { monthYear: `${prevYear}-${String(prevMonth).padStart(2, "0")}` },
  };
}

// ── generateMonthReopenedPush ─────────────────────────────────────────────────

/**
 * Dispara imediatamente quando uma parte reabre um mês fechado pela outra
 * (modo clínica). A outra parte recebe a notificação.
 *
 * `reopenedBy` é a entrada de log da ação de reabertura.
 * `notifyName` é o nome da outra parte (quem vai receber a notificação).
 *
 * Retorna null se o fechamento não está em status "closed" antes da reabertura
 * (i.e., tentativa de reabrir algo que já estava aberto).
 */
export function generateMonthReopenedPush(
  closure: MonthClosure,
  reopenedBy: MonthClosureLogEntry,
  notifyName: string,
): PushPayload | null {
  if (closure.status !== "closed") return null;

  const MONTHS_PT = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const [, mo] = closure.monthYear.split("-").map(Number);
  const monthLabel = MONTHS_PT[mo - 1];

  return {
    trigger: "month_reopened",
    title: "Mês reaberto",
    body: `${reopenedBy.by} reabriu o mês de ${monthLabel}.`,
    url: "/app/operations",
    scheduledFor: reopenedBy.at,
    data: {
      monthYear: closure.monthYear,
      reopenedBy: reopenedBy.by,
      role: reopenedBy.role,
      notifyName,
    },
  };
}
