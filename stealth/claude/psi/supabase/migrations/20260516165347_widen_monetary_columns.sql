-- Widen all BRL monetary columns from numeric(10,2) to numeric(15,2).
-- This is a precision-only widening (5 extra digits before the decimal); no data
-- conversion is required and no existing value can be truncated.
-- cost_usd (numeric(12,6) in ai_usage_logs) is intentionally left unchanged.

BEGIN;

ALTER TABLE public.patients
  ALTER COLUMN session_fee TYPE numeric(15,2);

ALTER TABLE public.sessions
  ALTER COLUMN fee TYPE numeric(15,2);

ALTER TABLE public.schedules
  ALTER COLUMN fee TYPE numeric(15,2);

ALTER TABLE public.finance_entries
  ALTER COLUMN amount TYPE numeric(15,2);

ALTER TABLE public.expenses
  ALTER COLUMN amount TYPE numeric(15,2);

ALTER TABLE public.therapists
  ALTER COLUMN default_session_fee TYPE numeric(15,2);

COMMIT;
