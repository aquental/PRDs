-- =============================================================================
-- Psi — patients: enforce cpf NOT NULL
-- =============================================================================
-- Safe to apply only after all existing rows have a cpf value.
-- Verified: SELECT COUNT(*) - COUNT(cpf) FROM patients returned 0.
-- =============================================================================

ALTER TABLE public.patients ALTER COLUMN cpf SET NOT NULL;
