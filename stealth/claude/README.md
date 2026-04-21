# Psi

Plataforma SaaS para clínicas de psicologia, com três interfaces: psicólogo (web), paciente (via Google Calendar) e admin da plataforma.

**Stack:** SvelteKit 2 · Svelte 5 (Runes) · Supabase (PostgreSQL + Auth + RLS + Realtime) · Redis/Upstash · ElevenLabs (TTS) · Tailwind · Vercel.

Construído como aplicação **12-factor** (veja seção abaixo).

---

## Começar rapidamente

```bash
# 1. Dependências
npm install

# 2. Copiar e preencher as variáveis de ambiente
cp .env.example .env
# (edite .env com as credenciais reais)

# 3. Rodar as migrations no Supabase
# (cria tabelas, enums, triggers, RLS e publicações realtime)
npx supabase db push
# — ou, alternativamente, cole o conteúdo de
#   supabase/migrations/20260421000000_initial_schema.sql
#   no SQL editor do Supabase.

# 4. Habilitar Google OAuth no painel do Supabase
# Auth → Providers → Google → cole Client ID/Secret
# e a URL de redirect definida em GOOGLE_REDIRECT_URI.

# 5. Rodar em desenvolvimento
npm run dev
```

Abre em <http://localhost:5173>.

### Primeiros logins

- **Psicólogo:** qualquer email Google que não esteja em `ADMIN_EMAILS`. Na primeira entrada, o sistema cria automaticamente `clinics` + `therapists` e redireciona para `/app/dashboard`.
- **Admin:** email presente em `ADMIN_EMAILS` (env). No primeiro login é promovido e redirecionado para `/admin`.
- **Paciente:** **não loga no Psi**. Recebe convites no Google Calendar via `google_calendar_attendee_email`.

---

## Estrutura

```
psi/
├── MODEL.md                           # Documentação do modelo de dados
├── .env.example                       # Arquivo único de configuração (12-factor III)
├── supabase/migrations/               # Migrations SQL versionadas
│   └── 20260421000000_initial_schema.sql
├── src/
│   ├── lib/
│   │   ├── config.ts                  # Config Zod-validada (fail-fast)
│   │   ├── logger.ts                  # Pino (logs para stdout)
│   │   ├── supabase/                  # Clientes server + browser + admin
│   │   ├── redis.ts                   # Upstash + rate limiters
│   │   ├── integrations/              # LLM + ElevenLabs + Google Calendar
│   │   ├── core/                      # Lógica pura (testável): finance, patients, ai-logger
│   │   ├── ui/                        # Componentes reutilizáveis (runes)
│   │   └── utils/
│   ├── routes/
│   │   ├── +page.svelte               # Landing
│   │   ├── login/                     # Google OAuth
│   │   ├── auth/callback/             # Post-OAuth provisioning
│   │   ├── logout/
│   │   ├── app/                       # Interface Psicólogo (protegida)
│   │   │   ├── dashboard/
│   │   │   ├── patients/ [id]/
│   │   │   ├── sessions/
│   │   │   ├── finance/
│   │   │   ├── ai-chat/
│   │   │   └── settings/
│   │   ├── admin/                     # Interface Admin (role-guarded)
│   │   │   └── logs/
│   │   └── api/ai/
│   │       ├── chat/                  # LLM (rate-limited, auto-logged)
│   │       └── tts/                   # ElevenLabs (rate-limited, auto-logged)
│   ├── tests/core/                    # Vitest: finance, patients, ai-logger
│   ├── hooks.server.ts                # Auth + structured logging
│   ├── app.html / app.css / app.d.ts
└── package.json
```

---

## Scripts

| Comando               | Ação                                    |
| --------------------- | --------------------------------------- |
| `npm run dev`         | Dev server em `http://localhost:5173`   |
| `npm run build`       | Build de produção                       |
| `npm run preview`     | Preview do build                        |
| `npm run check`       | Type-check + svelte-check               |
| `npm run test`        | Vitest (única rodada)                   |
| `npm run test:watch`  | Vitest em modo watch                    |
| `npm run test:coverage` | Cobertura                             |
| `npm run lint`        | Prettier + ESLint                       |
| `npm run format`      | Prettier auto-fix                       |
| `npm run db:migrate`  | Aplica migrations ao Supabase           |

---

## Três interfaces

### 1. Psicólogo — `/app/*`
Web responsiva completa. Protegido por `safeGetSession()` no `+layout.server.ts`. Acesso a pacientes, sessões, financeiro, assistente IA com voz e configurações.

### 2. Paciente — Google Calendar
Sem login no Psi. O paciente é adicionado como `attendee` em eventos criados no calendar do terapeuta. Nenhum dado clínico sensível vai no evento.

### 3. Admin — `/admin/*`
Role global `admins` (separado do RLS de psicólogos). Dashboard com contagens e custo de IA agregado; página `/admin/logs` com todos os `ai_usage_logs`.

---

## 12-factor — mapa explícito

| Fator | Onde                                                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------- |
| I. Codebase            | Um repositório, um deploy (Vercel).                                                          |
| II. Dependências       | `package.json` declara tudo; `npm install` reproduzível com Node 20+.                        |
| III. Config            | **`.env.example`** único; `src/lib/config.ts` valida com Zod e falha rápido em prod.          |
| IV. Backing services   | Supabase, Upstash, ElevenLabs, LLM — todos tratados como URLs/tokens intercambiáveis no env. |
| V. Build / Release / Run | Adapter Vercel separa build e runtime; migrations versionadas em `supabase/migrations/`.   |
| VI. Processes          | Stateless; sessão na JWT (cookie) + estado quente de chat no Redis.                          |
| VII. Port binding      | `PORT` do env; `vite.config.ts` respeita.                                                    |
| VIII. Concurrency      | Serverless horizontal (edge/regional no Vercel).                                             |
| IX. Disposability      | Cold-start rápido; nenhum recurso de longa duração.                                          |
| X. Dev/prod parity     | Mesma stack em dev e prod; só as URLs/keys mudam.                                            |
| XI. Logs               | `pino` escrevendo **stdout** (nada de arquivo); Vercel/Supabase agregam.                      |
| XII. Admin processes   | `scripts/` + `supabase db push`; promoção de admin via `ADMIN_EMAILS` no primeiro login.     |

---

## Segurança e LGPD

- **Row Level Security** em toda tabela de domínio. Funções `current_clinic_id()` e `is_admin()` são `SECURITY DEFINER`.
- **Criptografia de campo** (`pgcrypto` / `pgp_sym_encrypt`): `patients.cpf_encrypted`, `patients.notes_encrypted`, `sessions.notes_encrypted`, `therapists.google_refresh_token_encrypted`.
- **Rate limiting** (Upstash): AI chat por minuto, TTS por caracteres/hora.
- **`safeGetSession`** revalida o JWT contra o servidor Supabase a cada request (evita `getSession()` inseguro).
- **Redação de segredos** no logger (tokens, cookies, authorization).

Veja `MODEL.md` para a matriz completa de acesso RLS.

---

## Deploy (Vercel)

1. `vercel link`
2. Configure as variáveis de `.env.example` no painel Vercel (marque as `PUBLIC_*` como expostas ao browser).
3. `vercel --prod`.

---

## Testes

```bash
npm run test
```

Cobrem a lógica pura em `src/lib/core/`:
- `finance.test.ts` — projeção, receita real, despesas, lucro, pendências, ranking
- `patients.test.ts` — validação de CPF (dígitos verificadores), telefone, idade, busca
- `ai-logger.test.ts` — preços LLM/TTS, agregação de uso

Meta de cobertura ≥ 80% em `src/lib/core/` (ROADMAP).

---

## Licença

Proprietário.
