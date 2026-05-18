-- =============================================================================
-- Psi — patients: add cpf, start_date, notes
-- =============================================================================
-- Run BEFORE dropping legacy columns (20260518000001).
-- cpf is VARCHAR(11) — stored as raw digits only (no punctuation).
-- Unique constraint is scoped per clinic so the same person can be a patient
-- at multiple clinics without conflict.
-- =============================================================================

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS cpf        VARCHAR(11),
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS notes      TEXT;

-- Partial unique index: only enforces uniqueness when cpf is provided.
CREATE UNIQUE INDEX IF NOT EXISTS patients_clinic_cpf_uidx
  ON public.patients (clinic_id, cpf)
  WHERE cpf IS NOT NULL;
