# Prompt — Implementação do Fechamento Mensal

Você vai implementar a feature de **Fechamento Mensal e Apontamento de Presença** descrita em `FECHAMENTO_MENSAL.md`. O documento é a fonte da verdade de produto — leia-o por inteiro antes de começar e consulte-o sempre que houver dúvida sobre regra de negócio ou UX.

## Regras gerais

1. **Trabalhe em fases sequenciais.** Não avance para a próxima fase sem completar a anterior e pedir validação ao usuário.
2. **Não decida sozinho itens da Seção 10 do spec ("Decisões pendentes").** Quando topar com um deles, pare, apresente as opções com trade-offs e pergunte.
3. **Respeite o código existente.** Antes de criar arquivos, identifique os padrões do projeto (estrutura de pastas, convenções de nomes, framework de UI, ORM, testes) e siga-os.
4. **Sem suposições sobre o stack.** Se o spec menciona `/app/sessions` mas você não conhece o stack, descubra na Fase 0 antes de propor qualquer código.
5. **Commits pequenos e descritivos.** Um commit por entrega de fase, mensagem em português.
6. **Comunique progresso.** Ao fim de cada fase, resuma o que foi feito, o que está pendente para a próxima, e o que precisa de input do usuário.

---

## Fase 0 — Descoberta do contexto

**Objetivo:** entender o projeto antes de tocar em qualquer linha de código.

**Faça:**

1. Leia `FECHAMENTO_MENSAL.md` por inteiro.
2. Explore a estrutura do repositório. Identifique:
   - Framework (Next.js? Remix? outro?) e versão.
   - Linguagem (TypeScript? JavaScript?).
   - ORM ou cliente de banco (Prisma? Drizzle? raw SQL?).
   - Sistema de UI (Tailwind? shadcn/ui? outra lib?).
   - Estrutura de rotas e como `/app/sessions` está implementado.
   - Onde fica o menu lateral e como itens são adicionados.
   - Como autenticação e permissões são tratadas.
   - Padrão de testes (se existir).
3. Localize o modelo de dados da **sessão**. Documente: campos relevantes, estados possíveis, como o cancelamento com aviso prévio é representado, como reagendamentos funcionam.
4. Localize o modelo de **usuário/terapeuta** e como sessões se ligam a ele.

**Entregue:** um resumo em prosa (no chat, sem criar arquivo) com:

- Stack identificado.
- Modelo atual de sessão (campos e estados).
- Como reagendamento e cancelamento prévio se manifestam no modelo.
- Pontos onde você terá que estender o código existente.
- Qualquer dúvida bloqueante para as próximas fases.

**Pare e aguarde validação do usuário.**

---

## Fase 1 — Resolução das decisões pendentes

**Objetivo:** fechar a Seção 10 do spec antes de implementar.

**Faça:**

Para cada item da Seção 10, com base no que você descobriu na Fase 0:

1. **Sessões reagendadas que cruzam meses** — proponha qual data o sistema deve usar como "data realizada" (verifique se já existe esse campo).
2. **Sessões canceladas com aviso prévio** — descubra no código como elas são marcadas e proponha o filtro exato a aplicar.
3. **Permissões em clínica multi-usuário** — verifique o modelo de permissões atual e proponha quem pode apontar, quem pode fechar, quem pode reabrir.
4. **Reabertura de mês fechado** — proponha sim/não para v1 e, se sim, com quais regras.
5. **Notificação proativa** — proponha o que vai para v1 (provavelmente só o badge) e o que fica para depois.

**Entregue:** uma lista numerada, no chat, com sua proposta + justificativa curta para cada item.

**Pare e aguarde decisão do usuário item por item.** Anote as decisões em `FECHAMENTO_MENSAL.md` (atualize a Seção 10 ou crie uma Seção 10.1 "Decisões resolvidas").

---

## Fase 2 — Modelo de dados e migrations

**Objetivo:** criar a base de dados que sustenta a feature.

**Faça:**

1. Crie a migration para a tabela `appointment_log` conforme §9.1 do spec.
2. Adicione ao modelo de sessão (ou a um modelo relacionado, se mais adequado):
   - Campo de status do apontamento: `attendance_status` (`null` | `presente` | `faltou`).
   - Campo `attendance_updated_at` (timestamp da última alteração, facilita o indicador "modificada").
3. Crie a tabela `monthly_closing` (ou equivalente) para registrar mês fechado:
   - `id`, `therapist_id`, `year`, `month`, `closed_at`, `closed_by_user_id`.
   - Constraint de unicidade em (`therapist_id`, `year`, `month`).
4. Adicione índices necessários para as queries das próximas fases (sessões por mês, log por sessão).
5. Rode a migration localmente e valide o schema.

**Entregue:** arquivos de migration + atualização dos modelos/types. Resumo no chat dos arquivos criados/alterados.

**Pare e aguarde validação.**

---

## Fase 3 — Camada de domínio e API

**Objetivo:** implementar a lógica de negócio e endpoints, sem UI.

**Faça:**

Implemente, com testes unitários para cada regra de negócio:

1. **Listagem de sessões do mês para apontamento.**
   - Input: `therapist_id`, `year`, `month`.
   - Filtros: exclui sessões canceladas com aviso prévio (regra confirmada na Fase 1).
   - Output: lista de sessões com campos relevantes para a UI + `attendance_status`.

2. **Apontamento (criar/atualizar).**
   - Input: `session_id`, `status` (`presente` | `faltou`), usuário ator.
   - Valida: sessão existe, data já passou, mês não está fechado, ator tem permissão.
   - Atualiza `attendance_status` e grava registro em `appointment_log` com `previous_value` e `new_value`.
   - `source` = `ui`.

3. **Bulk: marcar todas como presente.**
   - Input: `therapist_id`, data específica, usuário ator.
   - Aplica apontamento `presente` **apenas** em sessões pendentes do dia.
   - Cada sessão afetada gera seu próprio registro de log com `source: bulk_action`.

4. **Contador de pendências.**
   - Input: `therapist_id`.
   - Output: número de sessões pendentes em meses não-fechados (para o badge do menu).

5. **Resumo do mês.**
   - Input: `therapist_id`, `year`, `month`.
   - Output: `{ total, apontadas, pendentes, fechado: boolean, fechado_em?, fechado_por? }`.

6. **Fechar mês.**
   - Input: `therapist_id`, `year`, `month`, usuário ator.
   - Valida: zero pendências, mês ainda não fechado, ator tem permissão.
   - Cria registro em `monthly_closing`.
   - Dispara evento `month_closed` (mesmo que o consumidor seja stub na v1 — deixe o gancho pronto).

7. **Mês não-fechado mais antigo com pendências** (helper para a regra §6.4).

Exponha cada operação como endpoint da convenção do projeto (route handler, server action, tRPC, etc. — siga o que o projeto já usa).

**Entregue:** código + testes. Liste no chat cada operação implementada e mostre a saída dos testes passando.

**Pare e aguarde validação.**

---

## Fase 4 — Rota e shell da página

**Objetivo:** criar a página vazia no lugar certo e a integração com o menu.

**Faça:**

1. Crie a rota `/app/fechamento-mensal` seguindo o padrão das demais rotas do projeto.
2. Adicione o item **Pendências** no menu lateral, com badge contador consumindo o endpoint da Fase 3.
3. Crie o shell da página: header com seletor de mês (estado controlado, sem dados ainda), barra de progresso (placeholder), área de conteúdo vazia.
4. Implemente a regra de §6.4: ao montar a página, redireciona/seleciona o mês não-fechado mais antigo com pendências; se não houver, mês atual.
5. Trate permissões: usuários sem acesso à feature são redirecionados.

**Entregue:** página acessível com navegação básica funcionando. Screenshot ou descrição do que está visível.

**Pare e aguarde validação.**

---

## Fase 5 — Visualização semanal (calendário)

**Objetivo:** implementar a visualização principal descrita em §5.1.

**Faça:**

1. Componente `WeekCarousel`: navegação entre semanas do mês, indicadores de página, default na semana do dia atual.
2. Componente `DayBlock`: card colapsável conforme §5.1.
   - Estados visuais: completo, com pendências, dia futuro (grayed), sem sessões.
   - Hoje recebe destaque conforme spec.
   - Expande/colapsa por clique no cabeçalho.
3. Componente `SessionItem`: três estados visuais (não apontada, apontada, em edição inline) conforme §5.1.
4. Bulk action "Marcar todas como presente" no header do bloco expandido, condicional à existência de pendências no dia.
5. Layout responsivo (mobile). Botões com área de toque adequada.

**Importante:** ainda **não** ligue os botões a ações reais — use callbacks com `console.log`. A integração de interação fica na Fase 6.

**Entregue:** visualização semanal renderizando dados reais do backend, sem capacidade de modificação ainda.

**Pare e aguarde validação visual.**

---

## Fase 6 — Interações e estado

**Objetivo:** ligar a UI ao backend.

**Faça:**

1. **Apontar:** clique em Presente/Faltou dispara a operação da Fase 3. Atualização otimista da UI, rollback em erro.
2. **Editar inline:** clique no botão de edição alterna o item para o estado "em edição". Clicar em Presente/Faltou confirma; clicar fora cancela.
3. **Bulk action:** dispara o endpoint da Fase 3. Atualização otimista. Mensagem de feedback discreta (toast ou similar do design system do projeto).
4. **Indicador "modificada":** sessões com mais de um registro em `appointment_log` recebem o indicador visual. Tooltip mostra última edição.
5. **Barra de progresso** e **contador no badge do menu** atualizam reativamente após cada ação.
6. **Botão "Fechar mês":** modal de confirmação conforme §7.4. Após sucesso, página recarrega em modo somente-leitura.

**Entregue:** feature funcional ponta-a-ponta na visualização semanal.

**Pare e aguarde validação.**

---

## Fase 7 — Visualização "Só pendentes"

**Objetivo:** implementar a visualização alternativa de §5.2.

**Faça:**

1. Toggle no header alterna entre "Calendário" e "Só pendentes" (estado preservado em URL via query param, ex.: `?view=pendentes`).
2. Lista cronológica plana, agrupada por dia, mostrando apenas sessões pendentes.
3. Reusa o componente `SessionItem` da Fase 5.
4. Quando a lista zera, mostra estado vazio celebratório com CTA "Fechar mês" se aplicável.

**Entregue:** segunda visualização funcionando, toggle preservando estado.

**Pare e aguarde validação.**

---

## Fase 8 — Estados de borda e polimento

**Objetivo:** cobrir os cenários da §8 do spec.

**Faça:**

1. **Mês sem sessões:** estado vazio com mensagem apropriada.
2. **Mês fechado:** modo somente-leitura. Banner com data e autor do fechamento. Sem botões de edição.
3. **Mês 100% apontado, não fechado:** botão "Fechar mês" destacado.
4. **Navegação entre meses:** transições suaves, loading states.
5. **Erros de rede:** tratamento gracioso com retry.
6. **Acessibilidade:** navegação por teclado, ARIA labels nos botões, contraste adequado.
7. **Responsividade:** revisar mobile em viewports pequenos (até 360px).

**Entregue:** checklist marcado da §8 + observações de polimento aplicado.

**Pare e aguarde validação.**

---

## Fase 9 — Testes e validação

**Objetivo:** garantir confiabilidade antes do merge.

**Faça:**

1. **Testes unitários:** todas as regras de negócio da Fase 3 cobertas (mínimo 80%).
2. **Testes de integração:** fluxos críticos — apontar, editar, bulk, fechar mês, tentativa de editar mês fechado.
3. **Checklist de QA manual** (gere como arquivo separado `QA_CHECKLIST.md`):
   - Cenário feliz: 6 sessões no dia, apontar 4 manualmente, bulk no resto, fechar mês.
   - Cenário de edição: apontar errado, editar, ver indicador "modificada", ver log.
   - Cenário de bloqueio: tentar fechar mês com pendência.
   - Cenário multi-usuário (se aplicável após Fase 1).
   - Cenário mobile.
4. Execute toda a suíte de testes e mostre o resultado.

**Entregue:** suíte verde + arquivo de QA + resumo final no chat com:

- O que foi implementado.
- O que ficou explicitamente fora do escopo (referenciando §11 do spec).
- Sugestões de melhorias para iterações futuras.

---

## Critérios de "feito"

A feature está pronta para merge quando:

- [ ] Todas as 10 fases foram concluídas e validadas pelo usuário.
- [ ] Decisões da Seção 10 do spec foram registradas no documento.
- [ ] Suíte de testes verde.
- [ ] QA manual executado e sem bugs bloqueantes.
- [ ] Documentação inline mínima (JSDoc/comentários) nos pontos não-óbvios.
- [ ] Nenhum `TODO` ou `console.log` esquecido em código de produção.

---

## Se algo der errado

- **Encontrou ambiguidade no spec:** pare, cite a seção, proponha interpretações, pergunte.
- **Descobriu que uma decisão da Fase 1 estava errada:** pare, explique o que mudou, proponha ajuste.
- **Estimativa explodiu:** pare antes de escrever código demais, mostre o tamanho do problema e proponha quebrar a fase em sub-fases.
- **Precisa de dado de produção ou credencial:** nunca invente, sempre peça.
