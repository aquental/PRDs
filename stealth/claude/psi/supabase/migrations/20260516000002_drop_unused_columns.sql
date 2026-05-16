-- Remove columns that have no code usage and table platform_reports that is entirely unused.

ALTER TABLE public.therapists
  DROP COLUMN IF EXISTS cpf_encrypted,
  DROP COLUMN IF EXISTS google_refresh_token_encrypted,
  DROP COLUMN IF EXISTS google_calendar_id;

ALTER TABLE public.admins
  DROP COLUMN IF EXISTS name;

ALTER TABLE public.patients
  DROP COLUMN IF EXISTS cpf_encrypted,
  DROP COLUMN IF EXISTS invoice_data,
  DROP COLUMN IF EXISTS notes_encrypted,
  DROP COLUMN IF EXISTS relatives;

ALTER TABLE public.sessions
  DROP COLUMN IF EXISTS notes_encrypted,
  DROP COLUMN IF EXISTS google_calendar_event_id;

ALTER TABLE public.finance_entries
  DROP COLUMN IF EXISTS session_id,
  DROP COLUMN IF EXISTS description;

DROP TABLE IF EXISTS public.platform_reports;
