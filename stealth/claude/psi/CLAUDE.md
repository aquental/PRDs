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
npm run test         # Run tests (vitest)
npm run test:watch   # Watch mode
npm run test:coverage

# Database
npm run db:migrate   # supabase db push (apply migrations)
npm run db:reset     # supabase db reset (destructive)

# Admin
npm run admin:promote  # Promote a user to admin role
```

## Architecture

### Route Layout

Three distinct areas, each with its own `+layout.server.ts` guard:

| Path | Who can access | Guard behavior |
|------|---------------|----------------|
| `/app/*` | Authenticated therapists | Redirects admins → `/admin`, unauthenticated → `/login` |
| `/admin/*` | Admin users only | Uses `createSupabaseAdminClient()` to verify `admins` table |
| `/login`, `/auth/callback` | Public | — |

### Auth Flow

`hooks.server.ts` runs on every request and attaches to `event.locals`:
- `event.locals.supabase` — session-bound Supabase client (anon key + cookies)
- `event.locals.safeGetSession()` — revalidates JWT server-side via `getUser()` (never trust `getSession()` alone)

### Two Supabase Clients

- `createSupabaseServerClient(event)` — session-scoped, respects RLS. Used in most server routes.
- `createSupabaseAdminClient()` — service-role, **bypasses RLS**. Use only for admin routes, background jobs, and `ai_usage_logs` inserts (which need to write even without an active session).

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
- Rate limiting via Upstash Redis sliding windows: `aiChatRateLimiter()` (per therapist/min) and `ttsRateLimiter()` (per therapist/hour).

### Redis (`$lib/redis.ts`)

Upstash Redis is used for two purposes:
1. Rate limiting (Upstash Ratelimit)
2. Hot chat state cache with short TTL (`psi:chat:*`) and dashboard cache (`psi:dash:*`)

### Data Model & RLS

See `MODEL.md` for the full schema. Key principles:
- All domain tables carry `clinic_id` for RLS isolation via `current_clinic_id()` helper function.
- Sensitive fields (`cpf`, clinical notes, Google OAuth token) stored as `BYTEA` encrypted with `pgcrypto` via Supabase Vault secret `ENCRYPTION_KEY`.
- Patients never authenticate — they are Google Calendar attendees only.
- `admins` is a global role table, independent of `clinic_id`.
- `ai_usage_logs` is the primary observability table — log every AI call since day one.

### Svelte 5 Runes

All components use Svelte 5 runes mode (`compilerOptions.runes: true` in `svelte.config.js`). Use `$state`, `$derived`, `$effect`, `$props` — not the legacy `let`/`$:` reactivity syntax.

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

## Database Migrations

Migrations live in `supabase/migrations/`. Files must follow the naming convention `YYYYMMDDHHMMSS_description.sql`. Apply with `npm run db:migrate`.
