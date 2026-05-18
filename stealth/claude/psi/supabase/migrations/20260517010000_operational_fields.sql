-- Cancellation timestamp on sessions (for auto-classification)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Cancellation policy on clinics
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS cancellation_window_hours SMALLINT NOT NULL DEFAULT 24
    CHECK (cancellation_window_hours >= 0 AND cancellation_window_hours <= 168);

-- Repasse config on clinics (modo clínica)
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS repasse_fixo NUMERIC(15,2) NOT NULL DEFAULT 0
    CHECK (repasse_fixo >= 0),
  ADD COLUMN IF NOT EXISTS repasse_percentual NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (repasse_percentual >= 0 AND repasse_percentual <= 100);

-- Cancellation override per patient
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT NOT NULL DEFAULT 'default'
    CHECK (cancellation_policy IN ('default', 'sempre_abona', 'sempre_cobra', 'janela_custom')),
  ADD COLUMN IF NOT EXISTS cancellation_window_hours SMALLINT
    CHECK (cancellation_window_hours IS NULL OR cancellation_window_hours >= 0);
