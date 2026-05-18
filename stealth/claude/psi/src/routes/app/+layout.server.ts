import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { createSupabaseAdminClient } from "$lib/supabase/server";
import { getServiceSwitches } from "$lib/server/service-switches";

export const load: LayoutServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, "/login");

  // Bloqueia admins nesta área — eles têm seu próprio /admin.
  const admin = createSupabaseAdminClient();
  const { data: isAdmin } = await admin
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (isAdmin) throw redirect(303, "/admin");

  const { data: therapist } = await locals.supabase
    .from("therapists")
    .select(
      "id, clinic_id, name, email, avatar_url, crp, phone, default_session_fee",
    )
    .eq("user_id", user.id)
    .single();

  if (!therapist) throw redirect(303, "/login?error=no_therapist");

  const now = new Date().toISOString();

  const [{ data: clinic }, switches, pendingResult, closedResult] =
    await Promise.all([
      locals.supabase
        .from("clinics")
        .select(
          "id, name, timezone, cnpj, address_street, address_number, address_complement, address_zip, address_city, address_state, working_hours_start, working_hours_end",
        )
        .eq("id", therapist.clinic_id)
        .single(),
      getServiceSwitches(),
      // Sessões pendentes (attendance_status nulo, não canceladas, já passaram)
      locals.supabase
        .from("sessions")
        .select("scheduled_at")
        .eq("therapist_id", therapist.id)
        .neq("status", "cancelled")
        .is("attendance_status", null)
        .lt("scheduled_at", now),
      // Meses já fechados (para excluí-los do badge)
      locals.supabase
        .from("month_closures")
        .select("month_year")
        .eq("therapist_id", therapist.id)
        .eq("status", "closed"),
    ]);

  const closedMonths = new Set(
    (closedResult.data ?? []).map((c) => c.month_year),
  );
  const pendingCount = (pendingResult.data ?? []).filter(
    (s) => !closedMonths.has(s.scheduled_at.slice(0, 7)),
  ).length;

  return { therapist, clinic, switches, pendingCount };
};
