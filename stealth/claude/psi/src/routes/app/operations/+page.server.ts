import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
  const { therapist, clinic } = await parent();

  // Fetch operational fields not included in the layout query
  const { data: clinicOp } = await locals.supabase
    .from("clinics")
    .select("cancellation_window_hours, repasse_fixo, repasse_percentual")
    .eq("id", therapist.clinic_id)
    .single();

  if (!clinicOp) throw error(404, "Clínica não encontrada");

  // Detect clinic mode: >1 active therapist in same clinic
  const { count: therapistCount } = await locals.supabase
    .from("therapists")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", therapist.clinic_id);

  const isClinicMode = (therapistCount ?? 0) > 1;

  // Date helpers — use the clinic's timezone
  const tz = clinic?.timezone ?? "America/Sao_Paulo";
  const now = new Date();

  // Today's YYYY-MM-DD in clinic timezone (sv locale = ISO format)
  const todayStr = now.toLocaleDateString("sv", { timeZone: tz });
  const monthYear = todayStr.slice(0, 7);

  // Query window: ±1 day in UTC to cover any timezone offset safely
  const windowStart = new Date(now);
  windowStart.setUTCDate(windowStart.getUTCDate() - 1);
  const windowEnd = new Date(now);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);

  // End of current week (Sunday) for bills-this-week filter
  const localDow = new Date(now.toLocaleString("en-US", { timeZone: tz })).getDay();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + (6 - localDow));
  const weekEndStr = weekEnd.toLocaleDateString("sv", { timeZone: tz });

  const [
    { data: rawSessions },
    { data: expenses },
    { data: monthExpenseEntries },
    { data: monthClosure },
    { data: cancellationPolicies },
    { data: monthSessions },
  ] = await Promise.all([
    // Sessions in the ±1 day window with patient info
    locals.supabase
      .from("sessions")
      .select(
        "id, scheduled_at, status, fee, paid, cancelled_at, patients(id, name, cancellation_policy, cancellation_window_hours)",
      )
      .eq("therapist_id", therapist.id)
      .gte("scheduled_at", windowStart.toISOString())
      .lte("scheduled_at", windowEnd.toISOString())
      .order("scheduled_at"),

    // Active expenses for bills card
    locals.supabase
      .from("expenses")
      .select("id, description, amount, frequency, due_day, due_date, month, color")
      .eq("clinic_id", therapist.clinic_id)
      .eq("is_active", true),

    // Expense finance entries this month (to detect which bills are paid)
    locals.supabase
      .from("finance_entries")
      .select("id, amount, description, occurred_at")
      .eq("therapist_id", therapist.id)
      .eq("type", "expense")
      .gte("occurred_at", `${monthYear}-01`)
      .lte("occurred_at", `${monthYear}-31`),

    // Current month closure record
    locals.supabase
      .from("month_closures")
      .select("id, status, month_year, closed_at, log")
      .eq("therapist_id", therapist.id)
      .eq("month_year", monthYear)
      .maybeSingle(),

    // Cancellation policy override for today's patients (for auto-classification)
    locals.supabase
      .from("patients")
      .select("id, cancellation_policy, cancellation_window_hours")
      .eq("therapist_id", therapist.id)
      .eq("active", true),

    // All sessions this month for cashflow summary
    locals.supabase
      .from("sessions")
      .select("fee, status")
      .eq("therapist_id", therapist.id)
      .gte("scheduled_at", `${monthYear}-01`)
      .lte("scheduled_at", `${monthYear}-31T23:59:59`),
  ]);

  // Filter sessions to only today in the clinic's timezone
  const todaySessions = (rawSessions ?? []).filter(
    (s) =>
      new Date(s.scheduled_at).toLocaleDateString("sv", { timeZone: tz }) ===
      todayStr,
  );

  return {
    isClinicMode,
    clinicOp,
    todaySessions,
    expenses: expenses ?? [],
    monthExpenseEntries: monthExpenseEntries ?? [],
    monthSessions: monthSessions ?? [],
    monthClosure: monthClosure ?? null,
    cancellationPolicies: cancellationPolicies ?? [],
    today: todayStr,
    weekEnd: weekEndStr,
    monthYear,
  };
};
