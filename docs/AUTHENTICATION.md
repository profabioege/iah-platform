# Autenticação — IAH Educacional

Login institucional, sessão, gates por papel e os dois modos de operação da instância. Complementa [SUPABASE.md](SUPABASE.md) (banco), [PERSISTENCE.md](PERSISTENCE.md) (persistência) e [GOOGLE_WORKSPACE.md](GOOGLE_WORKSPACE.md) (credenciais Google). Decisões em `DECISIONS.md` D-025 e D-041.

> **Documento reescrito.** A versão anterior descrevia apenas o login Google e o provisionamento automático do professor do Colégio Beryon, como se fosse o único caminho. Desde a M22 o caminho principal é **e-mail + senha (Auth.js Credentials) contra o banco**; o Google é opcional e pode nunca ser configurado.

## Dois modos, uma única flag

`isAuthConfigured()` ([auth-flags.ts](../app/src/lib/auth-flags.ts)) decide o modo da instância inteira — autenticação **e** persistência juntas, nunca uma sem a outra:

| | Modo REAL | Modo DEMONSTRAÇÃO |
|---|---|---|
| Ativa quando | `AUTH_SECRET` + `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` definidas | nenhuma das três definida |
| Login | Auth.js Credentials contra `users.password_hash` (scrypt) | seed em memória, senha única |
| Senha na tela `/entrar` | **não aparece** | aparece (é uma barreira de demonstração, não segurança) |
| Sessão | JWT assinado (`platformUserId`, `institutionId`, `role`) | cookie httpOnly com o id do usuário |
| Dados | Supabase/PostgreSQL, server-side, service role | seeds em memória + `localStorage` |
| Entre navegadores | ✅ sincroniza | ❌ cada navegador é uma ilha |

Configuração **parcial** nunca é aceita: `getPlatformConfigError()` devolve um diagnóstico nomeando o que falta, e as telas o exibem. Nunca há fallback silencioso para seed.

## Arquitetura

```
src/lib/auth-flags.ts        ← isAuthConfigured() (edge-safe, decide demo × real)
src/lib/password.ts          ← hash scrypt (zero dependência nova)
src/auth.config.ts           ← config edge-safe (providers, callback authorized)
src/auth.ts                  ← config completa (Credentials + Google + provisionamento)
src/middleware.ts            ← gates por papel em todas as rotas da Plataforma
src/app/entrar/page.tsx      ← tela única de login (papel nunca é escolhido)
src/modules/workspace/       ← sessão, contexto pedagógico, permissões
src/modules/identity/        ← provisionamento no primeiro login Google
```

- **O papel nunca é escolhido na tela.** Ele vem do vínculo persistido (`profiles.role`) e determina a rota inicial.
- **Config dividida em duas** (`auth.config.ts` × `auth.ts`): o middleware roda no edge e não pode carregar `supabase-js`; o provisionamento (Node) só existe na config completa, via import dinâmico.

## Login por e-mail e senha (caminho principal)

```
/entrar → Auth.js Credentials → users.password_hash (scrypt) → profiles.role
       → roleHome(role) → rota inicial do papel
```

Não há autoprovisionamento por senha: a conta precisa existir no banco. Para o ambiente demonstrativo, as contas são criadas pelo script de seed (`SUPABASE.md`, seção 4).

## Login com Google (opcional)

Só existe se `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `AUTH_SECRET` estiverem definidas. No primeiro login provisiona Usuário → Professor → Perfil → Instituição, de forma idempotente. Regras deliberadas:

- **Allowlist fechada por padrão** (`AUTH_ALLOWED_EMAILS`): sem ela, nenhum login Google é aceito — do contrário qualquer conta Google do mundo entraria.
- **A Instituição nunca é criada automaticamente**: se `AUTH_DEFAULT_INSTITUTION_SLUG` não existir no banco, o login é negado com erro claro em vez de criar um tenant fantasma.
- **Falha de provisionamento nega o login**: não se cria sessão sem persistência.

**No ambiente demonstrativo, o Google fica desconfigurado de propósito.** Menos superfície, menos console, e o cenário fictício não deve aceitar contas Google reais.

## Papéis, rotas e gates

`roleHome()` ([workspace-context.ts](../app/src/modules/workspace/domain/workspace-context.ts)) e o middleware são as duas únicas fontes:

| Papel (Workspace) | `profiles.role` | Rota inicial | Bloqueado de |
|---|---|---|---|
| `admin` | `administrador` / `admin_iah` | `/gestor` | — |
| `teacher` | `professor` | `/professor` | `/gestor` |
| `student` | `aluno` | `/dashboard` | `/gestor`, `/professor` |

Rotas protegidas pelo matcher: `/dashboard`, `/missoes`, `/diario`, `/professor`, `/gestor` (e subrotas). Landing, `/demonstracao` e `/entrar` são sempre públicas. Sem sessão, qualquer rota protegida redireciona a `/entrar`.

**O gate de rota é a primeira camada, não a única.** Toda Server Action revalida no servidor: recusa `role === "student"` para ações pedagógicas e confere se a turma informada pertence ao contexto do usuário. `institutionId`, `classroomId` e `studentId` são **sempre** derivados da sessão — nunca aceitos como parâmetro do cliente (D-041).

## Escopo de dados por papel

`getWorkspaceContext()` aplica o escopo **no servidor**, antes de qualquer tela renderizar:

- **aluno** → só as turmas em que está matriculado (`enrollments`);
- **professor** → só as turmas que leciona (`classroom_teachers`);
- **admin** → todas as turmas da própria instituição.

Nenhum papel enxerga outra instituição: `institution_id` é filtro obrigatório em todo contrato de repositório (D-023).

## Logout

Botão "Sair" no header da Plataforma, renderizado apenas com sessão ativa. Encerra a sessão e volta a `/entrar`.

## Limites honestos do modo demonstração

Sem as três variáveis, a sessão é um cookie com o id do usuário em texto puro e a senha é uma constante versionada, exibida na tela de login. Isso é uma **barreira de apresentação, não autenticação**. Qualquer ambiente que possa receber uma pessoa de fora — inclusive o ambiente demonstrativo publicado — deve rodar em modo real.
