-- =============================================================================
-- Psi — Security hardening (Sentinel audit 2026-05-16)
-- =============================================================================
-- Fixes all 9 findings from the database-sentinel audit:
--
--   CRITICAL  service_switches open to public write (USING true/WITH CHECK true)
--   HIGH      clinics_insert allows any authenticated user to create clinics
--   HIGH      therapists UPDATE without WITH CHECK (cross-tenant breach vector)
--   HIGH      8 tables UPDATE without WITH CHECK (cross-tenant data injection)
--   MEDIUM    mutable search_path on SECURITY DEFINER helper functions
--   MEDIUM    SECURITY DEFINER functions callable by anon via /rest/v1/rpc/
--   MEDIUM    auth.uid() called without (SELECT ...) wrapper in 4 policies
--   MEDIUM    all 39 policies missing TO authenticated scope
--   LOW       (addressed via Dashboard: Authentication → Leaked Password Protection)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- CRITICAL: service_switches — remove USING(true)/WITH CHECK(true) to public
-- ---------------------------------------------------------------------------
-- The service_role key bypasses RLS entirely and needs no policy.
-- All reads/writes in service-switches.ts go through createSupabaseAdminClient()
-- which bypasses RLS. The old policy name was misleading: it applied to the
-- {public} pseudo-role (anon + authenticated), not to service_role.
-- RLS enabled + no matching policy = deny-all for anon and authenticated.
DROP POLICY IF EXISTS "service_role_full_access" ON public.service_switches;


-- ---------------------------------------------------------------------------
-- MEDIUM: fix mutable search_path on SECURITY DEFINER functions
-- ---------------------------------------------------------------------------
-- current_clinic_id() and is_admin() are called from every RLS policy.
-- Without a fixed search_path, a hostile object in any schema could shadow
-- public.therapists or public.admins and return attacker-controlled values.
ALTER FUNCTION public.current_clinic_id() SET search_path = public;
ALTER FUNCTION public.is_admin()          SET search_path = public;
ALTER FUNCTION public.set_updated_at()   SET search_path = public;


-- ---------------------------------------------------------------------------
-- MEDIUM: revoke anon EXECUTE on SECURITY DEFINER functions
-- ---------------------------------------------------------------------------
-- These functions return null/false for unauthenticated callers but there is
-- no reason to expose them via /rest/v1/rpc/ to the public internet.
-- rls_auto_enable is an event-trigger function; it should never be callable
-- via RPC by any user-facing role.
REVOKE EXECUTE ON FUNCTION public.current_clinic_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin()          FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()   FROM anon, authenticated;


-- ===========================================================================
-- HIGH: drop clinics_insert
-- ===========================================================================
-- The auth callback (/auth/callback/+server.ts) creates clinics exclusively
-- via createSupabaseAdminClient(), which bypasses RLS. No authenticated user
-- should be able to POST /rest/v1/clinics directly. Any authenticated user
-- who could create a clinic would also be able to redirect their therapist
-- record into it, circumventing the provisioning flow.
DROP POLICY IF EXISTS clinics_insert ON public.clinics;


-- ===========================================================================
-- HIGH: drop therapists_insert
-- ===========================================================================
-- Therapist provisioning also goes through createSupabaseAdminClient().
-- Allowing authenticated users to self-insert a therapist row let them set
-- any clinic_id, potentially gaining access to another clinic's data.
DROP POLICY IF EXISTS therapists_insert ON public.therapists;

-- Prevent authenticated users from updating their own clinic affiliation.
-- Column-level privilege revocation is more robust than policy WITH CHECK
-- alone: it holds even if a future migration accidentally re-opens the policy.
REVOKE UPDATE (clinic_id) ON public.therapists FROM authenticated;


-- ===========================================================================
-- Rebuild all remaining policies with:
--   · TO authenticated          (explicit role scope — not the {public} default)
--   · (SELECT auth.uid())       (initplan cache — evaluated once per query, not per row)
--   · WITH CHECK on every UPDATE (prevent cross-tenant field injection)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- clinics
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS clinics_select ON public.clinics;
DROP POLICY IF EXISTS clinics_update ON public.clinics;

CREATE POLICY clinics_select ON public.clinics FOR SELECT TO authenticated
  USING (id = public.current_clinic_id() OR public.is_admin());

CREATE POLICY clinics_update ON public.clinics FOR UPDATE TO authenticated
  USING  (id = public.current_clinic_id() OR public.is_admin())
  WITH CHECK (id = public.current_clinic_id() OR public.is_admin());


-- ---------------------------------------------------------------------------
-- therapists
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS therapists_select ON public.therapists;
DROP POLICY IF EXISTS therapists_update ON public.therapists;

CREATE POLICY therapists_select ON public.therapists FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR clinic_id = public.current_clinic_id()
    OR public.is_admin()
  );

CREATE POLICY therapists_update ON public.therapists FOR UPDATE TO authenticated
  USING  (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());


-- ---------------------------------------------------------------------------
-- admins
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS admins_select ON public.admins;

CREATE POLICY admins_select ON public.admins FOR SELECT TO authenticated
  USING (public.is_admin());


-- ---------------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS patients_select ON public.patients;
DROP POLICY IF EXISTS patients_insert ON public.patients;
DROP POLICY IF EXISTS patients_update ON public.patients;
DROP POLICY IF EXISTS patients_delete ON public.patients;

CREATE POLICY patients_select ON public.patients FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() OR public.is_admin());

CREATE POLICY patients_insert ON public.patients FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY patients_update ON public.patients FOR UPDATE TO authenticated
  USING  (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY patients_delete ON public.patients FOR DELETE TO authenticated
  USING (clinic_id = public.current_clinic_id());


-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS sessions_select ON public.sessions;
DROP POLICY IF EXISTS sessions_insert ON public.sessions;
DROP POLICY IF EXISTS sessions_update ON public.sessions;
DROP POLICY IF EXISTS sessions_delete ON public.sessions;

CREATE POLICY sessions_select ON public.sessions FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() OR public.is_admin());

CREATE POLICY sessions_insert ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY sessions_update ON public.sessions FOR UPDATE TO authenticated
  USING  (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY sessions_delete ON public.sessions FOR DELETE TO authenticated
  USING (clinic_id = public.current_clinic_id());


-- ---------------------------------------------------------------------------
-- finance_entries
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS finance_select ON public.finance_entries;
DROP POLICY IF EXISTS finance_insert ON public.finance_entries;
DROP POLICY IF EXISTS finance_update ON public.finance_entries;
DROP POLICY IF EXISTS finance_delete ON public.finance_entries;

CREATE POLICY finance_select ON public.finance_entries FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() OR public.is_admin());

CREATE POLICY finance_insert ON public.finance_entries FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY finance_update ON public.finance_entries FOR UPDATE TO authenticated
  USING  (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY finance_delete ON public.finance_entries FOR DELETE TO authenticated
  USING (clinic_id = public.current_clinic_id());


-- ---------------------------------------------------------------------------
-- expenses  (was FOR ALL — preserve that shape, add TO authenticated)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "clinic_members_own_expenses" ON public.expenses;

CREATE POLICY "clinic_members_own_expenses" ON public.expenses
  TO authenticated
  USING  (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());


-- ---------------------------------------------------------------------------
-- schedules
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS schedules_select ON public.schedules;
DROP POLICY IF EXISTS schedules_insert ON public.schedules;
DROP POLICY IF EXISTS schedules_update ON public.schedules;
DROP POLICY IF EXISTS schedules_delete ON public.schedules;

CREATE POLICY schedules_select ON public.schedules FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() OR public.is_admin());

CREATE POLICY schedules_insert ON public.schedules FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY schedules_update ON public.schedules FOR UPDATE TO authenticated
  USING  (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY schedules_delete ON public.schedules FOR DELETE TO authenticated
  USING (clinic_id = public.current_clinic_id());


-- ---------------------------------------------------------------------------
-- ai_usage_logs
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS ai_logs_select ON public.ai_usage_logs;
DROP POLICY IF EXISTS ai_logs_insert ON public.ai_usage_logs;

CREATE POLICY ai_logs_select ON public.ai_usage_logs FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() OR public.is_admin());

CREATE POLICY ai_logs_insert ON public.ai_usage_logs FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id() OR public.is_admin());


-- ---------------------------------------------------------------------------
-- chat_conversations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS chat_conv_select ON public.chat_conversations;
DROP POLICY IF EXISTS chat_conv_insert ON public.chat_conversations;
DROP POLICY IF EXISTS chat_conv_update ON public.chat_conversations;
DROP POLICY IF EXISTS chat_conv_delete ON public.chat_conversations;

CREATE POLICY chat_conv_select ON public.chat_conversations FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() OR public.is_admin());

CREATE POLICY chat_conv_insert ON public.chat_conversations FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY chat_conv_update ON public.chat_conversations FOR UPDATE TO authenticated
  USING  (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY chat_conv_delete ON public.chat_conversations FOR DELETE TO authenticated
  USING (clinic_id = public.current_clinic_id());


-- ---------------------------------------------------------------------------
-- chat_messages
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS chat_msg_select ON public.chat_messages;
DROP POLICY IF EXISTS chat_msg_insert ON public.chat_messages;

CREATE POLICY chat_msg_select ON public.chat_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND (c.clinic_id = public.current_clinic_id() OR public.is_admin())
  ));

CREATE POLICY chat_msg_insert ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND c.clinic_id = public.current_clinic_id()
  ));


-- ---------------------------------------------------------------------------
-- patient_addresses
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS patient_addresses_select ON public.patient_addresses;
DROP POLICY IF EXISTS patient_addresses_insert ON public.patient_addresses;
DROP POLICY IF EXISTS patient_addresses_update ON public.patient_addresses;
DROP POLICY IF EXISTS patient_addresses_delete ON public.patient_addresses;

CREATE POLICY patient_addresses_select ON public.patient_addresses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_addresses.patient_id
      AND (p.clinic_id = public.current_clinic_id() OR public.is_admin())
  ));

CREATE POLICY patient_addresses_insert ON public.patient_addresses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_addresses.patient_id
      AND p.clinic_id = public.current_clinic_id()
  ));

CREATE POLICY patient_addresses_update ON public.patient_addresses FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_addresses.patient_id
      AND p.clinic_id = public.current_clinic_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_addresses.patient_id
      AND p.clinic_id = public.current_clinic_id()
  ));

CREATE POLICY patient_addresses_delete ON public.patient_addresses FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_addresses.patient_id
      AND p.clinic_id = public.current_clinic_id()
  ));


-- ---------------------------------------------------------------------------
-- patient_relatives
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS patient_relatives_select ON public.patient_relatives;
DROP POLICY IF EXISTS patient_relatives_insert ON public.patient_relatives;
DROP POLICY IF EXISTS patient_relatives_update ON public.patient_relatives;
DROP POLICY IF EXISTS patient_relatives_delete ON public.patient_relatives;

CREATE POLICY patient_relatives_select ON public.patient_relatives FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_relatives.patient_id
      AND (p.clinic_id = public.current_clinic_id() OR public.is_admin())
  ));

CREATE POLICY patient_relatives_insert ON public.patient_relatives FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_relatives.patient_id
      AND p.clinic_id = public.current_clinic_id()
  ));

CREATE POLICY patient_relatives_update ON public.patient_relatives FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_relatives.patient_id
      AND p.clinic_id = public.current_clinic_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_relatives.patient_id
      AND p.clinic_id = public.current_clinic_id()
  ));

CREATE POLICY patient_relatives_delete ON public.patient_relatives FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_relatives.patient_id
      AND p.clinic_id = public.current_clinic_id()
  ));


-- ---------------------------------------------------------------------------
-- holidays: already has TO authenticated — no change needed
-- ---------------------------------------------------------------------------

COMMIT;
