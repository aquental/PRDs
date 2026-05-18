-- =============================================================================
-- Psi — patients: drop legacy fields (address, birth_date, frequency)
-- =============================================================================
-- !! DO NOT APPLY until phases 3–5 (types, server actions, UI) are deployed
-- and confirmed working without these columns. !!
--
-- address   → patient_addresses table (1:1, added in 20260424175948)
-- birth_date → removed from product (not replaced)
-- frequency  → removed from product (scheduling frequency lives on schedules)
-- =============================================================================

ALTER TABLE public.patients
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS birth_date,
  DROP COLUMN IF EXISTS frequency;
