CREATE TABLE IF NOT EXISTS month_closures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  therapist_id    UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  month_year      TEXT NOT NULL CHECK (month_year ~ '^\d{4}-\d{2}$'),
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'closed')),
  closed_at       TIMESTAMPTZ,
  closed_by       UUID REFERENCES therapists(id),
  reopened_at     TIMESTAMPTZ,
  reopened_by     UUID REFERENCES therapists(id),
  log             JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (clinic_id, therapist_id, month_year)
);

CREATE TRIGGER set_month_closures_updated_at
  BEFORE UPDATE ON month_closures
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE month_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "month_closures_select" ON month_closures
  FOR SELECT USING (clinic_id = current_clinic_id() OR is_admin());

CREATE POLICY "month_closures_insert" ON month_closures
  FOR INSERT WITH CHECK (clinic_id = current_clinic_id());

CREATE POLICY "month_closures_update" ON month_closures
  FOR UPDATE USING (clinic_id = current_clinic_id());
