ALTER TABLE public.templates
  ADD COLUMN patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL;
