# Autenticação — IAH Educacional

Login com Google (Auth.js v5), sessão persistente, middleware de rotas privadas e provisionamento automático do primeiro usuário real (o fundador, professor do Colégio Beryon). Complementa [SUPABASE.md](SUPABASE.md) (banco), [PERSISTENCE.md](PERSISTENCE.md) e [GOOGLE_WORKSPACE.md](GOOGLE_WORKSPACE.md). Decisão registrada em `DECISIONS.md` D-025.

## Estado honesto desta fase

**O código está completo; as credenciais não existem ainda.** Criar o projeto no Google Cloud e o projeto Supabase são ações nos seus consoles, com a sua conta — o passo a passo está abaixo e em `SUPABASE.md`. Sem as variáveis de ambiente, a Plataforma opera exatamente como antes (modo demonstração, acesso direto); com elas, o login Google passa a valer automaticamente, sem nenhuma mudança de código. O fluxo autenticado ainda **não foi validado ponta a ponta** — será, no primeiro login real.

## Arquitetura

```
src/lib/auth-flags.ts        ← isAuthConfigured() (edge-safe, decide demo × real)
src/auth.config.ts           ← config edge-safe (provider Google, callback authorized)
src/auth.ts                  ← config completa (signIn/jwt/session + provisionamento)
src/middleware.ts            ← proteção de /dashboard, /missoes, /diario, /professor
src/app/api/auth/[...]       ← endpoints do Auth.js (login/logout/callback)
src/modules/identity/        ← contexto Identidade & Acesso (provisionamento)
modules/integrations/auth/   ← contrato AuthProvider (D-019) + authJsAuthProvider real
components/layout/session-controls.tsx ← "Sair" no header (só com sessão ativa)
```

- **Toda autenticação passa pelo contrato `AuthProvider`** (`getAuthProvider()`): real com credenciais, simulado sem — nenhum componente importa `next-auth` diretamente.
- **Sessão: JWT** (cookie assinado, persistente entre visitas). Por isso **não há tabela de sessões** — ela só existe na estratégia "database" do Auth.js; criar uma tabela morta seria pior que documentar a escolha (D-025). Papel e instituição viajam no token.
- **Config dividida em duas** (`auth.config.ts` × `auth.ts`): o middleware roda no edge e não pode carregar supabase-js; o provisionamento (Node) fica só na config completa, via import dinâmico.

## Fluxo do primeiro login

```
Entrar com Google → allowlist (AUTH_ALLOWED_EMAILS)
  → criar Usuário (users)
  → criar Professor (teachers, ligado ao usuário)
  → criar Perfil professor (profiles)
  → associar à Instituição (AUTH_DEFAULT_INSTITUTION_SLUG)
  → redirecionar ao Dashboard
```

Tudo automático e idempotente (logins seguintes só atualizam `last_login_at`). Regras de segurança deliberadas:

- **Allowlist fechada por padrão**: sem `AUTH_ALLOWED_EMAILS`, nenhum login é aceito — sem ela, qualquer conta Google do mundo entraria.
- **A Instituição nunca é criada automaticamente**: a linha do Colégio Beryon é inserida por você (`SUPABASE.md`); se o slug não existir, o login é negado com erro claro em vez de criar um tenant fantasma.
- **Falha de provisionamento nega o login** (não cria sessão sem persistência — o critério da Sprint é ser reconhecido E persistido).

## Middleware (rotas privadas)

`/dashboard`, `/missoes`, `/diario`, `/professor` (e subrotas) exigem sessão **quando a autenticação está configurada**; sem configuração, passam livres (demo). Landing, `/demonstracao` e `/entrar` são sempre públicas. O redirecionamento para `/entrar` é automático (callback `authorized`).

## Logout

Botão "Sair" no header da Plataforma (com nome do usuário), renderizado apenas com sessão ativa. Encerra a sessão e volta a `/entrar`.

## Como ativar (seus ~15 minutos de console)

1. **Google Cloud** (detalhes em `GOOGLE_WORKSPACE.md`): criar projeto → tela de consentimento OAuth → credencial "Aplicação Web" com redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://iah-platform.vercel.app/api/auth/callback/google` (produção)
   - Adicionar seu e-mail como test user enquanto o app não é verificado.
2. **Supabase**: seguir `SUPABASE.md` (criar projeto, aplicar migrations 0001–0003, inserir a linha da sua Instituição).
3. **Variáveis** em `app/.env.local` e no painel da Vercel (nomes em `app/.env.example`): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` (gere com `npx auth secret`), `AUTH_ALLOWED_EMAILS` (seu e-mail), `AUTH_DEFAULT_INSTITUTION_SLUG`, e as três do Supabase.
4. Redeploy na Vercel → entrar com sua conta Google → conferir no Supabase as linhas criadas em `users`, `teachers` e `profiles`.

**Nota:** ao definir `GOOGLE_CLIENT_ID/SECRET`, o card "Integrações" do Painel do Professor passa a mostrar "Conectado" e o Import Wizard tenta o serviço real do Classroom (que segue stub até a próxima Sprint) — a lista de turmas aparece vazia em vez de simulada. Comportamento esperado nesta fase.

## O que esta Sprint NÃO fez (por decisão)

- Nenhuma chamada à Google Classroom API (próxima Sprint, sobre `GOOGLE_CLASSROOM_INTEGRATION.md`).
- Nenhum mock removido: todos continuam necessários para o modo demonstração e desenvolvimento sem credenciais — a aposentadoria segue o checklist de `PERSISTENCE.md`, página a página.
- Papéis além de `professor` não são provisionados automaticamente (aluno/gestor entram em Sprints futuras, via importação/convite).
