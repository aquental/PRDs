-- =============================================================================
-- Psi — clinics: add min_therapists configuration field
-- =============================================================================
-- Controls the threshold above which a clinic operates in "clinic mode".
-- Default 2: clinic mode activates when therapistCount >= 2.
-- CHECK ensures the value is always meaningful (>= 1).
-- =============================================================================

ALTER TABLE public.clinics
  ADD COLUMN min_therapists integer NOT NULL DEFAULT 2
    CHECK (min_therapists >= 1);
