-- =============================================================================
-- Psi — expenses: enforce mutual exclusivity of due_day / due_date by frequency
-- =============================================================================
-- A monthly expense must have a due_day (1–28).
-- A one_time expense must have a due_date.
-- Zero constraint violations confirmed before apply.
-- =============================================================================

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_due_day_required_for_monthly
    CHECK (frequency != 'monthly'  OR due_day  IS NOT NULL),
  ADD CONSTRAINT expenses_due_date_required_for_one_time
    CHECK (frequency != 'one_time' OR due_date IS NOT NULL);
