-- =============================================================================
-- Psi — therapists: enforce default_session_fee NOT NULL
-- =============================================================================
-- The column already carries DEFAULT 250. Zero NULL rows confirmed before apply.
-- Without NOT NULL an explicit UPDATE … SET default_session_fee = NULL
-- would silently break the fee resolution chain (patient → therapist → fallback).
-- =============================================================================

ALTER TABLE public.therapists
  ALTER COLUMN default_session_fee SET NOT NULL;
