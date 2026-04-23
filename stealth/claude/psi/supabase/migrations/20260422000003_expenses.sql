CREATE TYPE expense_frequency AS ENUM ('monthly', 'quarterly', 'annual', 'one_time');

CREATE TABLE public.expenses (
  id             uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      uuid             NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  description    text             NOT NULL,
  amount         numeric(10,2)    NOT NULL DEFAULT 0,
  frequency      expense_frequency NOT NULL DEFAULT 'monthly',
  due_day        smallint         CHECK (due_day BETWEEN 1 AND 28),
  due_date       date,
  is_active      boolean          NOT NULL DEFAULT true,
  notes          text,
  created_at     timestamptz      NOT NULL DEFAULT now(),
  updated_at     timestamptz      NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_members_own_expenses" ON public.expenses
  USING  (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE TRIGGER expenses_set_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
