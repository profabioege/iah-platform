# Persistência — IAH Educacional

Arquitetura de persistência e autenticação da plataforma: stack, camadas, estratégia multi-tenant, migrations, seeds e os critérios de ativação do modo real. Complementa [DOMAIN_MODEL.md](DOMAIN_MODEL.md) (o modelo conceitual que o schema materializa), [AUTHENTICATION.md](AUTHENTICATION.md) (fluxo de login) e [SUPABASE.md](SUPABASE.md) (passos de console). Decisões registradas em `DECISIONS.md` D-023 e D-041.

## Estado honesto desta fase

**O código do modo real está completo (M22); nenhuma credencial existe neste ambiente.** `DatabaseRepositories` (`modules/platform`), `LessonRepository` remoto (`modules/lesson`) e o provider `Credentials` do Auth.js estão implementados contra o schema versionado, mas **nunca foram exercitados contra um projeto Supabase real** — não há credenciais neste ambiente de desenvolvimento. A ativação e a validação ponta a ponta (login real, publicação/entrega/avaliação entre navegadores diferentes) ficam para quando o projeto Supabase existir — passo a passo em `SUPABASE.md`. Até lá, a Plataforma opera **inteiramente** em modo demonstração (seeds em memória + `localStorage`), sem nenhuma degradação.

## Dois modos, uma única flag

`isAuthConfigured()` (`src/lib/auth-flags.ts`) decide o modo da instância inteira — autenticação **e** persistência juntas, nunca uma sem a outra:

- **Modo REAL**: `AUTH_SECRET` + `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` **todas** definidas. Login por e-mail/senha (Auth.js Credentials, contra `users.password_hash`) ou Google (opcional, D-025); toda leitura/escrita passa pelo banco, via service role, sempre no servidor.
- **Modo DEMONSTRAÇÃO**: nenhuma das três definida. Institutional Workspace local simulado (M15) + seeds em memória + `localStorage` no dispositivo — exatamente como sempre foi.
- **Configuração PARCIAL nunca é aceita silenciosamente**: `getPlatformConfigError()` detecta um subconjunto das três variáveis definido e lança erro explícito ("defina também X, Y — ou remova todas para modo demonstração"). Nunca cai em seed por engano, nunca finge que o banco está pronto.

Componentes `"use client"` não enxergam essas três variáveis (não são `NEXT_PUBLIC_`) — quando precisam decidir entre chamar uma Server Action (real) ou a implementação local (`modules/lesson`), usam `isRealModeClient()`, que lê `NEXT_PUBLIC_IAH_REAL_MODE`, um espelho **só booleano** calculado em build time (`next.config.ts`).

## Escolha da stack: Supabase (PostgreSQL), sem Prisma

| Critério | Avaliação |
|---|---|
| **Supabase (escolhido)** | `@supabase/supabase-js` já instalado (zero dependência nova); PostgreSQL gerenciado, RLS nativa; integração direta com Vercel. |
| **Prisma (descartado)** | Codegen sem benefício no volume atual; os contratos de repositório isolam a implementação — trocar depois é só reescrever `database-repositories.ts`. |
| **PostgreSQL auto-hospedado (descartado)** | Custo operacional sem equipe. Supabase É PostgreSQL — migrar para um Postgres próprio no futuro é o mesmo SQL. |

## Postura de segurança (D-041): acesso exclusivamente server-side, RLS deny-by-default

- **O navegador nunca fala com o banco.** Todo acesso passa pelo servidor da aplicação (Server Components, Server Actions) usando a **service role key** (`getSupabaseAdminClient()`, `modules/platform/infrastructure/database/admin-client.ts`) — nunca a chave anônima, nunca exposta ao cliente.
- **RLS habilitada em TODAS as tabelas, sem nenhuma política permissiva** (migration `0005_production_foundation.sql`). As chaves anon/authenticated não leem nem escrevem nada; a service role ignora RLS por desenho do Postgres (é assim que o servidor consegue operar). A autorização por tenant/papel é aplicada na **camada de serviço**: todo contrato de repositório exige `institutionId` como primeiro parâmetro (regra de sempre, D-023), e cada Server Action deriva `institutionId`/`classroomId`/`studentId` da sessão autenticada — **nunca de um parâmetro vindo do cliente**.
- **Políticas RLS por tenant para acesso direto do navegador** ficam para quando (e se) esse acesso existir — política não exercida não é criada (mesmo princípio das queries especulativas, D-023). Hoje é um bloqueio de produção documentado, não uma lacuna escondida.

## Camadas

```
app/src/modules/platform/
├── domain/
│   ├── entities.ts                       ← 13 entidades multi-tenant (+ MissionReview, M22)
│   └── repositories.ts                   ← Contratos — todo método exige institutionId
├── services/
│   ├── indicator-service.ts              ← Indicadores: projeção calculada, nunca persistida
│   ├── import-service.ts                 ← Importação: preview + gravação via contratos
│   ├── mission-publishing-service.ts     ← Publicação de Mission numa Turma (M17)
│   ├── institutional-class-monitor.ts    ← Acompanhamento de turma (lê productions/reflections/reviews)
│   └── learning-cycle-service.ts         ← M22: produção/reflexão/avaliação — StudentWork sobre o banco
├── infrastructure/
│   ├── seed/seed-repositories.ts         ← implementação em memória (modo demonstração)
│   ├── database/supabase-client.ts       ← client com chave anônima (legado; Knowledge/Curriculum)
│   ├── database/admin-client.ts          ← client com service role (M22, único usado pelo núcleo)
│   ├── database/database-repositories.ts ← implementação real (M22), não exercitada ainda
│   ├── local/local-mission-assignment-store.ts ← espelho local M21, ativo só no modo demonstração
│   └── repository-factory.ts             ← Factory: seed × database, com gate de config parcial
├── seeds/demo-seed.ts                    ← dados de demonstração em memória (Seeds)
└── index.ts                              ← API pública do módulo

app/src/modules/lesson/infrastructure/database/lesson-actions.ts  ← M22: Server Actions da Lesson real
app/src/auth.config.ts / auth.ts          ← Auth.js: Credentials (banco) + Google opcional (D-025)
app/src/lib/password.ts                   ← hash scrypt (M22, zero dependência nova)
app/src/lib/auth-flags.ts                 ← isAuthConfigured / isRealModeClient / getPlatformConfigError

app/db/migrations/
├── 0001_initial_schema.sql       ← schema institucional inicial
├── 0002_classroom_sync_state.sql ← sincronização Google Classroom
├── 0003_identity.sql             ← users/profiles (Identidade & Acesso)
├── 0004_knowledge_engine.sql     ← Knowledge Engine
├── 0005_production_foundation.sql ← M22: password_hash, Lesson, MissionAssignment,
│                                     MissionReview real, RLS deny-by-default em tudo
└── 0006_assessment_diagnostic.sql ← LessonAssessment, questões, prazos,
                                      submissões e correção supervisionada

app/db/seed/seed-demo.mjs         ← M22: script explícito, popula o cenário Instituto Horizonte
                                      num projeto já migrado (nunca dentro de uma migration)
```

## Estratégia Multi-Tenant

1. **Instituição é a raiz** (`DOMAIN_MODEL.md`): toda tabela operacional tem `institution_id NOT NULL`.
2. **Isolamento lógico, não físico**, em três camadas: **contrato** (todo método de repositório exige `institutionId`), **query** (toda implementação filtra por ele) e **RLS** (deny-by-default desde a M22 — ver seção de segurança acima; políticas por tenant ficam para quando houver acesso client-side).
3. **Exceção deliberada**: `missions` não tem `institution_id` — catálogo global IAH (P2 do `DOMAIN_MODEL.md`).
4. **Indicadores não são tabela** — projeção calculada (`indicator-service.ts`).
5. **`Lesson` não carrega `institutionId` no tipo TypeScript** (deliberado, para não alterar um shape consumido por muitos componentes) — a coluna existe na tabela; o isolamento é aplicado nas Server Actions (`lesson-actions.ts`), que derivam a instituição da sessão antes de gravar/ler.

## Migrations

- SQL puro, versionado em `app/db/migrations/`, numeração sequencial. **Migrations nunca inserem dados** — schema e dados são ciclos de vida separados.
- Aplicar via SQL Editor do Supabase ou `supabase db push`, na ordem, num projeto novo.

## Estratégia de Seeds

Regra central: **dado fictício nunca é inserido por uma migration.**

- **Modo demonstração**: `app/src/modules/platform/seeds/demo-seed.ts` (+ `modules/lesson/seeds/demo-seed.ts`, `modules/workspace/seeds/institution-seed.ts`, `modules/assessment/seeds/demo-seed.ts`) — TypeScript rotulado, em memória. O Assessment não usa `localStorage` como fonte de verdade.
- **Modo real**: `app/db/seed/seed-demo.mjs` — script Node explícito e separado, executado deliberadamente contra um projeto Supabase já migrado (`IAH_DEMO_PASSWORD` fora do código). Idempotente (upsert por id); não grava progresso/entregas fictícias — a jornada pedagógica nasce limpa, preenchida pelo uso real.
- As duas fontes nunca se misturam: a factory entrega **ou** seeds **ou** banco.

## Critérios de ativação do modo real

1. [ ] Projeto Supabase criado.
2. [ ] Migrations `0001`–`0006` aplicadas, na ordem.
3. [ ] `AUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` definidas em `app/.env.local` e na Vercel — as **três**, nunca um subconjunto (`getPlatformConfigError()` recusa configuração parcial).
4. [ ] `node db/seed/seed-demo.mjs` executado com `IAH_DEMO_PASSWORD` definida, para o cenário de demonstração existir no banco (opcional — só necessário se o ambiente publicado deve manter contas fictícias).
5. [ ] Login validado (Credentials, com uma conta do seed ou uma inserida manualmente).
6. [ ] Jornada completa validada entre navegadores/dispositivos diferentes (publicar → aluno vê/entrega → professor avalia → aluno vê devolutiva → gestor vê indicadores) — **ainda não executado neste projeto**, é o próximo bloqueador real.
7. [ ] Políticas RLS por tenant, se/quando existir acesso direto do navegador ao banco (hoje não existe).

## Fluxo de dados (visão de ponta a ponta)

```
MODO DEMONSTRAÇÃO (sem as 3 variáveis):
  UI → stores locais (localStorage / seeds em memória)

MODO REAL (as 3 variáveis definidas):
  UI (Server Component) → repository-factory → DatabaseRepositories
      → Supabase/PostgreSQL, via service role (RLS deny-by-default)
  UI (Client Component) → Server Action (deriva institutionId da sessão)
      → learning-cycle-service / lesson-actions → mesma trilha acima
  Importação: ImportProvider (manual/csv/google/microsoft/moodle/api)
      → ImportService.preview → revisão humana → ImportService.import
```
