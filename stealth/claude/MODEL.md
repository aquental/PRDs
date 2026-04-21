# MODEL.md — Psi · Modelo de Dados

**Versão:** 1.0 (abril/2026)
**Stack:** PostgreSQL 15+ (Supabase) · pgcrypto · uuid-ossp · Supabase Auth · Row Level Security
**Alinhamento:** PRD v1 — três interfaces (psicólogo, paciente via Google Calendar, admin)

---

## 1. Princípios do modelo

1. **Tenancy por `clinic_id`** — toda tabela de domínio carrega `clinic_id` para isolamento via RLS.
2. **LGPD-first** — dados sensíveis (`cpf`, notas clínicas, `google_refresh_token`) armazenados como `BYTEA` criptografado com `pgcrypto` (`pgp_sym_encrypt`).
3. **Paciente nunca autentica** — não há tabela `patients.user_id`. Paciente é convidado do calendar via `google_calendar_attendee_email`.
4. **Admin é uma role global** — tabela `admins` separada, função `is_admin()` usada em todas as policies.
5. **Logging first-class** — `ai_usage_logs` registra *toda* chamada LLM/TTS/STT desde o dia 1 (mitigação de custo).
6. **Auditoria temporal** — `created_at` e `updated_at` em todas as entidades mutáveis, com trigger automático.

---

## 2. Visão geral (ERD textual)

```
auth.users ────┬──── therapists ──── clinics ────┐
               │         │                       │
               └── admins │                       │
                         ├── patients ───────────┤
                         │      │                 │
                         │      ├── sessions ─────┤
                         │      │       │         │
                         │      └── finance_entries
                         │
                         └── chat_conversations ── chat_messages
                                   │
                                   └── ai_usage_logs ◄── (também de rotas públicas)

platform_reports ──── (admin-only, sem FK de tenant)
```

---

## 3. Tipos enumerados

| Tipo                  | Valores                                                   | Uso                          |
| --------------------- | --------------------------------------------------------- | ---------------------------- |
| `session_status`      | `scheduled`, `completed`, `cancelled`, `no_show`          | `sessions.status`            |
| `finance_entry_type`  | `revenue`, `expense`                                      | `finance_entries.type`       |
| `ai_call_type`        | `llm_chat`, `tts_synthesis`, `stt_transcription`          | `ai_usage_logs.call_type`    |
| `chat_message_role`   | `user`, `assistant`, `system`, `tool`                     | `chat_messages.role`         |

---

## 4. Tabelas

### 4.1 `clinics` — Workspace/Tenant

Workspace obrigatório que agrupa terapeuta, pacientes, sessões e finanças.

| Coluna       | Tipo           | Constraints            | Observações                |
| ------------ | -------------- | ---------------------- | -------------------------- |
| `id`         | `UUID`         | PK, default `uuid_generate_v4()` |                  |
| `name`       | `TEXT`         | `NOT NULL`             | Nome da clínica            |
| `cnpj`       | `TEXT`         |                        | Opcional (profissional liberal) |
| `address`    | `TEXT`         |                        |                            |
| `timezone`   | `TEXT`         | `NOT NULL DEFAULT 'America/Sao_Paulo'` |             |
| `created_at` | `TIMESTAMPTZ`  | `DEFAULT NOW()`        |                            |
| `updated_at` | `TIMESTAMPTZ`  | `DEFAULT NOW()`        | trigger `set_updated_at`   |

### 4.2 `therapists` — Psicóloga(o)

Perfil profissional. 1:1 com `auth.users`.

| Coluna                  | Tipo           | Constraints                                | Observações                         |
| ----------------------- | -------------- | ------------------------------------------ | ----------------------------------- |
| `id`                    | `UUID`         | PK                                         |                                     |
| `user_id`               | `UUID`         | `UNIQUE NOT NULL`, FK `auth.users(id)` `ON DELETE CASCADE` | Supabase Auth   |
| `clinic_id`             | `UUID`         | `NOT NULL`, FK `clinics(id)` `ON DELETE CASCADE` |                               |
| `name`                  | `TEXT`         | `NOT NULL`                                 |                                     |
| `crp`                   | `TEXT`         | `NOT NULL`                                 | Ex.: `06/12345`                     |
| `cpf_encrypted`         | `BYTEA`        |                                            | `pgp_sym_encrypt(cpf, key)`         |
| `cnpj`                  | `TEXT`         |                                            |                                     |
| `phone`                 | `TEXT`         |                                            |                                     |
| `email`                 | `TEXT`         | `NOT NULL`                                 |                                     |
| `address`               | `TEXT`         |                                            |                                     |
| `avatar_url`            | `TEXT`         |                                            | Supabase Storage                    |
| `google_refresh_token_encrypted` | `BYTEA` |                                           | OAuth calendar (LGPD)               |
| `google_calendar_id`    | `TEXT`         |                                            | calendar default                    |
| `created_at`/`updated_at` | `TIMESTAMPTZ` |                                          |                                     |

### 4.3 `admins` — Operadores da plataforma

Role global. **Independente de `clinic_id`**.

| Coluna       | Tipo    | Constraints                                |
| ------------ | ------- | ------------------------------------------ |
| `id`         | `UUID`  | PK                                         |
| `user_id`    | `UUID`  | `UNIQUE NOT NULL`, FK `auth.users(id)`     |
| `email`      | `TEXT`  | `NOT NULL`                                 |
| `name`       | `TEXT`  |                                            |
| `created_at` | `TIMESTAMPTZ` |                                      |

### 4.4 `patients` — Pacientes

Dados clínicos e de faturamento do paciente.

| Coluna                           | Tipo           | Constraints                                    | Observações                            |
| -------------------------------- | -------------- | ---------------------------------------------- | -------------------------------------- |
| `id`                             | `UUID`         | PK                                             |                                        |
| `clinic_id`                      | `UUID`         | `NOT NULL`, FK `clinics(id)` `ON DELETE CASCADE` | tenancy                              |
| `therapist_id`                   | `UUID`         | `NOT NULL`, FK `therapists(id)` `ON DELETE CASCADE` |                                  |
| `name`                           | `TEXT`         | `NOT NULL`                                     |                                        |
| `email`                          | `TEXT`         |                                                |                                        |
| `phone`                          | `TEXT`         |                                                |                                        |
| `address`                        | `TEXT`         |                                                |                                        |
| `cpf_encrypted`                  | `BYTEA`        |                                                | LGPD                                   |
| `birth_date`                     | `DATE`         |                                                |                                        |
| `relatives`                      | `JSONB`        | `DEFAULT '[]'::jsonb`                          | `[{name, relation, phone, email}]`     |
| `invoice_data`                   | `JSONB`        | `DEFAULT '{}'::jsonb`                          | `{cpf, address, phone, email}`         |
| `session_fee`                    | `NUMERIC(10,2)`|                                                | valor padrão da consulta               |
| `sessions_per_month`             | `INTEGER`      | `DEFAULT 4`                                    |                                        |
| `frequency`                      | `TEXT`         |                                                | Ex.: `weekly`, `biweekly`              |
| `notes_encrypted`                | `BYTEA`        |                                                | Observações clínicas gerais            |
| `active`                         | `BOOLEAN`      | `DEFAULT TRUE`                                 |                                        |
| `google_calendar_attendee_email` | `TEXT`         |                                                | Email usado como convidado do Calendar |
| `created_at`/`updated_at`        | `TIMESTAMPTZ`  |                                                |                                        |

### 4.5 `sessions` — Sessões de terapia

| Coluna                         | Tipo           | Constraints                                  | Observações                              |
| ------------------------------ | -------------- | -------------------------------------------- | ---------------------------------------- |
| `id`                           | `UUID`         | PK                                           |                                          |
| `clinic_id`                    | `UUID`         | `NOT NULL`, FK `clinics(id)`                 |                                          |
| `therapist_id`                 | `UUID`         | `NOT NULL`, FK `therapists(id)`              |                                          |
| `patient_id`                   | `UUID`         | `NOT NULL`, FK `patients(id)` `ON DELETE CASCADE` |                                     |
| `scheduled_at`                 | `TIMESTAMPTZ`  | `NOT NULL`                                   |                                          |
| `duration_minutes`             | `INTEGER`      | `DEFAULT 50`                                 |                                          |
| `fee`                          | `NUMERIC(10,2)`|                                              | Snapshot; pode divergir do `session_fee` atual do paciente |
| `status`                       | `session_status` | `DEFAULT 'scheduled'`                       |                                          |
| `notes_encrypted`              | `BYTEA`        |                                              | Prontuário da sessão (LGPD)              |
| `google_calendar_event_id`     | `TEXT`         | `UNIQUE`                                     | Idempotência da sincronização            |
| `paid`                         | `BOOLEAN`      | `DEFAULT FALSE`                              |                                          |
| `paid_at`                      | `TIMESTAMPTZ`  |                                              |                                          |
| `created_at`/`updated_at`      | `TIMESTAMPTZ`  |                                              |                                          |

### 4.6 `finance_entries` — Lançamentos financeiros

Suporta projeção de receita e custos explicitamente, sem depender de agregação sobre `sessions`.

| Coluna         | Tipo             | Constraints                            | Observações                         |
| -------------- | ---------------- | -------------------------------------- | ----------------------------------- |
| `id`           | `UUID`           | PK                                     |                                     |
| `clinic_id`    | `UUID`           | `NOT NULL`, FK                          |                                     |
| `therapist_id` | `UUID`           | `NOT NULL`, FK                          |                                     |
| `patient_id`   | `UUID`           | FK `patients(id)` `ON DELETE SET NULL`  | opcional                            |
| `session_id`   | `UUID`           | FK `sessions(id)` `ON DELETE SET NULL`  | opcional                            |
| `type`         | `finance_entry_type` | `NOT NULL`                          | `revenue` ou `expense`              |
| `amount`       | `NUMERIC(10,2)`  | `NOT NULL`, `CHECK (amount >= 0)`       | valor absoluto; sinal vem de `type` |
| `description`  | `TEXT`           |                                        |                                     |
| `occurred_at`  | `DATE`           | `NOT NULL`                              |                                     |
| `created_at`   | `TIMESTAMPTZ`    |                                        |                                     |

### 4.7 `ai_usage_logs` — Logging de IA/TTS (core observability)

Toda chamada ao LLM, TTS ou STT é registrada. Consumido por relatório do terapeuta **e** pela interface admin.

| Coluna           | Tipo               | Constraints                      | Observações                              |
| ---------------- | ------------------ | -------------------------------- | ---------------------------------------- |
| `id`             | `UUID`             | PK                               |                                          |
| `clinic_id`      | `UUID`             | FK `clinics(id)` `ON DELETE SET NULL` | null permitido para logs do admin    |
| `therapist_id`   | `UUID`             | FK `therapists(id)` `ON DELETE SET NULL` |                                  |
| `call_type`      | `ai_call_type`     | `NOT NULL`                       |                                          |
| `provider`       | `TEXT`             | `NOT NULL`                       | Ex.: `openai`, `anthropic`, `elevenlabs` |
| `model`          | `TEXT`             |                                  | Ex.: `gpt-4o-mini`, `eleven_turbo_v2_5`  |
| `input_tokens`   | `INTEGER`          | `DEFAULT 0`                      |                                          |
| `output_tokens`  | `INTEGER`          | `DEFAULT 0`                      |                                          |
| `characters`     | `INTEGER`          | `DEFAULT 0`                      | Para TTS                                 |
| `cost_usd`       | `NUMERIC(12,6)`    | `DEFAULT 0`                      |                                          |
| `duration_ms`    | `INTEGER`          |                                  |                                          |
| `status`         | `TEXT`             | `DEFAULT 'success'`              | `success` ou `error`                     |
| `error_message`  | `TEXT`             |                                  |                                          |
| `metadata`       | `JSONB`            | `DEFAULT '{}'::jsonb`            | livre (request_id, etc.)                 |
| `created_at`     | `TIMESTAMPTZ`      | `DEFAULT NOW()`                  |                                          |

### 4.8 `platform_reports` — Relatórios admin

| Coluna         | Tipo            | Constraints   | Observações                                  |
| -------------- | --------------- | ------------- | -------------------------------------------- |
| `id`           | `UUID`          | PK            |                                              |
| `report_type`  | `TEXT`          | `NOT NULL`    | `revenue`, `ai_usage`, `churn`, `mrr`, etc.  |
| `period_start` | `DATE`          |               |                                              |
| `period_end`   | `DATE`          |               |                                              |
| `data`         | `JSONB`         | `NOT NULL`    | payload livre                                |
| `generated_at` | `TIMESTAMPTZ`   | `DEFAULT NOW()` |                                            |

### 4.9 `chat_conversations` / `chat_messages` — Assistente IA

Persistência de conversas; estado *quente* fica no Redis (TTL curto).

| `chat_conversations`    | Tipo           | Notas                         |
| ----------------------- | -------------- | ----------------------------- |
| `id`                    | `UUID`         | PK                            |
| `clinic_id`             | `UUID`         | FK                            |
| `therapist_id`          | `UUID`         | FK                            |
| `title`                 | `TEXT`         |                               |
| `created_at`/`updated_at` | `TIMESTAMPTZ` |                             |

| `chat_messages`  | Tipo                  | Notas                                  |
| ---------------- | --------------------- | -------------------------------------- |
| `id`             | `UUID`                | PK                                     |
| `conversation_id`| `UUID`                | FK `chat_conversations(id)` `CASCADE`  |
| `role`           | `chat_message_role`   |                                        |
| `content`        | `TEXT`                | `NOT NULL`                             |
| `tts_audio_url`  | `TEXT`                | URL em Supabase Storage (se gerado)    |
| `metadata`       | `JSONB`               | `DEFAULT '{}'::jsonb`                  |
| `created_at`     | `TIMESTAMPTZ`         |                                        |

---

## 5. Funções auxiliares (SECURITY DEFINER)

| Função                  | Retorno   | Descrição                                      |
| ----------------------- | --------- | ---------------------------------------------- |
| `current_clinic_id()`   | `UUID`    | `clinic_id` do terapeuta autenticado           |
| `is_admin()`            | `BOOLEAN` | `TRUE` se `auth.uid()` ∈ `admins`              |
| `set_updated_at()`      | trigger   | Atualiza `updated_at = NOW()` em UPDATE        |

---

## 6. Row Level Security (RLS)

### Regra geral
**Todas** as tabelas de domínio têm `RLS ENABLED`. O padrão é:

```
USING (clinic_id = current_clinic_id() OR is_admin())
```

### Matriz de acesso

| Tabela                | Psicólogo (SELECT)         | Psicólogo (INSERT/UPDATE/DELETE) | Admin            |
| --------------------- | -------------------------- | -------------------------------- | ---------------- |
| `clinics`             | apenas a própria           | a própria                        | todas            |
| `therapists`          | próprio + mesma clínica    | apenas o próprio                 | todos            |
| `admins`              | ❌                         | ❌                               | todos            |
| `patients`            | `clinic_id = current`      | `clinic_id = current`            | todos            |
| `sessions`            | `clinic_id = current`      | `clinic_id = current`            | todos            |
| `finance_entries`     | `clinic_id = current`      | `clinic_id = current`            | todos            |
| `ai_usage_logs`       | `clinic_id = current`      | `clinic_id = current`            | todos            |
| `platform_reports`    | ❌                         | ❌                               | tudo             |
| `chat_conversations`  | `clinic_id = current`      | `clinic_id = current`            | todos            |
| `chat_messages`       | via conversation → clínica | via conversation → clínica       | todos            |

---

## 7. Criptografia LGPD (`pgcrypto`)

**Chave** armazenada no Supabase Vault como secret `ENCRYPTION_KEY`, nunca no código.

```sql
-- gravação
UPDATE patients SET cpf_encrypted = pgp_sym_encrypt($1::text, (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ENCRYPTION_KEY'))
WHERE id = $2;

-- leitura (somente via função SECURITY DEFINER exposta ao dono)
SELECT pgp_sym_decrypt(cpf_encrypted, (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ENCRYPTION_KEY'))::text AS cpf
FROM patients WHERE id = $1 AND clinic_id = current_clinic_id();
```

Campos criptografados:
- `therapists.cpf_encrypted`, `therapists.google_refresh_token_encrypted`
- `patients.cpf_encrypted`, `patients.notes_encrypted`
- `sessions.notes_encrypted`

---

## 8. Índices

| Índice                                     | Propósito                                       |
| ------------------------------------------ | ----------------------------------------------- |
| `idx_patients_therapist`                   | listar pacientes do terapeuta                   |
| `idx_patients_clinic`                      | consultas agregadas por clínica                 |
| `idx_sessions_therapist_scheduled`         | agenda (datetime range)                         |
| `idx_sessions_patient`                     | histórico do paciente                           |
| `idx_sessions_calendar_event` (`UNIQUE`)   | idempotência da sincronização Google Calendar   |
| `idx_finance_therapist_occurred`           | relatórios por período                          |
| `idx_ai_logs_clinic_created`               | custos por mês / clínica                        |
| `idx_chat_conv_therapist_updated`          | listagem de conversas recentes                  |
| `idx_chat_msg_conversation_created`        | paginação reversa de mensagens                  |

---

## 9. Realtime

Canais habilitados (Supabase Realtime):

- `sessions` — dashboard e agenda
- `patients` — atualizações ao vivo
- `chat_messages` — streaming do assistente

---

## 10. Apagamento & retenção (LGPD art. 16)

- `patients.active = FALSE` → soft-delete (dados mantidos para obrigação fiscal).
- Job mensal (Supabase Edge Function) executa **hard delete** de pacientes inativos há **mais de 5 anos** (prazo contábil brasileiro).
- `ai_usage_logs` retidos por **24 meses**; após isso, agregados em `platform_reports` e apagados.
