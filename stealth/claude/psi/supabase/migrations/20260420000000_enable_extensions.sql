-- =============================================================================
-- Psi — Enable required PostgreSQL extensions
-- =============================================================================
-- Este arquivo DEVE rodar antes de 20260421000000_initial_schema.sql.
-- O nome usa timestamp anterior para garantir ordem alfabética/cronológica
-- correta na execução de migrations pelo Supabase CLI.
--
-- Extensões habilitadas:
--
-- 1. pgcrypto
--    - gen_random_uuid()        → geração moderna de UUID (preferido)
--    - pgp_sym_encrypt/decrypt  → criptografia de campo (LGPD)
--                                 usada em patients.cpf_encrypted,
--                                 patients.notes_encrypted,
--                                 sessions.notes_encrypted,
--                                 therapists.google_refresh_token_encrypted
--    - digest(), hmac()         → hashing auxiliar
--
-- 2. uuid-ossp
--    - uuid_generate_v4()       → geração legada de UUID, mantida para
--                                 compatibilidade com o schema inicial
--                                 existente. Código novo deve preferir
--                                 gen_random_uuid().
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sanity check (opcional): falha cedo se alguma extensão não ficou ativa.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'pgcrypto extension is not enabled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
    RAISE EXCEPTION 'uuid-ossp extension is not enabled';
  END IF;
END
$$;
