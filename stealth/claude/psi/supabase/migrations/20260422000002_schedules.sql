DO $$ BEGIN
  CREATE TYPE schedule_frequency AS ENUM ('weekly', 'biweekly');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.schedules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  therapist_id     UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  patient_id       UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  day_of_week      SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- 1=Seg, 5=Sex
  start_time       TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 50 CHECK (duration_minutes > 0),
  frequency        schedule_frequency NOT NULL DEFAULT 'weekly',
  fee              NUMERIC(10,2),
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (therapist_id, day_of_week, start_time)
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY schedules_select ON public.schedules FOR SELECT
  USING (clinic_id = public.current_clinic_id() OR public.is_admin());
CREATE POLICY schedules_insert ON public.schedules FOR INSERT
  WITH CHECK (clinic_id = public.current_clinic_id());
CREATE POLICY schedules_update ON public.schedules FOR UPDATE
  USING (clinic_id = public.current_clinic_id());
CREATE POLICY schedules_delete ON public.schedules FOR DELETE
  USING (clinic_id = public.current_clinic_id());
