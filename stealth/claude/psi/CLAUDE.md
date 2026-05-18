# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Psi** is a SaaS platform for psychology clinics targeting Brazilian therapists. Stack: SvelteKit 2 + Svelte 5 (Runes) + Supabase + Upstash Redis + ElevenLabs TTS. Deployed on Vercel (`@sveltejs/adapter-vercel`, Node 20).

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run check        # Type-check (svelte-check + tsc)
npm run lint         # Prettier + ESLint check
npm run format       # Auto-format with Prettier
npm run test         # Run all tests (vitest)
npm run test:watch   # Watch mode
npm run test:coverage

# Run a single test file
npx vitest run src/routes/app/sessions/page.server.test.ts

# Database
npm run db:migrate   # supabase db push (apply migrations)
npm run db:reset     # supabase db reset (destructive)

# Admin
npm run admin:promote  # Promote a user to admin role
```

## Architecture

### Route Layout

Three distinct areas, each with its own `+layout.server.ts` guard:

| Path                       | Who can access           | Guard behavior                                              |
| -------------------------- | ------------------------ | ----------------------------------------------------------- |
| `/app/*`                   | Authenticated therapists | Redirects admins → `/admin`, unauthenticated → `/login`     |
| `/admin/*`                 | Admin users only         | Uses `createSupabaseAdminClient()` to verify `admins` table |
| `/login`, `/auth/callback` | Public                   | —                                                           |

### Auth Flow

`hooks.server.ts` runs on every request and attaches to `event.locals`:

- `event.locals.supabase` — session-bound Supabase client (anon key + cookies)
- `event.locals.safeGetSession()` — revalidates JWT server-side via `getUser()` (never trust `getSession()` alone)

Google OAuth callback at `/auth/callback` auto-creates `clinics` + `therapists` rows on first login. If the email is in `ADMIN_EMAILS`, it upserts `admins` instead.

### Two Supabase Clients

- `createSupabaseServerClient(event)` — session-scoped, respects RLS. Used in most server routes.
- `createSupabaseAdminClient()` — service-role, **bypasses RLS**. Use only for admin routes, background jobs, and `ai_usage_logs` inserts (which need to write even without an active session).

Both clients are typed with `Database` from `$lib/supabase/database.types.ts` (generated from the live schema). Call them directly in routes to get full query type inference. **Do not use `event.locals.supabase` for typed access** — it is intentionally left as `SupabaseClient<any>` due to a generic-parameter incompatibility between `@supabase/ssr@0.5.x` and `@supabase/supabase-js@2.104+`.

### Database Types

`$lib/supabase/database.types.ts` — generated from the live Supabase schema. Regenerate after any migration with:

```bash
# Via MCP or Supabase CLI:
supabase gen types typescript --project-id fqzvggnwfzhiccgoolhr > src/lib/supabase/database.types.ts
```

Exported helpers: `Database`, `Tables<T>`, `TablesInsert<T>`, `TablesUpdate<T>`, `Enums<T>`, `Json`, `Constants`.

### Config System

- `$lib/config.ts` — Zod-validated public env vars (`PUBLIC_*`). Safe to import in browser code.
- `$lib/config.server.ts` — Zod-validated private env vars. Import **only** in `.server.ts`, `+server.ts`, `hooks.server.ts`. Fails fast on missing/invalid vars at startup.

Call `serverConfig()` (lazy singleton) to get the typed config object.

### Aliases

```
$lib         → src/lib
$components  → src/lib/ui
$core        → src/lib/core
```

### AI / LLM Integration

- `$lib/integrations/llm.ts` — OpenAI-compatible HTTP client. Provider is pluggable via `LLM_BASE_URL` + `LLM_API_KEY`.
- `$lib/integrations/elevenlabs.ts` — TTS synthesis.
- Every LLM/TTS call **must** call `persistAIUsage()` from `$lib/server/ai-usage.ts` (uses service-role client so it never fails silently on auth issues).
- Rate limiting via Upstash Redis sliding windows: `aiChatRateLimiter()` (per therapist/min) and `ttsRateLimiter()` (per therapist/hour, tracks character count not requests).

### Redis (`$lib/redis.ts`)

Upstash Redis is used for two purposes:

1. Rate limiting (Upstash Ratelimit)
2. Hot chat state cache with short TTL (`psi:chat:*`) and dashboard cache (`psi:dash:*`, TTL 300s)

### Service Switches (`$lib/server/service-switches.ts`)

Kill-switches stored in the `service_switches` table, cached in-memory for 30s. Switches: `cep`, `llm`, `tts`, `redis`. Use `getServiceSwitches()` before any feature that touches those systems. Fail-open (all enabled by default if the table is unreachable).

```ts
const switches = await getServiceSwitches();
if (!switches.llm) return fail(503, { error: "LLM disabled" });
```

### Data Model & RLS

See `MODEL.md` for the full schema. Key principles:

- All domain tables carry `clinic_id` for RLS isolation via `current_clinic_id()` helper function.
- Sensitive fields (`cpf`, clinical notes, Google OAuth token) stored as `BYTEA` encrypted with `pgcrypto` via Supabase Vault secret `ENCRYPTION_KEY`.
- Patients never authenticate — they are Google Calendar attendees only.
- `admins` is a global role table, independent of `clinic_id`.
- `ai_usage_logs` is the primary observability table — log every AI call since day one.
- `schedules(therapist_id, day_of_week, start_time)` has a unique constraint; catch Supabase error code `23505` and surface it as a friendly message.

### Svelte 5 Runes

All components use Svelte 5 runes mode (`compilerOptions.runes: true` in `svelte.config.js`). Use `$state`, `$derived`, `$effect`, `$props` — not the legacy `let`/`$:` reactivity syntax. Use `{@render children()}` instead of `<slot>`.

## Server Action Pattern

All `+page.server.ts` actions follow this exact sequence:

1. **Validate** — Zod schema; return `fail(400, { error: parsed.error.flatten().fieldErrors })` on failure
2. **Auth** — `safeGetSession()` → return `fail(401)` if no user
3. **Ownership** — query therapist by `user_id`; return `fail(403)` if not found
4. **Mutation** — RLS-aware Supabase query; handle DB errors (e.g., `23505` unique violation)
5. **Invalidate** — `await invalidateDashboard(therapist.id)`
6. **Return** — `{ success: true }` or `{ success: true, action: 'actionName' }`

## API Routes

`/api/ai/chat` and `/api/ai/tts` both:

1. Check `getServiceSwitches()` — 503 if disabled
2. Validate body with Zod
3. Enforce rate limits
4. Call the integration, then `persistAIUsage()`
5. Return JSON (chat) or binary `audio/mpeg` with `no-store` cache headers (TTS)

## Core Logic (`$lib/core/`)

Pure, framework-free functions — import from `$core`.

- **`types.ts`** — Canonical domain types (`Patient`, `Session`, `Therapist`, `Expense`, `AIUsageLog`, etc.)
- **`finance.ts`** — Revenue/expense calculations: `projectMonthlyRevenue()`, `actualRevenue()`, `expensesForPeriod()` (prorates recurring expenses by frequency), `patientRevenueRanking()`. All throw `RangeError` if date range is invalid.
- **`ai-logger.ts`** — Cost computation from token/char counts. Pricing table is in-code; `priceFromUsage()` produces cost before `persistAIUsage()` insert. `aggregateUsage()` rolls up logs by period and call type.
- **`patients.ts`** — `normalizeCPF()` (validates structure + check digits), `formatCPF()`, phone normalization, age calculation.

## Utilities (`$lib/utils/`)

- **`format.ts`** — pt-BR locale helpers: `formatBRL()` (guards NaN/Infinity → "—"), `formatBRLDecimal()` (for CSV export), `formatDateTime()`, `formatPhone()`.
- **`fetch.ts`** — Retry wrapper with exponential backoff (3 retries, 500ms/1s/2s). Retries on ECONNRESET/ETIMEDOUT/ECONNREFUSED/ENOTFOUND/UND_ERR_SOCKET; throws immediately on 401/403.

## Testing Patterns

Test files live alongside the code they test, named `*.test.ts` (never `+*.test.ts` — the `+` prefix is reserved by SvelteKit).

Supabase is mocked with a table-aware `from()` dispatcher: each table name returns its own Vitest mock chain, preventing cross-table mock collisions. Auth is mocked via a `makeLocals()` helper that builds `event.locals` with configurable user/therapist/error state, and `makeRequest()` builds `FormData` requests for action calls.

```ts
// Typical test structure
const locals = makeLocals({ therapist: mockTherapist });
const request = makeRequest({ scheduleId: "123" });
const result = await actions.deleteSchedule({ locals, request });
```

## Error Handling Conventions

- `fail(400, { error: fieldErrors })` — Zod validation failures (field-level)
- `fail(401, { error: string })` — Missing/invalid session
- `fail(403, { error: string })` — Ownership check failure
- `throw error(404, 'Message')` — Page-level not found
- `throw redirect(303, '/path')` — SvelteKit redirects
- AI/integration failures are **always** logged to `ai_usage_logs` even on error; they never cause an unhandled throw.

## Logger (`$lib/logger.ts`)

Pino configured with ISO timestamps, stdout-only output (12-factor), and automatic redaction of `password`, `token`, `access_token`, `refresh_token`, `api_key`, and Authorization/Cookie headers.

## Key Environment Variables

Server-side (required):

- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_ENCRYPTION_KEY`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_PROVIDER`
- `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `ADMIN_EMAILS` — comma-separated list of admin email addresses

Public (browser-safe, prefix `PUBLIC_`):

- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- `PUBLIC_APP_URL`, `PUBLIC_FEATURE_VOICE_CHAT`, `PUBLIC_FEATURE_TELEGRAM_OMNICHANNEL`

## Sessions Page (`/app/sessions`)

### Server actions (`+page.server.ts`)

| Action           | Description                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| `createSchedule` | Insert a recurring slot (Zod-validated, unique constraint guard)          |
| `deleteSchedule` | Soft-delete via `active = false`                                          |
| `moveSchedule`   | Update `day_of_week` + `start_time` on an existing slot (409 on conflict) |
| `markPaid`       | Flip `paid = true` + `paid_at` on a single session                        |
| `bulkMarkPaid`   | Mark multiple sessions paid in one `UPDATE … WHERE id = ANY(...)` call    |
| `create`         | Ad-hoc session insert (not linked to a schedule)                          |

### Client features (`+page.svelte`)

- **Filter bar** — patient dropdown + date range (De / Até) + status pills; client-side, no server round-trip.
- **Bulk selection** — checkbox column on desktop; floating action bar (fixed `bottom-24`) for "Marcar pagas" and "Exportar CSV" (UTF-8 BOM, semicolon separator for pt-BR Excel).
- **Optimistic payment** — "Marcar como pago" flips UI instantly; rolls back on server failure.
- **Inline schedule edit** — pencil icon opens a compact form inside the grid cell to move a slot to a different day/time; submits `?/moveSchedule`.
- **Move handle** — `DotsSixVertical` icon (phosphor-svelte) on slot hover as a drag-intent affordance; full drag-and-drop is deferred.
- **Mobile layout** — session history renders as stacked cards below `sm`; schedule renders as a day-grouped list.
- **Accessible grid** — `role="grid"`, `scope="col/row"` on headers, `aria-label` on all interactive elements.
- **EmptyState component** — `src/lib/ui/EmptyState.svelte` (title, description?, icon?, action? snippets).

### Tests

`src/routes/app/sessions/page.server.test.ts` — 53 Vitest tests covering all server actions with table-aware Supabase mock.

## Database Migrations

Migrations live in `supabase/migrations/`. Files must follow the naming convention `YYYYMMDDHHMMSS_description.sql`. Apply with `npm run db:migrate`.
