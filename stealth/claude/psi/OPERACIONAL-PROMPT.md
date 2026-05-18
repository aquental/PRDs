# Prompt para Claude Code — Implementação da aba Operacional (Psi)

## Contexto

Você vai implementar uma nova aba chamada **"Operacional"** no aplicativo web **Psi** (gestão para psicólogos). A interface é responsiva (mesmo código serve desktop e mobile). Os mockups de referência foram desenhados para mobile (~380px); no desktop a tela deve usar o espaço disponível de forma sensata.

## Fonte da verdade

O arquivo **`docs/operacional-spec.md`** contém o spec funcional completo. **Leia-o por inteiro antes de qualquer ação** e use-o como autoridade final em qualquer dúvida de regra de negócio. Se este prompt e o spec discordarem, o spec vence — mas avise o usuário antes de prosseguir.

## Escopo desta task

**Implementar:**

- Tela principal `/app/operacional` (todos os cards descritos no spec, seção 3)
- Sub-tela de fluxo de caixa detalhado
- Fluxo de fechar/reabrir mês com modal e estado read-only
- Novos campos em Configurações (política de cancelamento, clínica)
- Override de política por paciente
- Camada de dados com fixtures realistas (backend real fica para depois)
- Testes unitários para regras de negócio
- Testes de componente para UI crítica
- Documentação técnica

**Não implementar (deixe placeholders explícitos):**

- Interface de voz → botão de microfone **visível mas desabilitado**, com tooltip "Em breve"
- Emissão de recibos/NFS-e → botão com label "(em breve)", desabilitado
- Notificações push reais → implemente as **funções de geração de payload**, mas sem integração com serviço de push
- App do paciente

## Regras de execução

Trabalhe em **8 fases sequenciais**. Ao final de cada fase:

1. Rode lint, typecheck e testes da fase
2. Resuma em ≤10 linhas o que foi feito, o que mudou, e qualquer decisão técnica não-trivial que você tomou
3. **PARE e aguarde "ok" ou "go" antes de iniciar a próxima fase**

Em caso de ambiguidade no spec ou no codebase, **pergunte** ao usuário em vez de assumir. Faça no máximo 3 perguntas por vez, priorizando as que destravam mais trabalho.

## Padrões obrigatórios

- TypeScript em modo estrito quando aplicável. **Sem `any`.**
- Use as convenções já presentes no projeto (lint, formatter, naming, estrutura de pastas). Detecte-as antes de codar.
- UI inteiramente em **pt-BR**.
- Sem emojis na UI de produção. Use o icon set já adotado no projeto.
- Números monetários: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Datas: locale pt-BR.
- Toques mínimo 44×44px no mobile.
- Cores semânticas consistentes: vermelho = atrasado/erro, âmbar = vence hoje/atenção, verde = sucesso/saldo positivo, azul/info = clínica e ações neutras.
- Acessibilidade: navegação por teclado, ARIA labels, contraste WCAG AA.

---

## Fase 0 — Descoberta e plano

**Não escreva código nesta fase.**

1. Leia o spec por inteiro.
2. Mapeie o codebase: framework, roteamento, gerenciamento de estado, sistema de estilização, biblioteca de componentes, setup de testes, biblioteca de ícones, biblioteca de gráficos (se houver).
3. Localize arquivos de referência relevantes: telas existentes mais parecidas (`/app/sessions`, `/app/financial`, etc.), o sidebar de navegação, configurações já existentes (`/app/settings`).
4. Identifique quaisquer ambiguidades no spec e faça **no máximo 3 perguntas prioritárias**.
5. Produza um plano em formato de checklist markdown, fase por fase, listando os arquivos que você vai criar ou modificar em cada uma. Inclua estimativa de complexidade (baixa/média/alta) por fase.

**STOP.**

---

## Fase 1 — Modelo de dados e regras de negócio

Objetivo: regras de negócio testadas e desacopladas da UI.

1. Defina tipos/models para:
   - `Session` (com status, valor, paciente, horários)
   - `SessionStatus` (`"agendada" | "realizada" | "falta" | "abono"`)
   - `Payment` (com status, vencimento, valor, categoria, recorrência)
   - `RepassConfig` (`fixo: number`, `percentual: number`)
   - `CancellationPolicy` (`janelaHoras: number`, `overridePorPaciente?`)
   - `MonthClosure` (mês, status, log)
2. Implemente funções puras com **testes unitários cobrindo edge cases**:
   - `classifyCancellation(canceledAt, sessionAt, policy) → "falta" | "abono"`
     - Edge cases: exatamente na fronteira de 24h, override por paciente, sem timestamp de cancelamento.
   - `computeRepasse(sessionValue, repassConfig) → { repasse: number, liquido: number }`
     - Edge cases: fixo zero, percentual zero, ambos zero (deve indicar repasse desativado), valores quebrados.
   - `evaluateMonthClosure(month, sessions, payments) → { canClose: boolean, pendencies: Pendency[] }`
     - Edge cases: mês sem nada, mês com sessões sem registro, contas atrasadas não marcadas.
   - `canReopenMonth(month, userRole, mode) → boolean`
3. Crie fixtures de mock data realistas (use os exemplos numéricos do spec: R$ 180/sessão, repasse 30 + 40%, etc.) para desenvolvimento. Coloque em `/mocks` ou equivalente.

**STOP.**

---

## Fase 2 — Configurações: novos campos

1. Adicione em **Configurações**:
   - Seção/aba **"Política de cancelamento"**: campo `janela em horas` (default 24, mínimo 0, máximo 168). Texto auxiliar explicando o efeito.
   - Seção/aba **"Clínica"** (visível apenas no modo clínica): nome da clínica, campo `repasse fixo (R$)`, campo `repasse percentual (%)`. Validação: pelo menos um deles deve ser > 0 (senão alerta "repasse será desativado").
2. Adicione na **Ficha do paciente** a possibilidade de override:
   - Janela diferente (em horas) **ou**
   - Política especial: "sempre abona" / "sempre cobra"
3. Persistência: use o mecanismo já existente no projeto. Se não houver, use localStorage temporariamente e deixe `TODO(backend)` claro.

**STOP.**

---

## Fase 3 — Rota e shell da tela

1. Adicione a rota `/app/operacional` e a entrada no sidebar (o item "Operacional" provavelmente já existe — veja o sidebar atual).
2. Construa o shell responsivo:
   - **Mobile (< 768px):** coluna única, padding horizontal mínimo, cards em largura total.
   - **Tablet (768–1023px):** coluna única centralizada, max-width ~600px.
   - **Desktop (≥ 1024px):** layout em **2 colunas** quando faz sentido. Sugestão: coluna esquerda com Registros pendentes + Contas a pagar; coluna direita com Resumo do dia + Repasse + Fluxo de caixa. Ações rápidas no rodapé em largura total. Se isso conflitar com padrões já existentes no app, prefira o padrão existente.
3. Implemente o **cabeçalho**: título "Operacional", subtítulo com data formatada em pt-BR, e botão de microfone à direita (44×44px, desabilitado, com tooltip "Em breve").
4. Implemente o **strip de contexto** (modo clínica): mostra nome da clínica + nome do profissional, com chevron para troca de contexto (a troca em si pode ficar como TODO se ainda não houver multi-perfil).

**STOP.**

---

## Fase 4 — Cards da tela principal

Implemente os cards na ordem abaixo. Para cada card: (a) componente, (b) estado vazio, (c) interações, (d) testes de componente.

1. **Resumo do dia** — dois metric cards lado a lado: "Sessões hoje" (total + subtítulo com pendentes) e "Saldo do dia" (entrada−saída + breakdown).
2. **Registros pendentes** — lista de sessões do dia sem status com três botões inline (Realizada/Falta/Abono). Quando vazio, colapsa em faixa verde "Tudo registrado hoje · ver histórico ›". Aplique auto-classificação visual quando houver timestamp de cancelamento (pré-seleciona Falta ou Abono mas sempre exige confirmação por toque).
3. **Contas a pagar** — três seções em ordem: **Atrasadas** (fundo vermelho), **Vence hoje** (fundo âmbar), **Esta semana** (lista neutra agrupada por dia). Cada item atrasado ou vence-hoje tem botão inline "Marcar paga". Itens da semana sem botão (toque abre detalhe). Quando uma seção está vazia, omite o header dela.
4. **Repasse à clínica** (modo clínica apenas) — badge com a % configurada, "Acumulado no mês", "Próximo fechamento".
5. **Fluxo de caixa (resumo)** — entrou na semana, saiu na semana, linha "Líquido após repasse" (modo clínica) ou "A receber em aberto" (modo autônomo). Link "Ver detalhe ›".
6. **Ações rápidas** — grid 2×2: Recibos (desabilitado, "em breve"), Bloquear agenda, Nova despesa, Fechar mês.

**STOP.**

---

## Fase 5 — Fluxo de caixa detalhado

Sub-rota: `/app/operacional/fluxo-de-caixa` (ou o padrão de nested route do projeto).

1. Cabeçalho com botão voltar e ícone compartilhar.
2. **Seletor de período**: pill row com 7 dias / Mês corrente / 3 meses / Custom. Mês corrente em destaque por padrão.
3. **Saldo líquido do período** como número grande, com três badges: Entrou (verde), Repasse (info, modo clínica), Saiu (vermelho).
4. **Gráfico de barras semanais**: para cada semana do período, duas barras (entrada verde / saída vermelha) lado a lado. Use a biblioteca de gráficos do projeto se houver; caso contrário, implementação simples com divs e `height: %`. Inclua legenda.
5. **Entradas (breakdown)**: lista com proporção visual em barra fina. Categorias: Sessões realizadas, Faltas cobradas.
6. **Repasse à clínica (breakdown, modo clínica)**: card destacado mostrando a fórmula aplicada (fixo × N sessões, percentual × valor total).
7. **Saídas (lista)**: por categoria, sem barras (valores heterogêneos).
8. **A receber em aberto**: lista de pacientes com valor e idade do atraso (vermelho >14d, âmbar 7–14d, neutro <7d ou a vencer).
9. **Exportar período** no rodapé: gere CSV simples para começar.

**STOP.**

---

## Fase 6 — Fechar mês e reabrir

1. Botão "Fechar mês" abre **modal** que lista pendências (sessões sem registro, contas atrasadas não marcadas). Se há pendências, exige checkbox "Entendo que ainda há pendências" antes do botão de confirmar.
2. Após fechado, dados do mês ficam em modo **read-only** em toda a aplicação (sessões, despesas, recibos quando existirem). Indicador visual: ícone de cadeado e badge "Mês fechado".
3. Botão "Reabrir mês" visível apenas para perfis permitidos (profissional sempre; clínica em modo clínica). Reabertura registra no log com timestamp, usuário, perfil.
4. Crie **`Configurações > Histórico de fechamentos`**: lista cronológica de ações de fechar e reabrir.
5. No modo clínica, quando uma parte reabre um mês fechado pela outra, dispare a **função de geração de notificação** (sem enviar push real ainda — apenas log no console ou em estado, para validar o gatilho).

**STOP.**

---

## Fase 7 — Geração de notificações push (lógica, sem envio)

1. Implemente funções puras que **geram payloads de push** com base no estado atual da aplicação:
   - `generateUnregisteredSessionsPush(now, sessions) → Payload | null`
   - `generateDuePaymentsPush(now, payments) → Payload | null`
   - `generateMonthCloseReminderPush(now) → Payload | null`
   - `generateMonthReopenedPush(closure, byUser) → Payload | null`
2. Cada função respeita os gatilhos do spec (seção 6): horário, frequência máxima, condições.
3. Crie um **endpoint ou comando interno** de simulação que invoca essas funções e mostra os payloads em uma tela admin/dev. Isso permite testar o conteúdo sem integração real.
4. Testes unitários para os gatilhos: dia tranquilo não dispara, dia com pendência dispara, frequência respeitada.

**STOP.**

---

## Fase 8 — Polimento, testes e documentação

1. **Testes E2E** (Playwright/Cypress se já instalado) para fluxos principais:
   - Marcar sessão como falta e ver impacto em contas a receber
   - Adicionar despesa avulsa
   - Fechar mês com pendências (deve avisar)
   - Reabrir mês e checar log
2. **Acessibilidade**: passe um audit (axe ou Lighthouse). Corrija violações.
3. **Responsividade**: valide em 360, 768, 1024, 1440. Capture screenshots em cada.
4. **Documentação** em `/docs/operacional.md`:
   - Visão arquitetural (componentes, fluxo de dados, regras de negócio)
   - Como rodar localmente
   - Como adicionar uma nova categoria de despesa, um novo tipo de notificação, etc.
   - Pontos de extensão para a fase de voz (mostra onde plugar o speech-to-text)
5. Atualize o `CHANGELOG.md`.
6. Rode a suíte completa de testes. Garanta que tudo passa.
7. Resumo final: o que foi feito, decisões técnicas chave, débito técnico assumido (com tracking), e checklist do que está pronto para a fase de voz.

**STOP.**

---

## Definição de pronto

A task está concluída quando:

- Todas as 8 fases foram completadas e aprovadas pelo usuário
- Lint, typecheck e todos os testes passam
- Audit de acessibilidade não tem violações nível AA
- Tela funciona em mobile (360px), tablet (768px), desktop (1440px)
- Documentação técnica está escrita e atualizada
- Não há `console.log` ou `TODO` sem issue rastreada no código
- A fase de voz pode ser iniciada sem nenhuma refatoração estrutural — apenas plugando o speech-to-text no botão de microfone existente
