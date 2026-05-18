-- =============================================================================
-- Psi — holidays: fix state column type and add valid UF constraint
-- =============================================================================
-- character(2) pads values with trailing spaces and can cause subtle equality
-- bugs. Replace with varchar(2). Add a CHECK to enforce valid Brazilian state
-- abbreviations (NULL allowed for national holidays).
-- All 9 existing rows have state = NULL — no backfill needed.
-- =============================================================================

ALTER TABLE public.holidays
  ALTER COLUMN state TYPE varchar(2);

ALTER TABLE public.holidays
  ADD CONSTRAINT holidays_state_valid_uf
    CHECK (
      state IS NULL OR state IN (
        'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
        'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
        'RS','RO','RR','SC','SP','SE','TO'
      )
    );
