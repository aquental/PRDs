-- =============================================================================
-- Psi — appointment_log: immutable audit trail for attendance records
-- =============================================================================

CREATE TYPE public.appointment_log_action AS ENUM ('created', 'updated', 'cleared');
CREATE TYPE public.appointment_log_source AS ENUM ('ui', 'bulk_action', 'voice');

CREATE TABLE public.appointment_log (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           UUID        NOT NULL REFERENCES public.sessions(id)   ON DELETE CASCADE,
  clinic_id            UUID        NOT NULL REFERENCES public.clinics(id)    ON DELETE CASCADE,
  actor_therapist_id   UUID        NOT NULL REFERENCES public.therapists(id),
  action               public.appointment_log_action NOT NULL,
  previous_value       public.attendance_status,
  new_value            public.attendance_status,
  source               public.appointment_log_source NOT NULL DEFAULT 'ui',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Covers fetching history for a single session (indicator "modificada" + tooltip)
CREATE INDEX idx_appointment_log_session ON public.appointment_log (session_id);

-- Covers RLS policy evaluation and per-clinic audit queries
CREATE INDEX idx_appointment_log_clinic  ON public.appointment_log (clinic_id);

ALTER TABLE public.appointment_log ENABLE ROW LEVEL SECURITY;

-- Therapists see logs for sessions in their own clinic; admins see all
CREATE POLICY appointment_log_select ON public.appointment_log
  FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id() OR public.is_admin());

-- Only clinic members can insert logs (service-role bypasses this for bulk ops)
CREATE POLICY appointment_log_insert ON public.appointment_log
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());
