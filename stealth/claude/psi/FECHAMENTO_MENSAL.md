# Spec — Fechamento Mensal e Apontamento de Presença

> Documento de produto consolidando as decisões da fase de descoberta.
> Serve como input para desenho técnico e implementação.

---

## 1. Contexto e objetivo

Atualmente o sistema permite agendar sessões em `/app/sessions`, mas não registra se o paciente compareceu. Sem esse registro, o cálculo do faturamento mensal do terapeuta não pode ser executado de forma confiável.

A feature aqui especificada introduz o **apontamento de presença** e o **fluxo de fechamento mensal** que o consome. Pacientes que faltam ainda podem ser cobrados — a regra de cobrança (cancelamento com aviso de 24h ou mais → reagendamento; menos de 24h → cobrado mesmo ausente) já está implementada em outro fluxo e **não faz parte desta feature**.

### Não-objetivos

- Não calcula o valor mensal nem emite cobranças. Um processo separado consome os apontamentos.
- Não trata cancelamentos com aviso prévio (já resolvidos no fluxo de cancelamento).
- Não implementa o módulo de voz (planejado para fase futura, mas o desenho aqui o prepara).

---

## 2. Glossário

| Termo                 | Definição                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Apontamento           | Marcação de uma sessão como `Presente` ou `Faltou`.                                                                           |
| Sessão pendente       | Sessão cuja data já passou e ainda não tem apontamento.                                                                       |
| Fechamento mensal     | Ação irreversível (dentro da janela do mês) que consolida todos os apontamentos do mês e libera o cálculo do faturamento.     |
| Central de pendências | Agregador no menu lateral que totaliza pendências de vários tipos (apontamentos, futuramente notas fiscais e reagendamentos). |

---

## 3. Estrutura de navegação

### 3.1 Rota nova

`/app/fechamento-mensal` — página principal da feature.

### 3.2 Menu lateral

Item novo: **Pendências (N)** com badge contador.

- `N` = soma de apontamentos pendentes do mês corrente + (futuro) notas fiscais + reagendamentos.
- Clicar em "Pendências" leva a uma página agregadora com abas: **Apontamentos**, **Notas fiscais** (futuro), **Reagendamentos** (futuro).
- A aba **Apontamentos** renderiza a página descrita neste documento.
- Na v1 (só apontamentos), o clique pode levar direto a `/app/fechamento-mensal` sem aba intermediária.

### 3.3 Relação com `/app/sessions`

A página de sessões permanece focada em **planejamento futuro**. Não exibe status de apontamento nos cards. Não há link cruzado obrigatório entre as duas páginas na v1.

---

## 4. Estrutura da página `/app/fechamento-mensal`

### 4.1 Header

- **Seletor de mês**: navegação `< Maio 2026 >`. Default conforme regra em §6.1.
- **Botão "Só pendentes"**: alterna entre as duas visualizações (§5).
- **Botão "Fechar mês"**: desabilitado enquanto houver pendências. Tooltip explica o motivo (ex.: "Faltam 6 apontamentos").

### 4.2 Barra de progresso

`X de Y sessões apontadas · N pendentes`, com barra visual de preenchimento.

### 4.3 Corpo

Conteúdo varia conforme a visualização ativa (§5).

---

## 5. Visualizações

A página tem duas visualizações alternáveis por toggle.

### 5.1 Calendário semanal (default)

- Carrossel de semanas do mês, navegável por setas ou indicadores de página.
- Default: semana que contém o dia atual, com o dia atual em destaque visual.
- Cada dia renderiza como **bloco colapsável** (card).
  - **Cabeçalho colapsado**: dia da semana, número, "X sessões · Y pendentes" e badge contador (`6/6` em verde quando completo, `2/6` em amarelo quando pendente).
  - **Cabeçalho expandido**: mesma info + ícone chevron-up.
  - **Conteúdo expandido**: atalho de bulk action (§7.4) + lista de sessões do dia.
- **Dias futuros**: visíveis mas com opacity reduzida, sem badge de ação, label "Aguardando".
- **Dias sem sessões** (passados, presentes ou futuros): visíveis com texto "Sem sessões". Sábados e domingos seguem essa regra — sempre visíveis.
- **Hoje**: destaque com cor de info no número/dia, label "Hoje" no corpo, borda accent à esquerda no card.

#### Item de sessão (dentro do bloco expandido)

Três estados visuais:

| Estado           | Aparência                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Não apontada     | Fundo `--color-background-secondary`, dois botões "Presente" / "Faltou" lado a lado.       |
| Apontada         | Pill colorido com status (verde "Presente" ou vermelho "Faltou") + botão "Editar" (ícone). |
| Em edição inline | Mesma estrutura do estado "Não apontada", com borda tracejada e label "editando".          |

Conteúdo do item: `HH:MM · Nome do paciente · [ação ou status]`.

### 5.2 Só pendentes

Lista cronológica plana mostrando apenas sessões pendentes do mês selecionado, agrupadas por dia. Cada item usa o mesmo componente da §5.1 (estado "Não apontada").

Otimizado para o uso "vou resolver o que falta antes de fechar o mês". Não tem carrossel semanal — o objetivo é zerar a lista.

---

## 6. Regras de negócio

### 6.1 Ciclo de vida do apontamento

- Uma sessão se torna **apontável** ao fim do horário marcado (não a partir do início do dia).
- Pendências acumulam indefinidamente — não expiram nem ganham apontamento automático.
- Estado padrão: **vazio**. O sistema sempre exige ação humana.
- Estados finitos do apontamento: `vazio` → `presente` ou `faltou`.

### 6.2 Bloqueio de fechamento

- "Fechar mês" só fica habilitado quando todas as sessões cuja data fim já passou possuem apontamento.
- Sessões futuras dentro do mês corrente **não bloqueiam** o fechamento se o mês ainda não acabou — mas a UX padrão é fechar o mês após o último dia.
- Sessões canceladas com aviso prévio (≥ 24h) **não aparecem** na fila de apontamento. (Validar com a regra existente — ver §10.)

### 6.3 Edição

- Apontamentos são editáveis enquanto o mês estiver aberto.
- Após o fechamento, o apontamento fica imutável. Reabertura do mês fora do escopo da v1 (ver §10).
- Toda mudança gera um registro no log (§9). A sessão editada exibe indicador visual de "modificada" (ex.: ponto colorido no card).

### 6.4 Mês padrão ao abrir a página

Abre no **mês não-fechado mais antigo com pendências**. Se não houver pendências antigas, abre no mês atual. Isso força a resolver o passado antes do presente.

### 6.5 Critério de "sessão do mês"

Sessão pertence ao mês da sua **data realizada** (após reagendamentos), não da data originalmente marcada. Esse ponto precisa ser validado contra o modelo de dados atual (§10).

---

## 7. Interações

### 7.1 Apontar

Clicar em "Presente" ou "Faltou" no item de sessão. Confirmação imediata, sem modal. O item transita para o estado "Apontada".

### 7.2 Editar inline

Clicar no botão de edição (ícone) numa sessão apontada. O pill some, os dois botões reaparecem. Escolher um dos dois confirma a alteração. Clicar fora ou em "cancelar" (a definir no desenho visual) desfaz o estado de edição sem alteração.

### 7.3 Marcar todas como presente (bulk)

- Aparece no header do bloco expandido, **apenas se o dia tiver ao menos uma sessão pendente**.
- Afeta **somente** sessões pendentes do dia. Não sobrescreve as já apontadas.
- Sem confirmação modal na v1 (todas as ações são reversíveis enquanto o mês está aberto). Reavaliar se houver feedback de erro do usuário.

### 7.4 Fechar mês

- Botão habilita quando pendências chegam a zero.
- Clicar abre modal de confirmação: "Fechar maio 2026? Esta ação consolida os apontamentos e dispara o cálculo do faturamento. Você não poderá editar apontamentos após o fechamento."
- Confirmação dispara: (a) flag `closed_at` no mês, (b) evento para o processo de cálculo, (c) congelamento de edições.

---

## 8. Estados da interface

| Cenário                            | Comportamento                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mês sem nenhuma sessão             | Página mostra "Nenhuma sessão neste mês". Botão "Fechar mês" desabilitado com tooltip "Sem sessões para fechar".                                 |
| Mês 100% apontado, não fechado     | Barra de progresso cheia, botão "Fechar mês" habilitado e destacado.                                                                             |
| Mês fechado                        | Página renderiza em modo somente-leitura. Todos os apontamentos visíveis sem botão de editar. Banner: "Mês fechado em DD/MM/AAAA por [usuário]". |
| Usuário entra durante mês corrente | Pode haver sessões futuras na semana atual — aparecem grayed out, não bloqueiam fechamento.                                                      |
| Mobile                             | Layout responsivo. Blocos colapsáveis funcionam igual. Botões "Presente"/"Faltou" ocupam largura suficiente para toque.                          |

---

## 9. Log de auditoria

Toda alteração de apontamento gera um registro imutável.

### 9.1 Tabela `appointment_log` (proposta)

| Campo            | Tipo          | Descrição                              |
| ---------------- | ------------- | -------------------------------------- |
| `id`             | uuid          | Identificador do registro.             |
| `session_id`     | fk            | Sessão alterada.                       |
| `actor_user_id`  | fk            | Usuário que executou a ação.           |
| `action`         | enum          | `created`, `updated`, `cleared`.       |
| `previous_value` | enum nullable | `presente`, `faltou` ou `null`.        |
| `new_value`      | enum nullable | `presente`, `faltou` ou `null`.        |
| `created_at`     | timestamp     | Quando ocorreu.                        |
| `source`         | enum          | `ui`, `bulk_action`, `voice` (futuro). |

### 9.2 Indicador "modificada" na UI

Sessão cujo log tem mais de um registro mostra indicador visual discreto. Hover/toque revela: "Última edição em DD/MM HH:MM por [usuário]".

Histórico completo da sessão acessível via página de detalhe da sessão (fora do escopo desta v1, mas o log já fica registrado).

---

## 10. Decisões pendentes

Itens que precisam ser resolvidos antes ou durante o desenho técnico:

1. **Sessões reagendadas que cruzam meses.** Quando uma sessão marcada para 30/jan é reagendada para 02/fev, ela conta no fechamento de janeiro ou fevereiro? Decisão tentativa em §6.5 (data realizada), mas precisa validar contra o modelo de dados atual.
2. **Sessões canceladas com aviso prévio.** Confirmar que o status atual da sessão (após cancelamento ≥24h) faz com que ela não apareça na fila de apontamento — caso contrário, é preciso filtro explícito.
3. **Permissões em clínica multi-usuário.** Quem pode apontar? Só o terapeuta da sessão? Admin pode apontar por outro terapeuta? Quem pode fechar o mês? Quem pode reabrir um mês fechado (se isso for permitido)?
4. **Reabertura de mês fechado.** Cenário: erro detectado após fechamento. Permitir reabrir? Com quais permissões? Por quanto tempo?
5. **Notificação proativa.** O badge no menu informa passivamente. Vale também: email no fim do dia? Push? Notificação intra-app? Decidir no contexto da fase de voz.

---

## 11. Considerações futuras (fora do escopo da v1)

- **Apontamento por voz.** O Psi envia notificação para o terapeuta que confirma sessões por voz ou pelo app. O modelo de estados desta v1 já comporta `source: voice` no log.
- **Outros tipos de pendência.** Notas fiscais e validação de reagendamentos passarão a aparecer na central de pendências. A estrutura de abas mencionada em §3.2 já antecipa isso.
- **Histórico de sessão.** Página de detalhe da sessão exibindo o log completo.
- **Indicadores em `/app/sessions`.** Reavaliar se mostrar status de apontamento nos cards da agenda agrega valor após o uso real da feature.

---

## 12. Resumo das decisões tomadas

| #   | Pergunta                    | Decisão                                                                     |
| --- | --------------------------- | --------------------------------------------------------------------------- |
| 1   | Onde mora a feature         | Página dedicada `/app/fechamento-mensal`, agregada ao menu via "Pendências" |
| 2   | Quando o Psi aponta         | Fim do dia, em lote (com fluxo de voz no futuro)                            |
| 3   | Estados do apontamento      | `Presente` ou `Faltou` apenas                                               |
| 4   | Cobrança                    | Tratada por processo separado; fora do escopo                               |
| 5   | Visualização principal      | Carrossel semanal com blocos colapsáveis por dia                            |
| 6   | Visualização alternativa    | Lista "Só pendentes" cronológica                                            |
| 7   | Dias futuros                | Visíveis, grayed out, não acionáveis                                        |
| 8   | Dias sem sessões            | Visíveis com texto "Sem sessões" (inclui fim de semana)                     |
| 9   | Estado inicial do dia atual | Bloco do dia expandido com hoje destacado                                   |
| 10  | Edição de apontamento       | Inline, até o fechamento do mês                                             |
| 11  | Bulk action                 | "Marcar todas como presente" no header do dia, afeta só pendentes           |
| 12  | Pendências acumulam         | Sim, indefinidamente                                                        |
| 13  | Apontamento automático      | Não — sistema sempre exige ação humana                                      |
| 14  | Fechamento do mês           | Botão bloqueado até zerar pendências                                        |
| 15  | Log de auditoria            | Tabela `appointment_log`, indicador "modificada" na UI                      |
| 16  | Mês padrão ao abrir         | Mais antigo com pendências                                                  |
| 17  | Badge no menu               | Sim, contador agregado de pendências                                        |
