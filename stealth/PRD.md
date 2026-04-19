# Psi (Documento Técnico + PRD Consolidado v1)

**Versão:** Abril 2026 
**Stack definitivo:** SvelteKit + Supabase + Redis (Upstash) + ElevenLabs (TTS)  
**Atualizações desta versão:**  
- Adicionadas **três interfaces** do sistema (conforme solicitação)  
- Suporte a voz no Assistente de IA (ElevenLabs TTS)  
- Camada de logging para chamadas de LLM e TTS  
- Workspace “Clínica” obrigatório  
- Dark mode nativo  
- LLM interface genérica (OpenAI-compatible)  

---

### 1. Visão Geral

Psi é uma plataforma SaaS completa para gestão de clínicas de psicologia. Oferece **três interfaces distintas** para atender psicólogos, pacientes e o operador da plataforma.

**Proposta de valor:**  
Eliminar planilhas, automatizar burocracia, proporcionar interação por voz com IA e manter total conformidade LGPD — tudo em uma experiência multirole.

---

### 2. Usuários e Interfaces do Sistema (Atualizado)

O Psi possui **três interfaces** claramente separadas:

#### 2.1 Interface 1 — Psicólogo (Principal)
- Interface web responsiva completa (SvelteKit).
- Acesso total: cadastro de pacientes, histórico, finanças, assistente de IA com voz, configurações da clínica, Google Calendar sync.
- Autenticação via Google OAuth + Row Level Security (RLS) por `clinic_id`.

#### 2.2 Interface 2 — Paciente
- **Sem login direto no Psi**.
- O paciente interage exclusivamente através do **Google Calendar**.
- O Psi cria/atualiza automaticamente eventos no calendário do psicólogo, que são visíveis no calendário do paciente (sincronização bidirecional).
- O paciente recebe lembretes, visualiza horários confirmados e pode responder a convites diretamente no Google Calendar.
- Nenhum dado clínico sensível é exposto ao paciente.

#### 2.3 Interface 3 — Admin / Operador da Plataforma
- Interface administrativa interna (acesso restrito ao operador do serviço).
- Permite visualizar:
  - Logs completos de uso de IA e TTS (`ai_usage_logs`)
  - Relatórios financeiros da plataforma (receita por plano, churn, MRR, etc.)
  - Status geral dos tenants (clínicas)
  - Auditoria LGPD e métricas de uso
- Acesso via role `admin` no Supabase Auth (separado do RLS dos psicólogos).

**Persona Principal (Psicólogo):** Dra. Renata Oliveira  
**Persona Secundária (Paciente):** Paciente final que só interage via Google Calendar  
**Usuário Interno (Admin):** Operador da Psi (você)

---

### 3. Funcionalidades do Produto (Atualizado)

#### 3.6 Assistente de IA
- Chat em tempo real com contexto dinâmico.
- **Modo Voz** completo: Speech-to-Text + ElevenLabs TTS (resposta falada).
- Logging de todas as chamadas (LLM e TTS).

#### 3.9 Interfaces do Sistema
- Interface Psicólogo: web responsiva completa.
- Interface Paciente: Google Calendar (somente visualização e interação via eventos).
- Interface Admin: dashboard interno com logs e relatórios financeiros.

#### 3.11 Logging de Uso de IA e TTS
- Tabela `ai_usage_logs` para monitoramento de custos.
- Disponível tanto para o psicólogo (relatório pessoal) quanto para o Admin (relatório global da plataforma).

---

### 4. Requisitos por Prioridade (Atualizado)

| Funcionalidade                              | Prioridade | Status MVP | Versão |
|---------------------------------------------|------------|------------|--------|
| Interface Psicólogo (web responsiva)        | Alta       | Incluído   | v1.0   |
| Interface Paciente (via Google Calendar)    | Alta       | Incluído   | v1.2   |
| Interface Admin (logs + relatórios)         | Alta       | Incluído   | v1.1   |
| Assistente IA com voz (ElevenLabs)          | Alta       | Incluído   | v1.1   |
| Workspace Clínica (obrigatório)             | Alta       | Incluído   | v1.0   |

---

### 7. Arquitetura Técnica (Atualizado)

**Roles e Permissões (Supabase Auth + RLS)**
- `psychologist` → RLS por `clinic_id`
- `patient` → sem acesso direto (somente Google Calendar)
- `admin` → role global com acesso total a logs e relatórios

**Nova tabela para suporte ao Admin:**
```sql
CREATE TABLE platform_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type TEXT NOT NULL,        -- 'revenue', 'ai_usage', 'churn', etc.
    data JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Componentes de interface:**
- Rotas protegidas: `/app/*` → Psicólogo
- Rotas admin: `/admin/*` → protegidas por role `admin`
- Google Calendar: sincronização via server actions (sem interface dedicada para paciente)

**Dark mode:** Nativo em todas as interfaces.

---

### 8. Plano de Implementação (Atualizado)

1. Workspace “Clínica” + roles (psychologist / admin)
2. Interface Psicólogo completa
3. Interface Admin (logs + relatórios financeiros)
4. Integração ElevenLabs TTS + logging
5. Sincronização bidirecional Google Calendar (Interface Paciente)
6. Dark mode + exportações PDF/CSV
7. Testes de RLS por role
8. Deploy na Vercel

---

**Observação final:**  
O sistema agora tem **três interfaces** claramente definidas:  
1. Psicólogo → web responsiva completa  
2. Paciente → Google Calendar (atualização automática)  
3. Admin/Operador → dashboard interno de logs e relatórios financeiros  

Essa estrutura mantém o foco no psicólogo como usuário principal, mas já prepara a plataforma para operação escalável e monetização.

**Documento gerado em Abril/2026.**  
