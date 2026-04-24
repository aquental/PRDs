-- =============================================================================
-- Psi — Tabelas filhas de patients: endereço (1:1) e parentes (1:N)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- patient_addresses (1:1) — shared PK para evitar coluna + índice extras
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_addresses (
  patient_id    UUID PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
  logradouro    TEXT NOT NULL,
  numero        TEXT,
  complemento   TEXT,
  cep           TEXT NOT NULL,
  cidade        TEXT NOT NULL,
  estado        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER patient_addresses_set_updated_at
  BEFORE UPDATE ON public.patient_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- patient_relatives (1:N)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_relatives (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  telefone     TEXT,
  endereco     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_relatives_patient ON public.patient_relatives(patient_id);

CREATE TRIGGER patient_relatives_set_updated_at
  BEFORE UPDATE ON public.patient_relatives
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — mesmo padrão das outras tabelas (isolamento via clinic_id do paciente)
-- ---------------------------------------------------------------------------
ALTER TABLE public.patient_addresses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_relatives  ENABLE ROW LEVEL SECURITY;

-- ---- patient_addresses ----
CREATE POLICY patient_addresses_select ON public.patient_addresses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_addresses.patient_id
      AND (p.clinic_id = public.current_clinic_id() OR public.is_admin())
  ));

CREATE POLICY patient_addresses_insert ON public.patient_addresses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_addresses.patient_id
      AND p.clinic_id = public.current_clinic_id()
  ));

CREATE POLICY patient_addresses_update ON public.patient_addresses FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_addresses.patient_id
      AND p.clinic_id = public.current_clinic_id()
  ));

CREATE POLICY patient_addresses_delete ON public.patient_addresses FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_addresses.patient_id
      AND p.clinic_id = public.current_clinic_id()
  ));

-- ---- patient_relatives ----
CREATE POLICY patient_relatives_select ON public.patient_relatives FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_relatives.patient_id
      AND (p.clinic_id = public.current_clinic_id() OR public.is_admin())
  ));

CREATE POLICY patient_relatives_insert ON public.patient_relatives FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_relatives.patient_id
      AND p.clinic_id = public.current_clinic_id()
  ));

CREATE POLICY patient_relatives_update ON public.patient_relatives FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_relatives.patient_id
      AND p.clinic_id = public.current_clinic_id()
  ));

CREATE POLICY patient_relatives_delete ON public.patient_relatives FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_relatives.patient_id
      AND p.clinic_id = public.current_clinic_id()
  ));
