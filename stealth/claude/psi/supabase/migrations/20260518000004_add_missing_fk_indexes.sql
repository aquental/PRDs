-- =============================================================================
-- Psi — add missing FK indexes for RLS-critical and frequently-joined columns
-- =============================================================================
-- All queries that go through Supabase RLS filter by clinic_id. Without an
-- index on this column the planner falls back to a sequential scan, which
-- becomes a performance problem as rows accumulate.
-- =============================================================================

-- RLS-critical: clinic_id is the primary isolation key in every RLS policy
CREATE INDEX IF NOT EXISTS idx_expenses_clinic        ON public.expenses        (clinic_id);
CREATE INDEX IF NOT EXISTS idx_sessions_clinic        ON public.sessions        (clinic_id);
CREATE INDEX IF NOT EXISTS idx_schedules_clinic       ON public.schedules       (clinic_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_clinic ON public.finance_entries (clinic_id);

-- Frequent joins
CREATE INDEX IF NOT EXISTS idx_schedules_patient       ON public.schedules       (patient_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_patient ON public.finance_entries (patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_therapist       ON public.ai_usage_logs   (therapist_id);

-- Templates por paciente (parcial: apenas linhas com patient_id preenchido)
CREATE INDEX IF NOT EXISTS idx_templates_patient
  ON public.templates (patient_id)
  WHERE patient_id IS NOT NULL;
