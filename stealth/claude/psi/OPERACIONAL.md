# Aba Operacional — Especificação funcional

> Versão 1.0 — maio/2026
> Aplicativo Psi

## 1. Visão geral

A aba **Operacional** centraliza as operações de back-office do dia a dia do consultório: registro de sessões, contas a pagar, fluxo de caixa e (em modo clínica) repasses. Substitui a navegação repetitiva entre Sessões e Financeiro para ações que o psicólogo faz várias vezes ao dia.

**Público-alvo:** psicólogo autônomo e profissional vinculado a clínica.
**Plataforma primária:** mobile. A tela é desenhada para ser operada com o polegar direito; as ações principais ficam à direita do cabeçalho.

## 2. Modos: autônomo vs. clínica

A mesma tela atende os dois modos, alternando elementos:

| Elemento                                        | Autônomo                 | Clínica                                  |
| ----------------------------------------------- | ------------------------ | ---------------------------------------- |
| Strip de contexto no topo                       | Oculto                   | Visível, com nome do profissional        |
| Card "Repasse à clínica"                        | Oculto                   | Visível                                  |
| Linha "Líquido após repasse" no resumo de caixa | Oculta                   | Visível                                  |
| Permissão de reabrir mês fechado                | Próprio profissional     | Profissional ou clínica                  |
| Aluguel da sala                                 | Despesa recorrente comum | Inexistente (clínica recebe via repasse) |

## 3. Estrutura da tela (ordem vertical)

1. Cabeçalho — título "Operacional" + data + botão de microfone
2. Strip de contexto — só em modo clínica
3. Resumo do dia — dois cards: "Sessões hoje" e "Saldo do dia"
4. Registros pendentes — sessões sem status (colapsa em faixa quando vazio)
5. Contas a pagar — atrasadas → vence hoje → esta semana
6. Repasse à clínica — só em modo clínica
7. Fluxo de caixa — resumo com link "Ver detalhe ›"
8. Ações rápidas — grid 2×2 de botões

## 4. Regras de negócio

### 4.1 Faltas, abonos e janela de antecedência

- **Janela padrão:** 24 horas.
- Cancelamento com **≥24h** de antecedência → **abono** (não cobra).
- Cancelamento com **<24h** ou ausência sem aviso → **falta** (cobra valor cheio da sessão para o paciente).
- A janela é configurável globalmente em **Configurações > Política de cancelamento**.
- **Override por paciente:** na ficha do paciente, dá pra definir janela diferente ou marcar "sempre abona" / "sempre cobra" para acordos específicos.
- **Auto-classificação:** quando o cancelamento tem timestamp registrado (via voz ou, no futuro, app do paciente), o sistema pré-seleciona falta ou abono — mas sempre pede confirmação antes de cobrar.

### 4.2 Repasse à clínica

- **Fórmula por sessão cobrada:** `fixo + (percentual × valor_da_sessão)`.
- O fixo pode ser zero; o percentual pode ser zero; mas não ambos (nesse caso o repasse é desativado).
- **Aplica-se a toda sessão cobrada**, incluindo **faltas cobradas**.
- **Configuração:** cadastro da clínica em **Configurações > Clínica**.
- **Transparência:** na ficha de cada sessão, exibir três linhas:
  - Valor cobrado: R$ 180
  - Repasse: −R$ 102
  - Você recebe: R$ 78

### 4.3 Fechamento de mês

- "Fechar mês" trava edição retroativa de sessões e despesas daquele mês.
- **Pré-confirmação:** modal lista pendências antes de travar.
  _Exemplo:_ "Você tem 2 sessões sem registro e 1 conta atrasada não marcada. Deseja revisar antes de fechar abril?"
- **Reabertura:** permitida ao profissional (modo autônomo) ou ao profissional **e** à clínica (modo clínica).
- **Log:** toda ação de fechar ou reabrir mês fica registrada em **Configurações > Histórico de fechamentos** com timestamp, usuário e perfil.
- **Notificação cruzada (modo clínica):** quando uma das partes reabre um mês fechado, a outra recebe push informativo.

## 5. Interface de voz

### 5.1 Princípios

- **Confirmação curta antes de gravar** qualquer ação que envolva paciente ou dinheiro.
- **Reversibilidade:** toda ação por voz exibe toast com "Desfazer" por 8 segundos.
- **Voz é entrada, toque é compromisso** para ações irreversíveis (futuro: emissão fiscal; presente: fechamento de mês).
- **Sugestões contextuais** abaixo do microfone, baseadas no estado atual da tela.

### 5.2 Comandos suportados (v1)

| Categoria               | Exemplo                                                    | Ação                                 |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------ |
| Registro de sessão      | "Ana realizada" / "Falta da Ana" / "Abonar a 14h"          | Marca sessão, confirma valor         |
| Cancelamento retroativo | "Marina cancelou ontem pra hoje 10h"                       | Calcula antecedência, pré-classifica |
| Despesa avulsa          | "Anota 80 reais de Uber pra supervisão"                    | Cria despesa já categorizada         |
| Conta paga              | "Marquei a internet como paga"                             | Marca conta como paga                |
| Briefing do dia         | "Como está meu dia?"                                       | Resposta falada do estado            |
| Consulta                | "Quanto recebi essa semana?" / "Quais contas vencem hoje?" | Resposta falada + card               |

### 5.3 Padrão de confirmação

Toda ação destrutiva ou financeira segue o padrão:

> Psicólogo: _"Falta da Ana"_
> App: _"Ana Silva, 14h, falta, R$ 180 cobrados. Confirma?"_
> Psicólogo: _"Sim"_ (ou toque em ✓)
> App: registra e mostra toast "Falta registrada · Desfazer"

### 5.4 Requisitos do parser

- Reconhecer **antecedência relativa** desde o lançamento: "ontem", "anteontem", "agora há pouco", "hoje cedo".
- Resolver paciente por **nome** ou por **horário** (mais robusto que só nome).
- Falhar elegante: se ambíguo ("João" e "Joana" no mesmo dia), pedir desambiguação por voz ou tela.

## 6. Notificações push

| Gatilho                     | Horário      | Conteúdo (exemplo)                                            | Frequência máxima |
| --------------------------- | ------------ | ------------------------------------------------------------- | ----------------- |
| Sessões sem registro        | 18h-20h      | "Você tem 2 sessões sem registro hoje. Toque para registrar." | 1×/dia            |
| Conta vencendo ou atrasada  | Manhã (~8h)  | "Internet vence hoje (R$ 120) e mais 1 conta."                | 1×/dia            |
| Início do mês               | Dia 1, manhã | "Hora de fechar abril. Toque para revisar."                   | 1× por evento     |
| Reabertura de mês (cruzada) | Imediato     | "Crescer e Ser reabriu o mês de abril."                       | Por evento        |

**Regras:**

- Nenhum push é acionável diretamente (não há "marcar paga" pelo push). Sempre leva à tela.
- Push só dispara se houver pendência real. Dia tranquilo não notifica.

## 7. Estados especiais

### 7.1 Dia sem pendências

- O card "Registros pendentes" colapsa numa faixa verde discreta: "Tudo registrado hoje · ver histórico ›".
- Mesmo padrão para contas: se não há atrasadas nem vence-hoje, exibe só a seção "Esta semana".

### 7.2 Mês fechado

- Sessões e despesas do mês aparecem em modo somente leitura com ícone de cadeado.
- Botão "Reabrir mês" visível para perfis com permissão.

### 7.3 Primeira semana de uso

- Cards exibem CTAs específicos para configuração inicial:
  - "Cadastre suas despesas recorrentes" → deep-link a Configurações > Despesas
  - "Agende sua primeira sessão" → deep-link à agenda

## 8. Configurações relacionadas

**Novos campos a adicionar:**

- **Política de cancelamento:** janela em horas (default 24).
- **Clínica** (modo clínica): nome, repasse fixo (R$), repasse percentual (%).
- **Ficha do paciente:** override de janela ou política específica.

**Já existentes (sem mudança):**

- Despesas recorrentes em Configurações > Despesas — alimentam o card "Contas a pagar".

## 9. Fora do escopo desta versão

- **Confirmação automática de paciente** (depende de canal estabelecido com paciente).
- **Emissão de recibo/NFS-e** — feature separada e planejada. Botão "Recibos" aparece com rótulo "em breve".
- **Integração Pix/cobrança automática** — futuro. Por ora, "Marcar paga" é registro manual.
- **App do paciente** — futuro. Cancelamento pelo paciente vira voz ou registro manual.

## 10. Métricas a acompanhar pós-lançamento

- **% de sessões registradas no mesmo dia** vs. dias depois (proxy de adoção da Operacional)
- **Adoção da voz:** % de psicólogos que usam ≥1 comando por semana
- **Taxa de abertura dos push notifications**
- **Mobile vs. desktop** na aba Operacional
- **Tempo médio entre fim da sessão e registro** (diminui se voz funciona bem)
- **% de meses fechados sem pendências** (proxy de "Operacional virou hábito")

## 11. Decisões adiadas

Itens conscientemente deixados para versões futuras, registrados para não se perderem:

- Visão consolidada da clínica (admin vendo todos os profissionais)
- Cobrança automática de inadimplentes via Pix
- Relatório fiscal completo para IR (depende de NFS-e)
- Categorização automática de despesa por voz com NLP fino
