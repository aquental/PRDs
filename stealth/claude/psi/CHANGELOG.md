# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added — Aba Operacional (Phases 3–8)

**Rotas**

- `/app/operations` — tela principal com 6 cards responsivos
- `/app/operations/fluxo-de-caixa` — detalhe de fluxo de caixa com seletor de período (7d / mês / 3m / custom) e exportação CSV
- `/admin/push-simulator` — simulador de payloads push para desenvolvimento

**Componentes** (`src/lib/ui/operational/`)

- `DayMetrics` — resumo de sessões e saldo do dia
- `PendingRegistrations` — lista de sessões sem status com botões inline (Realizada / Falta / Abono)
- `BillsToPay` — contas classificadas em Atrasadas / Vence hoje / Esta semana
- `RepasseCard` — cálculo de repasse à clínica (modo clínica)
- `CashFlowSummary` — fluxo da semana com link para detalhe
- `QuickActions` — grid 2×2 de ações rápidas
- `CloseMonthModal` — modal de fechamento com checklist de pendências
- `WeeklyBarChart` — gráfico de barras semanal (divs, sem lib externa)

**Server actions** (`/app/operations`)

- `registerSession` — atualiza status da sessão (completed / no_show / cancelled)
- `markExpensePaid` — insere entrada de despesa em `finance_entries`
- `closeMonth` — upsert em `month_closures` com log de auditoria
- `reopenMonth` — reabre fechamento; loga payload push em modo clínica

**Lógica de negócio** (`src/lib/core/`)

- `operational.ts` — `classifyCancellation`, `computeRepasse`, `evaluateMonthClosure`, `canReopenMonth`
- `push-notifications.ts` — quatro geradores puros de payload push (sem envio real)
- `types.ts` — `PushPayload`, `PushTrigger`, `DuePayment`, `OperationalSession`, `MonthClosure`, `RepasseConfig`, `RepasseResult`

**Testes**

- 30 testes de server actions para `/app/operations` (`page.server.test.ts`)
- 24 testes unitários para geradores de push (`push-notifications.test.ts`)
- Suite completa: 363 testes, todos passando

**Banco de dados**

- Migration `20260517020000_month_closures.sql` — tabela `month_closures` com RLS, log JSONB e unique `(clinic_id, therapist_id, month_year)`

**Settings**

- Histórico de fechamentos mensais (aba "Histórico" em `/app/settings`)
- Query de `month_closures` adicionada ao `Promise.all` do load de settings

**Admin**

- "Push Simulator" adicionado ao sidebar e à rota `/admin/push-simulator`

**Documentação**

- `docs/operacional.md` — arquitetura, como rodar, extensões, débito técnico e checklist para fase de voz
- `CLAUDE.md` — atualizado com padrões da aba Operacional (via sessão de contexto)

---

## Anteriores

_O projeto não mantinha CHANGELOG antes desta versão. O histórico completo está disponível via `git log`._
