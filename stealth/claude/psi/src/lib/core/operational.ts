/**
 * Regras de negócio da aba Operacional — puras, sem IO.
 * Testadas em operational.test.ts.
 */
import type {
  CancellationPolicy,
  DuePayment,
  MonthClosure,
  MonthClosureRole,
  OperationalSession,
  PatientCancellationOverride,
  Pendency,
  RepasseConfig,
  RepasseResult,
} from "./types";

/**
 * Classifica um cancelamento como "falta" ou "abono" com base na antecedência.
 *
 * Precedência:
 * 1. Override por paciente ("sempre_abona" / "sempre_cobra")
 * 2. Override com janela customizada ("janela_custom")
 * 3. Política global
 *
 * Sem `cancelledAt` → falta (ausência sem aviso).
 * Boundary ≥ windowHours → abono.
 */
export function classifyCancellation(
  cancelledAt: string | null | undefined,
  sessionAt: string,
  policy: CancellationPolicy,
  override?: PatientCancellationOverride,
): "falta" | "abono" {
  if (override?.policy === "sempre_abona") return "abono";
  if (override?.policy === "sempre_cobra") return "falta";

  if (!cancelledAt) return "falta";

  const windowHours =
    override?.policy === "janela_custom" && override.windowHours != null
      ? override.windowHours
      : policy.windowHours;

  const diffHours =
    (new Date(sessionAt).getTime() - new Date(cancelledAt).getTime()) /
    3_600_000;

  return diffHours >= windowHours ? "abono" : "falta";
}

/**
 * Calcula repasse à clínica e valor líquido do profissional.
 *
 * Fórmula: repasse = fixo + (percentual / 100) × sessionValue
 * Quando fixo = 0 E percentual = 0 → repasse desativado.
 * Valores negativos de entrada são normalizados a zero.
 */
export function computeRepasse(
  sessionValue: number,
  config: RepasseConfig,
): RepasseResult {
  const fixo = Math.max(0, config.fixo);
  const percentual = Math.max(0, config.percentual);
  const value = Math.max(0, sessionValue);

  if (fixo === 0 && percentual === 0) {
    return { repasse: 0, liquido: value, disabled: true };
  }

  const repasse = round2(fixo + (percentual / 100) * value);
  const liquido = round2(value - repasse);

  return { repasse, liquido, disabled: false };
}

/**
 * Avalia se um mês pode ser fechado, retornando a lista de pendências.
 *
 * Pendências consideradas:
 * - Sessões com status "scheduled" dentro do mês alvo.
 * - Pagamentos vencidos (dueDate ≤ último dia do mês) não marcados como pagos.
 */
export function evaluateMonthClosure(
  monthYear: string,
  sessions: OperationalSession[],
  payments: DuePayment[],
): { canClose: boolean; pendencies: Pendency[] } {
  const pendencies: Pendency[] = [];

  for (const s of sessions) {
    if (s.scheduledAt.slice(0, 7) === monthYear && s.status === "scheduled") {
      pendencies.push({
        type: "sessao_sem_registro",
        description: `Sessão de ${s.patientName} sem registro (${s.scheduledAt.slice(0, 10)})`,
        id: s.id,
      });
    }
  }

  // "YYYY-MM-31" é sempre ≥ qualquer data real do mês em comparação lexicográfica.
  const monthUpperBound = `${monthYear}-31`;
  for (const p of payments) {
    if (!p.paid && p.dueDate <= monthUpperBound) {
      pendencies.push({
        type: "conta_atrasada",
        description: `${p.description} (venceu ${p.dueDate})`,
        id: p.id,
      });
    }
  }

  return { canClose: pendencies.length === 0, pendencies };
}

/**
 * Determina se o fechamento de mês pode ser reaberto.
 *
 * - Mês já aberto → false.
 * - Profissional → sempre pode reabrir.
 * - Clínica → pode reabrir apenas em modo clínica.
 */
export function canReopenMonth(
  closure: MonthClosure,
  userRole: MonthClosureRole,
  isClinicMode: boolean,
): boolean {
  if (closure.status !== "closed") return false;
  if (userRole === "profissional") return true;
  return isClinicMode;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
