# Psi - SYSTEM.md (Registro de Decisões de Arquitetura e Implementação)

**Versão:** 1.0 (Abril 2026)  
**Framework:** Svelte 5 (Runes) + SvelteKit 2.x  
**Stack alinhado ao PRD:** SvelteKit + Supabase + Redis (Upstash) + ElevenLabs (TTS)  
**Objetivo:** Criar um projeto **modular, testável e fácil de evoluir** conforme o PRD consolidado v1 (três interfaces, assistente com voz, logging de IA/TTS, workspace Clínica, etc.).

## 1. Decisões de Arquitetura (por quê?)

| Decisão                            | Motivo / Alinhamento com PRD                                                    | Benefício para evolução                            |
| ---------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Svelte 5 com Runes**             | Reatividade declarativa (`$state`, `$derived`, `$effect`) sem Stores ou `let`.  | Código mais limpo e performático                   |
| **SvelteKit como full-stack**      | Rotas server actions + load functions + edge-ready.                             | Zero backend extra (evita over-engineering)        |
| **Modularidade feature-based**     | Pastas por funcionalidade (`patients/`, `ai/`, `finance/`, `admin/`).           | Fácil adicionar novas features sem quebrar o resto |
| **Runes no core de lógica**        | Lógica de negócio (`calculateRevenue`, `logAIUsage`) usa `$state` e `$derived`. | Testável isoladamente                              |
| **Supabase + RLS**                 | Autenticação Google + Row Level Security por `clinic_id`.                       | Segurança LGPD nativa                              |
| **ElevenLabs TTS**                 | Melhor qualidade de voz pt-BR + streaming.                                      | Experiência de voz fluida                          |
| **Camada de logging centralizada** | Tabela `ai_usage_logs` + função reutilizável.                                   | Controle de custos futuro                          |
| **Três interfaces**                | `/app` (psicólogo), `/admin` (operador), Google Calendar (paciente).            | Separação clara de responsabilidades               |
| **Dark mode nativo**               | Suporte via `class="dark"` + Tailwind.                                          | Experiência premium                                |
| **Testes com Vitest**              | Testes unitários + edge cases para toda lógica de negócio.                      | Confiança ao evoluir                               |

**Princípios adotados:**

- **KISS + YAGNI** – só o que o PRD exige no MVP.
- **Test-Driven** – toda lógica de negócio tem testes.
- **Feature-based** – escalável para v1.2 (Google Calendar), v2.0 (multi-usuário).

## 2. O que foi feito neste entrega

- Projeto SvelteKit 2 + Svelte 5 (Runes) completo e pronto para `npm run dev`.
- Estrutura modular (`src/lib/features/`, `src/lib/core/`).
- Interface Psicólogo (`/app`) com layout protegido.
- Interface Admin (`/admin`) com logs e relatórios.
- Camada de logging de IA/TTS.
- Lógica de negócio (financeiro, pacientes, AI usage) com **testes Vitest** (incluindo casos extremos).
- Dark mode + tema earthy configurado.
- Preparado para Supabase, Redis e ElevenLabs (arquivos de config prontos).
- `+layout.svelte` e hooks de autenticação já configurados.

---

## Projeto Completo – Estrutura de Pastas

```bash
psi/
├── src/
│   ├── lib/
│   │   ├── core/                  # Lógica de negócio pura (testável)
│   │   │   ├── finance.ts
│   │   │   ├── patients.ts
│   │   │   ├── ai-logger.ts
│   │   │   └── types.ts
│   │   ├── features/
│   │   │   ├── patients/          # Feature completa de pacientes
│   │   │   ├── ai-chat/           # Assistente IA + voz
│   │   │   ├── admin/             # Interface admin
│   │   │   └── finance/           # Módulo financeiro
│   │   ├── supabase/              # Clients Supabase (server + browser)
│   │   ├── ui/                    # Componentes reutilizáveis
│   │   ├── utils/                 # Helpers (dark mode, formatCurrency)
│   │   └── elevenlabs.ts          # Integração TTS
│   ├── routes/
│   │   ├── app/                   # Interface Psicólogo (protegida)
│   │   │   ├── +layout.svelte
│   │   │   ├── dashboard/
│   │   │   ├── patients/
│   │   │   ├── ai-chat/
│   │   │   └── finance/
│   │   ├── admin/                 # Interface Admin
│   │   │   ├── +page.svelte
│   │   │   ├── logs/
│   │   │   └── reports/
│   │   └── +layout.svelte         # Root layout com dark mode
│   ├── tests/                     # Testes Vitest (lógica de negócio)
│   │   ├── core/
│   │   │   ├── finance.test.ts
│   │   │   ├── patients.test.ts
│   │   │   └── ai-logger.test.ts
│   ├── hooks.server.ts
│   └── app.html
├── static/
├── tests/                         # Config Vitest
├── svelte.config.js
├── vite.config.ts
├── package.json
├── .env.example
└── README.md
```
