-- template_category enum
CREATE TYPE template_category AS ENUM (
  'anamnese',
  'evolucao',
  'relatorio',
  'consentimento',
  'outro'
);

-- templates table
CREATE TABLE public.templates (
  id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id    uuid        NOT NULL REFERENCES public.clinics(id)     ON DELETE CASCADE,
  therapist_id uuid        NOT NULL REFERENCES public.therapists(id)  ON DELETE CASCADE,
  category     template_category NOT NULL DEFAULT 'outro',
  title        text        NOT NULL,
  body         text        NOT NULL DEFAULT '',
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX templates_clinic_id_idx     ON public.templates (clinic_id);
CREATE INDEX templates_therapist_id_idx  ON public.templates (therapist_id);
CREATE INDEX templates_category_idx      ON public.templates (category);

CREATE TRIGGER set_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "therapists can manage own templates"
  ON public.templates
  FOR ALL
  USING  (clinic_id = current_clinic_id())
  WITH CHECK (clinic_id = current_clinic_id());
