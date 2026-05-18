-- =============================================================================
-- Psi — patients: replace partial unique index on (clinic_id, cpf)
-- =============================================================================
-- With cpf NOT NULL the WHERE cpf IS NOT NULL predicate is always true,
-- making the partial index semantically equivalent to a full unique index.
-- Replace with a plain UNIQUE index for clarity and correctness.
-- =============================================================================

DROP INDEX IF EXISTS public.patients_clinic_cpf_uidx;

CREATE UNIQUE INDEX patients_clinic_cpf_uidx
  ON public.patients (clinic_id, cpf);
