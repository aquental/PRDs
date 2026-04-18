# Psi - Plataforma SaaS para Clínicas de Psicologia

Psi é uma plataforma completa para gerenciar clínicas de psicologia. O objetivo é oferecer uma experiência **intuitiva, fácil de usar**, leve e altamente segura, com foco na privacidade dos dados (LGPD).

**Stack Tecnológico Escolhido:**

- **SvelteKit** — Framework full-stack (melhor DX, bundles menores e desempenho superior)
- **Supabase** — Backend (PostgreSQL gerenciado + Auth + Realtime + Storage)
- **Redis** (Upstash recomendado) — Cache, sessões rápidas e estado do chat omnichannel
- Design responsivo com tema orgânico terroso

Essa combinação proporciona excelente velocidade de desenvolvimento, performance nativa (sem Virtual DOM) e custos controlados.

## Funcionalidades Principais

### Aplicativo e Design

- Design totalmente responsivo (desktop, tablet e celular)
- Tema visual orgânico e terroso (tons de areia quente, verde sálvia e terracota)
- Tipografia: **Manrope** para títulos e **Figtree** para textos
- Cores principais:
  - Fundo claro: `#FDFBF7`
  - Primária: `#5B7B7A`
  - Secundária: `#D4A373`
- Interface flat (sem glassmorphism), superfícies sólidas
- Ícones: `@phosphor-icons/react` (ou `@phosphor-icons/svelte`)
- Todos os elementos interativos devem conter `data-testid`

### Autenticação e Integrações

- Login com Google (Supabase Auth + Google OAuth)
- Integração com Google Calendar (via Edge Functions ou server actions)
- Supabase Realtime para atualizações ao vivo (agenda, notificações)
- Cache e sessões rápidas no Redis

### Dados da Psicóloga (Therapist)

- Nome, CRP, CNPJ, CPF, Endereço, Foto de perfil

### Gerenciamento de Pacientes

- Contato (nome, telefone, endereço, email)
- Contatos de familiares (JSONB)
- Dados para Nota Fiscal (CPF, endereço, telefone, email)

### Histórico do Paciente

- Frequência, valor da consulta, sessões por mês
- Registro completo de sessões (data, duração, valor, notas)

### Módulo Financeiro

- Projeção de receita e custos
- Lista de pacientes com valores

### Interface Conversacional

- Chat com LLM
- Omnichannel (continuar no Telegram) — estado no Redis + Supabase Realtime

### Segurança e LGPD

- Criptografia de dados sensíveis com `pgcrypto`
- Row Level Security (RLS) no Supabase
- Sinalização clara de proteção de dados

## Estrutura de Pastas Recomendada (SvelteKit)

```
psi/
├── src/
│   ├── lib/
│   │   ├── supabase/          # Clients Supabase (server + browser)
│   │   ├── redis.ts           # Configuração Redis
│   │   ├── components/        # Componentes reutilizáveis (PatientCard, SessionForm, etc.)
│   │   ├── utils/             # Funções auxiliares (formatCurrency, encrypt, etc.)
│   │   └── server/            # Server-only logic (actions, load functions)
│   ├── routes/
│   │   ├── (auth)/            # Rotas protegidas por auth
│   │   │   ├── dashboard/
│   │   │   ├── patients/
│   │   │   │   ├── +page.svelte
│   │   │   │   ├── +page.server.ts     # Load + actions CRUD
│   │   │   │   └── [patientId]/
│   │   │   ├── sessions/
│   │   │   ├── finance/
│   │   │   └── +layout.svelte          # Layout com sidebar
│   │   ├── login/
│   │   ├── auth/callback/     # Callback do Google OAuth
│   │   └── +layout.svelte
│   ├── hooks.server.ts        # Hooks para auth e RLS
│   └── app.html
├── static/                    # Assets estáticos
├── supabase/                  # Configurações e migrations (opcional)
├── .env                       # Variáveis: SUPABASE_URL, SUPABASE_ANON_KEY, UPSTASH_REDIS_URL, etc.
├── svelte.config.js
├── vite.config.ts
└── package.json
```

## Integração com Supabase

Instale as dependências:

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-sveltekit
```

### src/lib/supabase/client.ts (Browser)

```ts
import { createBrowserClient } from "@supabase/auth-helpers-sveltekit";

export const supabase = createBrowserClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

### src/lib/supabase/server.ts (Server)

```ts
import { createServerClient } from "@supabase/auth-helpers-sveltekit";
import type { RequestEvent } from "@sveltejs/kit";

export const createSupabaseServerClient = (event: RequestEvent) => {
  return createServerClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (key) => event.cookies.get(key),
        set: (key, value, options) => event.cookies.set(key, value, options),
        remove: (key, options) => event.cookies.delete(key, options),
      },
    },
  );
};
```

### Hooks de Auth (src/hooks.server.ts)

```ts
import { sequence } from "@sveltejs/kit/hooks";
import { createSupabaseServerClient } from "$lib/supabase/server";

export const handle = sequence(async ({ event, resolve }) => {
  const supabase = createSupabaseServerClient(event);
  event.locals.supabase = supabase;
  event.locals.session = await supabase.auth.getSession();

  return resolve(event);
});
```

## Integração com Redis (Upstash recomendado)

```bash
npm install @upstash/redis
```

### src/lib/redis.ts

```ts
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: import.meta.env.UPSTASH_REDIS_REST_URL,
  token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
});

// Exemplo de uso: cache de dashboard
export async function getCachedDashboard(therapistId: string) {
  const key = `dashboard:${therapistId}`;
  return await redis.get(key);
}

export async function setCachedDashboard(
  therapistId: string,
  data: any,
  ttl = 300,
) {
  const key = `dashboard:${therapistId}`;
  await redis.set(key, data, { ex: ttl });
}
```

## Exemplos de Código – Pacientes e Sessões

### +page.server.ts (src/routes/(auth)/patients/+page.server.ts)

```ts
import { createSupabaseServerClient } from "$lib/supabase/server";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async (event) => {
  const supabase = createSupabaseServerClient(event);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw redirect(303, "/login");

  const { data: patients } = await supabase
    .from("patients")
    .select("*")
    .eq("therapist_id", session.user.id)
    .order("name");

  return { patients };
};

export const actions: Actions = {
  create: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const formData = await event.request.formData();

    const { error } = await supabase.from("patients").insert({
      therapist_id: (await supabase.auth.getUser()).data.user?.id,
      name: formData.get("name"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      cpf: formData.get("cpf"),
      relatives: JSON.parse(formData.get("relatives") || "[]"),
    });

    if (error) return fail(400, { error: error.message });
    return { success: true };
  },
};
```

### Exemplo de componente de Sessão (+page.svelte simplificado)

```svelte
<script lang="ts">
  import { supabase } from '$lib/supabase/client';
  import { redis } from '$lib/redis';

  let sessions = $state([]);

  async function loadSessions(patientId: string) {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });
    sessions = data || [];
  }
</script>

<!-- Tabela de sessões com Phosphor Icons -->
```

## Configurações Recomendadas

- **Supabase**: Plano **Pro** ($25/mês base). Ativar RLS em todas as tabelas, Realtime nas tabelas `sessions` e `patients`, usar Vault para chaves de criptografia.
- **Redis**: Upstash (serverless, edge-compatible).
- **Deploy**: Vercel (ótimo suporte a SvelteKit + Edge Functions).

## Plano de Implementação

1. Criar projeto SvelteKit (`npm create svelte@latest psi`)
2. Configurar Supabase (Auth Google + tabelas + RLS)
3. Instalar e configurar Redis (Upstash)
4. Implementar estrutura de pastas e clients Supabase/Redis
5. Desenvolver rotas protegidas (dashboard, patients, sessions, finance)
6. Implementar interface com tema earthy e ícones Phosphor
7. Adicionar chat omnichannel + cache Redis
8. Configurar criptografia de dados sensíveis
9. Testar performance, segurança e LGPD
10. Deploy na Vercel

---

**Observação:** SvelteKit foi escolhido por oferecer maior facilidade de desenvolvimento, bundles menores e melhor desempenho em comparação com Next.js, tornando a Psi mais leve e agradável para a psicóloga.

Documento gerado em abril/2026.
