CREATE TABLE public.holidays (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  day         SMALLINT    NOT NULL CHECK (day BETWEEN 1 AND 31),
  month       SMALLINT    NOT NULL CHECK (month BETWEEN 1 AND 12),
  year        SMALLINT,                    -- NULL = repeat every year; set for movable holidays
  name        TEXT        NOT NULL,
  description TEXT,
  type        TEXT        NOT NULL CHECK (type IN ('nacional', 'estadual', 'local')),
  state       CHAR(2),                     -- NULL for nacional; 2-letter UF otherwise
  city        TEXT,                        -- NULL for nacional/estadual; city name for local
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read holidays
CREATE POLICY "holidays_read" ON public.holidays
  FOR SELECT TO authenticated USING (true);

-- Fixed national holidays (year = NULL → applies every year)
INSERT INTO public.holidays (day, month, name, type) VALUES
  (1,  1,  'Confraternização Universal', 'nacional'),
  (21, 4,  'Tiradentes',                 'nacional'),
  (1,  5,  'Dia do Trabalho',            'nacional'),
  (7,  9,  'Independência do Brasil',    'nacional'),
  (12, 10, 'Nossa Sra. Aparecida',       'nacional'),
  (2,  11, 'Finados',                    'nacional'),
  (15, 11, 'Proclamação da República',   'nacional'),
  (20, 11, 'Consciência Negra',          'nacional'),
  (25, 12, 'Natal',                      'nacional');
