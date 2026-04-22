ALTER TABLE public.therapists
  ADD COLUMN IF NOT EXISTS default_session_fee NUMERIC(10,2) DEFAULT 250;
