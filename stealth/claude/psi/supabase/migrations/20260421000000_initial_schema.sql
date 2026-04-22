-- ============================================================================
-- Psi · Initial schema migration
-- Version: 1.0 (April 2026)
-- ============================================================================
-- Alinhado com MODEL.md e PRD v1:
--   · Tenancy por clinic_id
--   · LGPD: pgcrypto (pgp_sym_encrypt) para dados sensíveis
--   · RLS em todas as tabelas de domínio
--   · Três interfaces: psicólogo, admin, paciente (via Calendar, sem login)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE session_status AS ENUM ('scheduled','completed','cancelled','no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE finance_entry_type AS ENUM ('revenue','expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE ai_call_type        AS ENUM ('llm_chat', 'tts_synthesis', 'stt_transcription');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE chat_message_role   AS ENUM ('user', 'assistant', 'system', 'tool');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Updated_at trigger helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------------
-- clinics
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  cnpj        TEXT,
  address     TEXT,
  timezone    TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER clinics_set_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- therapists
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.therapists (
  id                                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                           UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id                         UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name                              TEXT NOT NULL,
  crp                               TEXT NOT NULL,
  cpf_encrypted                     BYTEA,
  cnpj                              TEXT,
  phone                             TEXT,
  email                             TEXT NOT NULL,
  address                           TEXT,
  avatar_url                        TEXT,
  google_refresh_token_encrypted    BYTEA,
  google_calendar_id                TEXT,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER therapists_set_updated_at
  BEFORE UPDATE ON public.therapists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- admins
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_clinic_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT clinic_id FROM public.therapists WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patients (
  id                                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id                         UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  therapist_id                      UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  name                              TEXT NOT NULL,
  email                             TEXT,
  phone                             TEXT,
  address                           TEXT,
  cpf_encrypted                     BYTEA,
  birth_date                        DATE,
  relatives                         JSONB NOT NULL DEFAULT '[]'::jsonb,
  invoice_data                      JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_fee                       NUMERIC(10,2) CHECK (session_fee IS NULL OR session_fee >= 0),
  sessions_per_month                INTEGER DEFAULT 4 CHECK (sessions_per_month >= 0),
  frequency                         TEXT,
  notes_encrypted                   BYTEA,
  active                            BOOLEAN NOT NULL DEFAULT TRUE,
  google_calendar_attendee_email    TEXT,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patients_therapist ON public.patients(therapist_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic    ON public.patients(clinic_id);
CREATE TRIGGER patients_set_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
  id                                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id                         UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  therapist_id                      UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  patient_id                        UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  scheduled_at                      TIMESTAMPTZ NOT NULL,
  duration_minutes                  INTEGER NOT NULL DEFAULT 50 CHECK (duration_minutes > 0),
  fee                               NUMERIC(10,2) CHECK (fee IS NULL OR fee >= 0),
  status                            session_status NOT NULL DEFAULT 'scheduled',
  notes_encrypted                   BYTEA,
  google_calendar_event_id          TEXT UNIQUE,
  paid                              BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at                           TIMESTAMPTZ,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_therapist_scheduled ON public.sessions(therapist_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sessions_patient             ON public.sessions(patient_id);
CREATE TRIGGER sessions_set_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- finance_entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  therapist_id   UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  patient_id     UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  session_id     UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  type           finance_entry_type NOT NULL,
  amount         NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  description    TEXT,
  occurred_at    DATE NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_finance_therapist_occurred ON public.finance_entries(therapist_id, occurred_at);

-- ---------------------------------------------------------------------------
-- ai_usage_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  therapist_id    UUID REFERENCES public.therapists(id) ON DELETE SET NULL,
  call_type       ai_call_type NOT NULL,
  provider        TEXT NOT NULL,
  model           TEXT,
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  characters      INTEGER NOT NULL DEFAULT 0,
  cost_usd        NUMERIC(12,6) NOT NULL DEFAULT 0,
  duration_ms     INTEGER,
  status          TEXT NOT NULL DEFAULT 'success',
  error_message   TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_logs_clinic_created ON public.ai_usage_logs(clinic_id, created_at);

-- ---------------------------------------------------------------------------
-- platform_reports (admin only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type    TEXT NOT NULL,
  period_start   DATE,
  period_end     DATE,
  data           JSONB NOT NULL,
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- chat_conversations / chat_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  therapist_id   UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  title          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_conv_therapist_updated ON public.chat_conversations(therapist_id, updated_at DESC);
CREATE TRIGGER chat_conversations_set_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role              chat_message_role NOT NULL,
  content           TEXT NOT NULL,
  tts_audio_url     TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv_created ON public.chat_messages(conversation_id, created_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE public.clinics             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapists          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages       ENABLE ROW LEVEL SECURITY;

-- ---- clinics ----
CREATE POLICY clinics_select ON public.clinics FOR SELECT
  USING (id = public.current_clinic_id() OR public.is_admin());
CREATE POLICY clinics_insert ON public.clinics FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY clinics_update ON public.clinics FOR UPDATE
  USING (id = public.current_clinic_id() OR public.is_admin());

-- ---- therapists ----
CREATE POLICY therapists_select ON public.therapists FOR SELECT
  USING (user_id = auth.uid() OR clinic_id = public.current_clinic_id() OR public.is_admin());
CREATE POLICY therapists_insert ON public.therapists FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY therapists_update ON public.therapists FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

-- ---- admins (admin-only) ----
CREATE POLICY admins_select ON public.admins FOR SELECT USING (public.is_admin());

-- ---- patients ----
CREATE POLICY patients_select ON public.patients FOR SELECT
  USING (clinic_id = public.current_clinic_id() OR public.is_admin());
CREATE POLICY patients_insert ON public.patients FOR INSERT
  WITH CHECK (clinic_id = public.current_clinic_id());
CREATE POLICY patients_update ON public.patients FOR UPDATE
  USING (clinic_id = public.current_clinic_id());
CREATE POLICY patients_delete ON public.patients FOR DELETE
  USING (clinic_id = public.current_clinic_id());

-- ---- sessions ----
CREATE POLICY sessions_select ON public.sessions FOR SELECT
  USING (clinic_id = public.current_clinic_id() OR public.is_admin());
CREATE POLICY sessions_insert ON public.sessions FOR INSERT
  WITH CHECK (clinic_id = public.current_clinic_id());
CREATE POLICY sessions_update ON public.sessions FOR UPDATE
  USING (clinic_id = public.current_clinic_id());
CREATE POLICY sessions_delete ON public.sessions FOR DELETE
  USING (clinic_id = public.current_clinic_id());

-- ---- finance_entries ----
CREATE POLICY finance_select ON public.finance_entries FOR SELECT
  USING (clinic_id = public.current_clinic_id() OR public.is_admin());
CREATE POLICY finance_insert ON public.finance_entries FOR INSERT
  WITH CHECK (clinic_id = public.current_clinic_id());
CREATE POLICY finance_update ON public.finance_entries FOR UPDATE
  USING (clinic_id = public.current_clinic_id());
CREATE POLICY finance_delete ON public.finance_entries FOR DELETE
  USING (clinic_id = public.current_clinic_id());

-- ---- ai_usage_logs ----
CREATE POLICY ai_logs_select ON public.ai_usage_logs FOR SELECT
  USING (clinic_id = public.current_clinic_id() OR public.is_admin());
CREATE POLICY ai_logs_insert ON public.ai_usage_logs FOR INSERT
  WITH CHECK (clinic_id = public.current_clinic_id() OR public.is_admin());

-- ---- platform_reports (admin-only) ----
CREATE POLICY platform_reports_all ON public.platform_reports
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---- chat_conversations ----
CREATE POLICY chat_conv_select ON public.chat_conversations FOR SELECT
  USING (clinic_id = public.current_clinic_id() OR public.is_admin());
CREATE POLICY chat_conv_insert ON public.chat_conversations FOR INSERT
  WITH CHECK (clinic_id = public.current_clinic_id());
CREATE POLICY chat_conv_update ON public.chat_conversations FOR UPDATE
  USING (clinic_id = public.current_clinic_id());
CREATE POLICY chat_conv_delete ON public.chat_conversations FOR DELETE
  USING (clinic_id = public.current_clinic_id());

-- ---- chat_messages ----
CREATE POLICY chat_msg_select ON public.chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND (c.clinic_id = public.current_clinic_id() OR public.is_admin())
  ));
CREATE POLICY chat_msg_insert ON public.chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND c.clinic_id = public.current_clinic_id()
  ));

-- ============================================================================
-- Realtime publication
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions, public.patients, public.chat_messages;
