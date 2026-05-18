import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent, url }) => {
  const { therapist, clinic } = await parent();

  const tz = clinic?.timezone ?? "America/Sao_Paulo";
  const now = new Date();
  const todayStr = now.toLocaleDateString("sv", { timeZone: tz });
  const monthYear = todayStr.slice(0, 7);

  // Period from URL params; default = current month
  const rawPeriod = url.searchParams.get("period") ?? "month";
  const period = ["7d", "month", "3m"].includes(rawPeriod)
    ? (rawPeriod as "7d" | "month" | "3m")
    : "month";

  let periodStart: string;
  const periodEnd = todayStr;

  if (period === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    periodStart = d.toLocaleDateString("sv", { timeZone: tz });
  } else if (period === "3m") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    d.setDate(1);
    periodStart = d.toLocaleDateString("sv", { timeZone: tz });
  } else {
    periodStart = `${monthYear}-01`;
  }

  // Extend query end by 1 day in UTC to catch late-evening sessions in UTC-N zones
  const queryEnd = new Date(`${periodEnd}T00:00:00Z`);
  queryEnd.setDate(queryEnd.getDate() + 1);

  const [
    { data: clinicOp },
    { count: therapistCount },
    { data: sessions },
    { data: expenseEntries },
    { data: openReceivables },
  ] = await Promise.all([
    locals.supabase
      .from("clinics")
      .select("repasse_fixo, repasse_percentual, min_therapists")
      .eq("id", therapist.clinic_id)
      .single(),

    locals.supabase
      .from("therapists")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", therapist.clinic_id),

    // Sessions in period — extend by 1 day for timezone safety; filter client-side
    locals.supabase
      .from("sessions")
      .select("id, scheduled_at, status, fee, paid, patients(id, name)")
      .eq("therapist_id", therapist.id)
      .gte("scheduled_at", `${periodStart}T00:00:00`)
      .lt("scheduled_at", queryEnd.toISOString())
      .order("scheduled_at"),

    // Expense finance entries in period
    locals.supabase
      .from("finance_entries")
      .select("id, amount, occurred_at, expense_id, expenses(description)")
      .eq("therapist_id", therapist.id)
      .eq("type", "expense")
      .gte("occurred_at", periodStart)
      .lte("occurred_at", periodEnd),

    // All unpaid charged sessions for open receivables (no period filter)
    locals.supabase
      .from("sessions")
      .select("id, scheduled_at, fee, status, patients(id, name)")
      .eq("therapist_id", therapist.id)
      .in("status", ["completed", "no_show"])
      .eq("paid", false)
      .order("scheduled_at"),
  ]);

  if (!clinicOp) throw error(404, "Clínica não encontrada");

  return {
    period,
    periodStart,
    periodEnd,
    isClinicMode: (therapistCount ?? 0) >= (clinicOp?.min_therapists ?? 2),
    clinicOp,
    sessions: sessions ?? [],
    expenseEntries: expenseEntries ?? [],
    openReceivables: openReceivables ?? [],
    today: todayStr,
    tz,
  };
};
