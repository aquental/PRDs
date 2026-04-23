-- Kill-switch registry para serviços externos.
-- Supabase não tem kill-switch (seria auto-destrutivo).
-- Gerenciado pelo admin em /admin/services.

CREATE TABLE IF NOT EXISTS public.service_switches (
  id          TEXT        PRIMARY KEY,           -- 'cep' | 'llm' | 'tts' | 'redis'
  enabled     BOOLEAN     NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT                               -- admin email
);

-- Somente o service-role pode gravar; leitura bloqueada para anon/authenticated.
ALTER TABLE public.service_switches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access"
  ON public.service_switches
  USING (true)
  WITH CHECK (true);

-- Seed: garante que as linhas existam com valores padrão ao aplicar a migration.
INSERT INTO public.service_switches (id, enabled) VALUES
  ('cep',   true),
  ('llm',   true),
  ('tts',   true),
  ('redis', true)
ON CONFLICT (id) DO NOTHING;
