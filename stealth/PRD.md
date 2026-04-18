# Psi - Documento de Requisitos de Produto + Especificação Técnica (PRD v1.1 + Tech Spec)

**Versão:** 1.2 (Atualizado com respostas do usuário)  
**Data:** Abril 2026  
**Stack definitivo:** SvelteKit + Supabase + Redis (Upstash)  
**Documento gerado a partir de:** psi-prd-v1.docx + IDEA.md (IDEA.md prevalece em todos os pontos técnicos)

---

### 0. Resumo de Atualizações (Gaps Fechados)

- LLM: Interface genérica compatível com OpenAI (pode trocar de provedor depois).
- Agenda: Tela de listagem de agendas existe; edição sempre via Google Calendar (sincronização bidirecional).
- Exportações: Relatórios em PDF e CSV (formato mais simples possível).
- Pagamentos: Pagar.me (flexível para futura troca).
- Multi-usuário: Mesmo para usuário individual, criar uma “Clínica” (workspace) desde o início.
- Dark mode: Incluído no design system desde já.

---

### 1. Visão Geral

#### 1.1 Resumo Executivo
O **Psi** é uma plataforma SaaS completa para gestão de clínicas de psicologia. Centraliza cadastro de pacientes, histórico clínico, finanças, conformidade LGPD e um assistente de IA omnichannel (web + Telegram).

**Proposta de valor:**  
Eliminar planilhas e ferramentas fragmentadas, automatizar a burocracia e permitir que o psicólogo foque no cuidado clínico.

#### 1.2 Problema
- Cadastros dispersos
- Histórico desestruturado
- Visibilidade financeira limitada
- Riscos LGPD
- Agenda desconectada
- IA restrita ao navegador

#### 1.3 Objetivos
1. Gestão centralizada de pacientes (contato, familiares, dados fiscais)
2. Histórico completo de sessões
3. Painel financeiro com projeções
4. Dados profissionais + Clínica (workspace)
5. Integração bidirecional Google Calendar
6. Conformidade LGPD ativa (criptografia + indicadores visuais)
7. Assistente IA omnichannel

#### 1.4 Métricas de Sucesso
- Ativação: ≥ 70% em < 5 min
- Retenção D30: ≥ 60%
- NPS: ≥ 50 em 3 meses
- Churn mensal: < 5%

---

### 2. Usuários e Personas

#### 2.1 Persona Principal
**Dra. Renata Oliveira** – 32 anos, psicóloga autônoma, atende 8–12 pacientes/semana.

#### 2.2 Modelo de Clínica
Mesmo para usuário individual, o sistema cria automaticamente uma **Clínica** (workspace). Isso prepara o caminho para multi-usuário futuro (admin, psicólogo, recepcionista).

---

### 3. Funcionalidades do Produto

#### 3.1 Autenticação e Integrações
- Login exclusivo com Google (Supabase Auth)
- Integração Google Calendar (v1.2): sincronização bidirecional completa

#### 3.2 Gestão de Pacientes
- Nome, telefone, endereço, e-mail, status, data de início
- Contatos familiares (JSONB)
- Dados fiscais completos

#### 3.3 Histórico do Paciente
- Sessões mensais, frequência, valor, totais automáticos

#### 3.4 Finanças
- Receita, custos editáveis, lucro, projeção anual
- Gráficos e tabelas

#### 3.5 Configurações
- Dados do psicólogo + **Clínica** (nome, logo, configurações compartilhadas)

#### 3.6 Assistente de IA
- Interface genérica compatível com OpenAI (fácil troca de LLM no futuro)
- Contexto dinâmico de pacientes e finanças
- Omnichannel (web ↔ Telegram)

#### 3.7 LGPD e Privacidade
- Criptografia AES-256-GCM em colunas sensíveis (`pgcrypto` + Supabase Vault)
- Indicadores visuais (cadeado verde, badge “Criptografado”)
- Termo de consentimento (PDF), portabilidade (JSON/CSV), direito ao esquecimento

#### 3.8 Omnichannel – Telegram
- Vinculação via QR Code + OTP
- Sessão compartilhada (histórico de 7 dias)
- Comandos rápidos e notificações

#### 3.9 Agenda (Nova)
- Tela dedicada de listagem de agendas (mesclando sessões do Psi + eventos do Google Calendar)
- Edição e criação de sessões sempre feita no Google Calendar (sincronização automática)

#### 3.10 Exportações
- Relatórios financeiros, histórico de pacientes e termos de consentimento em **PDF** e **CSV** (geração mais simples possível)

---

### 4. Requisitos por Prioridade (Status MVP)

| Funcionalidade                        | Prioridade | Status MVP | Versão |
|---------------------------------------|------------|------------|--------|
| Login Google + Clínica (workspace)    | Alta       | Incluído   | v1.0   |
| Cadastro de pacientes + NF            | Alta       | Incluído   | v1.0   |
| Histórico e finanças                  | Alta       | Incluído   | v1.0   |
| LGPD completa                         | Alta       | Incluído   | v1.1   |
| Assistente IA (genérico OpenAI)       | Média      | Incluído   | v1.0   |
| Google Calendar + tela de agendas     | Alta       | Roadmap    | v1.2   |
| Bot Telegram                          | Média      | Roadmap    | v1.2   |
| Exportações PDF/CSV                   | Média      | Roadmap    | v1.3   |

---

### 5. Requisitos Não Funcionais
- Dark mode nativo desde o início
- Responsivo (desktop, tablet, celular)
- Performance: LCP < 2s, APIs < 300 ms
- Segurança: RLS + criptografia + HTTPS/TLS 1.3

---

### 6. Modelo de Monetização
**Freemium** (Pagar.me como gateway atual – configuração flexível para troca futura)

| Funcionalidade               | Free          | Pro (R$ 79/mês) | Clínica (R$ 199/mês) |
|------------------------------|---------------|-----------------|----------------------|
| Pacientes ativos             | Até 5         | Ilimitado       | Ilimitado            |
| Histórico                    | 6 meses       | Ilimitado       | Ilimitado            |
| Google Calendar + Telegram   | —             | Incluído        | Incluído             |
| Assistente IA                | 50 msgs/mês   | Ilimitado       | Ilimitado            |
| Suporte                      | Comunidade    | E-mail          | Prioritário          |

- Trial 14 dias sem cartão
- Upsell automático no 6º paciente

---

### 7. Arquitetura Técnica (IDEA.md atualizado)

**Stack**
- **Full-stack:** SvelteKit
- **Banco:** Supabase (PostgreSQL + Auth + Realtime + Storage + Vault)
- **Cache/Omnichannel:** Redis (Upstash)
- **Design:** Tema earthy + **Dark mode** (cores claras e escuras)
- **LLM:** Interface genérica OpenAI-compatible
- **Pagamentos:** Pagar.me (configurável)
- **Exportações:** PDF/CSV (bibliotecas leves no server-side)

**Estrutura de pastas** (mantida do IDEA.md com adições):
- `src/routes/(auth)/agenda/` → nova rota de listagem
- `src/lib/clinic.ts` → lógica de workspace
- `src/lib/llm.ts` → interface genérica OpenAI

**Dark mode no design**
- Fundo claro: `#FDFBF7` / escuro: `#1A1A1A`
- Primária: `#5B7B7A` (mantida)
- Secundária: `#D4A373` (mantida)
- Suporte via `class="dark"` no `<html>` e Tailwind/Svelte

---

### 8. Roadmap de Produto (Atualizado)

- **v1.1** — LGPD + Dark mode + workspace Clínica (concluído)
- **v1.2** — Google Calendar + tela de agendas + Telegram
- **v1.3** — Exportações PDF/CSV + agenda própria (fallback)
- **v2.0** — Prontuário eletrônico + multi-usuário completo

---

**Documento final consolidado.**  
Tudo que estava no PRD original foi mantido. Tudo que estava no IDEA.md (mais recente) prevaleceu. Todas as suas respostas de hoje foram incorporadas.

**Próximos passos que posso gerar agora:**
1. Schema SQL completo com `clinics` / workspaces + RLS atualizado
2. Código de exemplo da tela de Agenda
3. Interface LLM genérica (arquivo `lib/llm.ts`)
4. Configuração Pagar.me flexível
5. Componentes de Dark mode

É só dizer qual quer primeiro!  
Quer que eu gere o arquivo **IDEA3.md** com tudo isso pronto para download?
