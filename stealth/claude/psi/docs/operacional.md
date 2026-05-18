# Aba Operacional — Documentação técnica

> Versão 1.0 · maio/2026

## Visão geral

A Aba Operacional centraliza o back-office diário do consultório: registro de sessões do dia, contas a pagar, fluxo de caixa e fechamento mensal. É a tela que o terapeuta abre pela manhã e fecha à noite.

Rotas:

- `/app/operations` — tela principal
- `/app/operations/fluxo-de-caixa` — detalhe de fluxo de caixa com seletor de período

---

## Arquitetura

### Fluxo de dados

```
+page.server.ts (load)
  ├─ supabase.from("sessions")        → sessões do dia (±1 dia UTC)
  ├─ supabase.from("expenses")        → despesas ativas da clínica
  ├─ supabase.from("finance_entries") → entradas de despesa do mês
  ├─ supabase.from("month_closures")  → fechamento do mês corrente
  ├─ supabase.from("patients")        → políticas de cancelamento
  └─ supabase.from("sessions")        → todas as sessões do mês

+page.svelte (client)
  ├─ Derivações client-side (sem round-trip):
  │   ├─ pendingSessions, todayRevenue, weekRevenue/Expenses/Repasse
  │   ├─ overdueExpenses, dueTodayExpenses, dueThisWeekExpenses
  │   ├─ paidDescriptions (Set<string> por descrição)
  │   └─ unregisteredCount, unpaidOverdueCount (para o modal)
  └─ Componentes:
      ├─ DayMetrics          — resumo do dia
      ├─ PendingRegistrations — sessões sem status
      ├─ BillsToPay          — contas classificadas
      ├─ RepasseCard         — repasse à clínica (modo clínica)
      ├─ CashFlowSummary     — fluxo da semana + link detalhe
      ├─ QuickActions        — ações rápidas 2×2
      └─ CloseMonthModal     — modal de fechamento
```

### Server actions

| Action            | Tabelas tocadas                                 | Retorno                                  |
| ----------------- | ----------------------------------------------- | ---------------------------------------- |
| `registerSession` | `sessions` (select + update)                    | `{ success, action: "registerSession" }` |
| `markExpensePaid` | `expenses` (select), `finance_entries` (insert) | `{ success, action: "markExpensePaid" }` |
| `closeMonth`      | `month_closures` (upsert)                       | `{ success, action: "closeMonth" }`      |
| `reopenMonth`     | `month_closures` (update), `therapists` (count) | `{ success, action: "reopenMonth" }`     |

Todas seguem a sequência padrão: validação Zod → auth → ownership → mutação → `invalidateDashboard`.

### Regras de negócio (módulo puro)

Em `src/lib/core/operational.ts`:

- **`classifyCancellation(cancelledAt, sessionAt, policy, override?)`** — determina "falta" ou "abono" com base na antecedência e override por paciente.
- **`computeRepasse(sessionValue, config)`** — calcula repasse fixo + percentual; retorna `{ repasse, liquido, disabled }`.
- **`evaluateMonthClosure(monthYear, sessions, payments)`** — lista pendências que bloqueiam o fechamento limpo.
- **`canReopenMonth(closure, userRole, isClinicMode)`** — determina se o usuário tem permissão de reabrir.

### Push notifications (módulo puro)

Em `src/lib/core/push-notifications.ts` — quatro funções que geram `PushPayload | null`:

| Função                             | Janela de disparo      | Condição                         |
| ---------------------------------- | ---------------------- | -------------------------------- |
| `generateUnregisteredSessionsPush` | 18h–20h (fuso clínica) | sessões `scheduled` no dia       |
| `generateDuePaymentsPush`          | 7h–9h (fuso clínica)   | contas vencidas ou vencendo hoje |
| `generateMonthCloseReminderPush`   | 8h–10h, dia 1 do mês   | —                                |
| `generateMonthReopenedPush`        | imediato (evento)      | closure com `status="closed"`    |

Nenhuma função faz IO. O caller (worker de agendamento futuro) é responsável por verificar frequência de disparo e enviar via FCM/APNs.

---

## Como rodar localmente

```bash
# Pré-requisitos: Node 20+, conta Supabase, conta Upstash Redis
cp .env.example .env   # preencha as variáveis obrigatórias

npm install
npm run dev            # http://localhost:5173

# Banco de dados
npm run db:migrate     # aplica migrations pendentes
npm run db:reset       # reset destrutivo (dev)

# Testes
npm run test           # todos os testes (vitest)
npm run check          # svelte-check + tsc
npm run lint           # prettier + eslint
```

---

## Como adicionar uma nova categoria de despesa

1. No banco: adicione o valor ao enum `expense_frequency` se necessário (migration em `supabase/migrations/`).
2. Em `src/routes/app/settings/+page.server.ts`: atualize o `ExpenseSchema` (campo `frequency`).
3. Em `src/routes/app/settings/+page.svelte`: adicione o label em `FREQ_LABEL` e a classe em `FREQ_CLASS`.
4. Em `src/routes/app/operations/+page.svelte`: atualize `expenseDueDate()` para calcular a data de vencimento da nova frequência.
5. Em `src/lib/core/operational.ts` (se usada em `evaluateMonthClosure`): adicione a lógica de detecção de atraso.

---

## Como adicionar um novo tipo de notificação push

1. Adicione o trigger em `PushTrigger` em `src/lib/core/types.ts`.
2. Implemente a função `generateXxxPush(...)` em `src/lib/core/push-notifications.ts`, retornando `PushPayload | null`.
3. Adicione testes em `src/lib/core/push-notifications.test.ts` cobrindo janela de disparo, caso nulo (dia tranquilo) e dados do payload.
4. Adicione um caso na fixture em `src/routes/admin/push-simulator/+page.server.ts` para testar no simulador admin.
5. Quando integrar com serviço real: chame a função em um worker Vercel Cron ou endpoint de webhook e passe o payload para o SDK de push.

---

## Pontos de extensão para a fase de voz

O botão de microfone está em `src/routes/app/operations/+page.svelte` (linha ~190), desabilitado com `title="Em breve"`. Para ativar:

1. **Captura de áudio**: substitua o `<button disabled>` por um componente `VoiceCapture` que grava via `MediaRecorder` e envia o blob para `/api/ai/stt`.
2. **STT (Speech-to-Text)**: crie `src/routes/api/ai/stt/+server.ts` seguindo o padrão de `/api/ai/chat` — verifica service switches, rate limit via `ttsRateLimiter`, chama ElevenLabs/Whisper, persiste usage em `ai_usage_logs`.
3. **Parsing de intent**: o texto transcrito vai para o LLM em `/api/ai/chat` com um system prompt especializado em intenções operacionais (registrar sessão, marcar conta paga, consultar saldo). O parser deve retornar JSON estruturado com `{ intent, params }`.
4. **Confirmação**: antes de executar qualquer ação financeira ou de registro, exibir um toast de confirmação (8s com "Desfazer") conforme spec seção 5.3.
5. **Sugestões contextuais**: baseadas em `pendingSessions` e `overdueExpenses`, já disponíveis no `+page.svelte`. Exibir abaixo do microfone quando ativado.

O parse de cancelamento retroativo (spec 5.2) requer a função `classifyCancellation` já implementada em `$lib/core/operational.ts` — basta chamar com o timestamp parseado da fala.

---

## Débito técnico conhecido

| Item                                                  | Rastreamento                           | Impacto                                                    |
| ----------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------- |
| Detecção de despesa paga por descrição (não por FK)   | `finance_entries` não tem `expense_id` | Falso positivo se duas despesas tiverem descrição idêntica |
| Push notifications sem envio real                     | Apenas payload gerado e logado         | Worker de agendamento pendente                             |
| Fechamento de mês não bloqueia UI em sessões/despesas | Apenas visual na aba Operacional       | Precisaria de campo `month_closed` consultado em cada tela |
| Drag-and-drop no cronograma de sessões                | Handle DotsSixVertical é decorativo    | Funcionalidade adiada (Fase 9+)                            |
| Testes E2E                                            | Playwright não instalado               | Coberto por testes de server actions (Vitest)              |

---

## Checklist pronto para fase de voz

- [x] Botão de microfone existe na UI (desabilitado)
- [x] `classifyCancellation` implementada e testada
- [x] `computeRepasse` implementada e testada
- [x] Server actions para registro de sessão e pagamento de conta
- [x] `invalidateDashboard` chamado após toda mutação
- [x] Rate limiter de TTS disponível em `$lib/redis.ts`
- [x] `persistAIUsage` disponível em `$lib/server/ai-usage.ts`
- [x] Service switch `tts` verificado antes de qualquer chamada de áudio
- [ ] Componente `VoiceCapture` (a fazer)
- [ ] Endpoint `/api/ai/stt` (a fazer)
- [ ] Parser de intent por LLM (a fazer)
- [ ] Toast de confirmação com "Desfazer" 8s (a fazer)
