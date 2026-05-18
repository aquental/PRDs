import { error, fail } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { invalidateDashboard } from "$lib/redis";

const RegisterSessionSchema = z.object({
  session_id: z.string().uuid(),
  status: z.enum(["completed", "no_show", "cancelled"]),
});

const MarkExpensePaidSchema = z.object({
  expense_id: z.string().uuid(),
  description: z.string().min(1),
  amount: z.coerce.number().nonnegative(),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

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

  // Current week bounds (Sun–Sat) for cashflow and bills
  const localDow = new Date(now.toLocaleString("en-US", { timeZone: tz })).getDay();
  const weekStartDate = new Date(now);
  weekStartDate.setDate(weekStartDate.getDate() - localDow);
  const weekEndDate = new Date(now);
  weekEndDate.setDate(weekEndDate.getDate() + (6 - localDow));
  const weekStartStr = weekStartDate.toLocaleDateString("sv", { timeZone: tz });
  const weekEndStr = weekEndDate.toLocaleDateString("sv", { timeZone: tz });

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

    // All sessions this month for cashflow and repasse summaries
    locals.supabase
      .from("sessions")
      .select("fee, status, scheduled_at, paid")
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
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    monthYear,
  };
};

export const actions: Actions = {
  registerSession: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { error: "Não autenticado" });

    const { data: therapist } = await locals.supabase
      .from("therapists")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!therapist) return fail(403, { error: "Sem permissão" });

    const parsed = RegisterSessionSchema.safeParse(
      Object.fromEntries(await request.formData()),
    );
    if (!parsed.success)
      return fail(400, { error: parsed.error.flatten().fieldErrors });

    const { session_id, status } = parsed.data;

    // Verify the session belongs to this therapist
    const { data: session } = await locals.supabase
      .from("sessions")
      .select("id")
      .eq("id", session_id)
      .eq("therapist_id", therapist.id)
      .single();
    if (!session) return fail(404, { error: "Sessão não encontrada" });

    const update: Record<string, unknown> = { status };
    if (status === "cancelled") update.cancelled_at = new Date().toISOString();

    const { error: err } = await locals.supabase
      .from("sessions")
      .update(update)
      .eq("id", session_id);

    if (err) return fail(400, { error: err.message });
    await invalidateDashboard(therapist.id);
    return { success: true, action: "registerSession" };
  },

  markExpensePaid: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { error: "Não autenticado" });

    const { data: therapist } = await locals.supabase
      .from("therapists")
      .select("id, clinic_id")
      .eq("user_id", user.id)
      .single();
    if (!therapist) return fail(403, { error: "Sem permissão" });

    const parsed = MarkExpensePaidSchema.safeParse(
      Object.fromEntries(await request.formData()),
    );
    if (!parsed.success)
      return fail(400, { error: parsed.error.flatten().fieldErrors });

    const { expense_id, description, amount, today } = parsed.data;

    // Verify expense belongs to this clinic
    const { data: expense } = await locals.supabase
      .from("expenses")
      .select("id")
      .eq("id", expense_id)
      .eq("clinic_id", therapist.clinic_id)
      .single();
    if (!expense) return fail(404, { error: "Despesa não encontrada" });

    const { error: err } = await locals.supabase
      .from("finance_entries")
      .insert({
        therapist_id: therapist.id,
        type: "expense",
        amount,
        description,
        occurred_at: today,
      });

    if (err) return fail(400, { error: err.message });
    await invalidateDashboard(therapist.id);
    return { success: true, action: "markExpensePaid" };
  },
};
