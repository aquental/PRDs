# Roadmap do Projeto Psi
Baseado no PRD v1 (Abril/2026) e no SYSTEM.md. Organizado em fases alinhadas às versões `v1.0 → v1.2`, com marcos objetivos, entregáveis e critérios de aceitação.

---

## Fase 0 — Fundação técnica (Semana 0–1)
**Objetivo:** Preparar base do projeto pronta para `npm run dev`.

- Bootstrap SvelteKit 2.x + Svelte 5 (Runes).
- Estrutura modular feature-based (`src/lib/core/`, `src/lib/features/`).
- Configurar Tailwind + tema earthy (`#FDFBF7`, `#5B7B7A`, `#D4A373`) + **Dark mode** via `class="dark"`.
- Tipografia Manrope/Figtree e Phosphor Icons.
- Configuração Vitest (testes unitários) e `data-testid` em elementos interativos.
- `.env.example` para Supabase, Upstash e ElevenLabs.

**Critério de aceitação:** projeto roda localmente com layout raiz, dark mode toggle e pipeline de testes funcionando.

---

## Fase 1 — MVP Psicólogo (v1.0) (Semana 2–5)
**Objetivo:** Interface 1 (Psicólogo) operacional com workspace Clínica.

- Supabase Auth + Google OAuth; `hooks.server.ts` com sessão.
- Modelagem de dados: `clinics`, `therapists`, `patients`, `sessions`, `finance_entries`.
- Workspace **Clínica obrigatório** com RLS por `clinic_id`.
- Rotas protegidas `/app/*`: dashboard, pacientes (CRUD), sessões, financeiro.
- Criptografia de dados sensíveis (`pgcrypto`) + LGPD básica.
- Testes Vitest para `finance.ts`, `patients.ts` (incluindo casos extremos).

**Critério de aceitação:** psicólogo faz login, gerencia pacientes/sessões, vê dashboard e projeção financeira com RLS funcional.

---

## Fase 2 — Admin + Assistente IA com Voz (v1.1) (Semana 6–8)
**Objetivo:** Interface 3 (Admin) e Assistente IA com voz.

- Role `admin` no Supabase Auth (separado do RLS de psicólogos).
- Rotas `/admin/*`: logs `ai_usage_logs`, relatórios (`platform_reports`: revenue, churn, MRR).
- Camada de logging centralizada (`src/lib/core/ai-logger.ts`) cobrindo LLM e TTS.
- LLM interface genérica (OpenAI-compatible) + chat em `/app/ai-chat`.
- Integração **ElevenLabs TTS** com streaming pt-BR.
- Speech-to-Text (input de voz) integrado ao chat.
- Cache/estado de chat no Redis (Upstash).
- Testes para `ai-logger.ts` e cálculos de relatórios.

**Critério de aceitação:** admin visualiza logs e relatórios; psicólogo conversa por voz com IA; toda chamada LLM/TTS é registrada.

---

## Fase 3 — Interface Paciente via Google Calendar (v1.2) (Semana 9–10)
**Objetivo:** Interface 2 (Paciente) sem login, 100% via Google Calendar.

- Integração Google Calendar API via server actions.
- Sincronização bidirecional (criar/atualizar/remover eventos).
- Lembretes automáticos e convites nativos ao paciente.
- Garantia de **não exposição de dados clínicos sensíveis** nos eventos.
- Supabase Realtime para reflexo imediato de alterações no painel do psicólogo.

**Critério de aceitação:** sessão agendada no Psi aparece no calendário do paciente; respostas do paciente atualizam o Psi.

---

## Fase 4 — Polimento e Go-Live (Semana 11–12)
**Objetivo:** Endurecer qualidade e publicar.

- Exportações PDF/CSV (financeiro, histórico).
- Revisão completa de políticas RLS por role (`psychologist`, `admin`).
- Auditoria LGPD (consentimento, retenção, direito ao esquecimento).
- Testes E2E críticos + carga básica.
- Observabilidade: métricas de custo de IA/TTS no painel admin.
- Deploy na **Vercel** (Edge Functions para Google Calendar).

**Critério de aceitação:** todas as três interfaces operacionais em produção, LGPD validada, custos de IA monitorados.

---

## Pós v1.2 — Evoluções candidatas
- Omnichannel Telegram (estado no Redis + Realtime).
- Multi-usuário por clínica (secretárias, sócios).
- Billing próprio (planos, cobrança recorrente).
- Relatórios clínicos assistidos por IA.
- Mobile PWA otimizado.

---

## Dependências críticas
- Aprovação do app no Google Cloud (OAuth + Calendar API).
- Conta ElevenLabs com cota pt-BR streaming.
- Supabase Pro ($25/mês) com Vault habilitado.
- Upstash Redis provisionado.

## Riscos e mitigações
- **Custo de LLM/TTS:** logging desde o dia 1 (`ai_usage_logs`) + alertas no admin.
- **Vazamento LGPD:** RLS testado por role + criptografia `pgcrypto` + revisão de payloads em eventos do Calendar.
- **Sync bidirecional frágil:** idempotência por `event_id`, retries exponenciais e reconciliação agendada.
- **Escopo creep:** aplicar KISS/YAGNI — só o que o PRD exige no MVP.

## Métricas de sucesso
- Tempo de cadastro de paciente < 1 min.
- 100% das chamadas de IA/TTS logadas.
- Zero vazamento de dados clínicos em eventos do Calendar.
- Cobertura de testes ≥ 80% em `src/lib/core/`.
- Deploy reproduzível em < 5 min (Vercel).

---

**Documento gerado em Abril/2026.**
