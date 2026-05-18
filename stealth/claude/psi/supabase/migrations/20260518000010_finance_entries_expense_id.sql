-- =============================================================================
-- Psi — finance_entries: add expense_id FK to expenses
-- =============================================================================
-- Replaces the dropped `description` column as the link between a finance entry
-- and the expense it pays. Nullable because not all entries originate from an
-- expense (e.g. session-revenue entries). ON DELETE SET NULL preserves history
-- when an expense is deleted.
-- =============================================================================

ALTER TABLE public.finance_entries
  ADD COLUMN expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL;
