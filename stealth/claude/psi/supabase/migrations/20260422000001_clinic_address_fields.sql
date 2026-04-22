ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS address_street     TEXT,
  ADD COLUMN IF NOT EXISTS address_complement TEXT,
  ADD COLUMN IF NOT EXISTS address_zip        TEXT,
  ADD COLUMN IF NOT EXISTS address_city       TEXT,
  ADD COLUMN IF NOT EXISTS address_state      TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS address_number TEXT;

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS working_hours_start SMALLINT NOT NULL DEFAULT 7 CHECK (working_hours_start BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS working_hours_end   SMALLINT NOT NULL DEFAULT 21 CHECK (working_hours_end   BETWEEN 1 AND 24);
