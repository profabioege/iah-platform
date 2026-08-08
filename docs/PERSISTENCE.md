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
└── 0005_production_foundation.sql ← M22: password_hash, Lesson, MissionAssignment,
                                      MissionReview real, RLS deny-by-default em tudo

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

- **Modo demonstração**: `app/src/modules/platform/seeds/demo-seed.ts` (+ `modules/lesson/seeds/demo-seed.ts`, `modules/workspace/seeds/institution-seed.ts`) — TypeScript rotulado, em memória.
- **Modo real**: `app/db/seed/seed-demo.mjs` — script Node explícito e separado, executado deliberadamente contra um projeto Supabase já migrado (`IAH_DEMO_PASSWORD` fora do código). Idempotente (upsert por id); não grava progresso/entregas fictícias — a jornada pedagógica nasce limpa, preenchida pelo uso real.
- As duas fontes nunca se misturam: a factory entrega **ou** seeds **ou** banco.

## Critérios de ativação do modo real

1. [ ] Projeto Supabase criado.
2. [ ] Migrations `0001`–`0005` aplicadas, na ordem.
3. [ ] `AUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` definidas em `app/.env.local` e na Vercel — as **três**, nunca um subconjunto (`getPlatformConfigError()` recusa configuração parcial).
4. [ ] `node db/seed/seed-demo.mjs` executado com `IAH_DEMO_PASSWORD` definida, para o cenário de demonstração existir no banco (opcional — só necessário se o ambiente publicado deve manter contas fictícias).
5. [ ] Login validado (Credentials, com uma conta do seed ou uma inserida manualmente).
6. [ ] Jornada completa validada entre navegadores/dispositivos diferentes (publicar → aluno vê/entrega → professor avalia → aluno vê devolutiva → gestor vê indicadores) — **ainda não executado neste projeto**, é o próximo bloqueador real. A matriz abaixo é o roteiro dessa validação.
7. [ ] Políticas RLS por tenant, se/quando existir acesso direto do navegador ao banco (hoje não existe).

## Matriz manual de validação dos quatro perfis

O que os testes automatizados já cobrem: papel → rota inicial, gates de rota (3 papéis × 5 prefixos), corte de turmas por matrícula, recusa das Server Actions e ausência de dado real nos seeds (`app/tests/workspace-*.test.mjs`, `platform-*.test.mjs`, `demo-seed-privacy.test.mjs`).

O que **só** a validação manual cobre — e por isso esta matriz existe: **sincronismo entre navegadores**. Um teste unitário não prova que a ação do Professor num navegador aparece na tela do Aluno em outro; isso é comportamento de sessão, cache e revalidação do Next.js, e é o critério 5 de aceitação.

### Preparação

- Modo real ativo (itens 1–4 acima). **Sinal de que ativou: a senha some da tela de login** — em modo demonstração ela é exibida.
- Quatro navegadores **de perfis distintos** (janela anônima não basta em todos: sessões podem compartilhar armazenamento). Recomendado: Chrome, Chrome (segundo perfil), Firefox, Edge — ou dispositivos diferentes.
- Contas: `diretor@`, `fabio.ege@`, `aluno01@`, `aluno02@` — todas `@institutohorizonte.edu.br`, senha do `IAH_DEMO_PASSWORD`.
- Console aberto nos quatro (critério 10: nenhum erro).

### A. Autenticação e roteamento (critérios 1, 2)

| # | Navegador | Ação | Esperado |
|---|---|---|---|
| A1 | 1 | Entrar como `diretor@` | Cai em `/gestor` |
| A2 | 2 | Entrar como `fabio.ege@` | Cai em `/professor` |
| A3 | 3 | Entrar como `aluno01@` | Cai em `/dashboard` |
| A4 | 4 | Entrar como `aluno02@` | Cai em `/dashboard` |
| A5 | 1 | Recarregar `/gestor` | Sessão persiste, sem voltar ao login |

### B. Permissões por papel (critério 3)

**Separação estrita de papéis** (M23): cada papel alcança apenas a própria área. Administrador **não** herda a área docente; professor **não** herda a jornada do aluno. Privilégio administrativo nunca é bypass de permissão de professor — quem exerce as duas funções precisará de papel docente explícito ou troca de contexto. A allowlist vive em `app/src/auth.config.ts` (`AREA_ROLES`) e é espelhada em `app/src/middleware.ts`.

| # | Navegador | Ação | Esperado |
|---|---|---|---|
| B1 | 3 | Digitar `/professor` na barra de endereço | Redireciona para `/dashboard` |
| B2 | 3 | Digitar `/gestor` | Redireciona para `/dashboard` |
| B3 | 2 | Digitar `/gestor` | Redireciona para `/professor` |
| B4 | 2 | Abrir `/dashboard` | Redireciona para `/professor` — professor não herda a jornada do aluno |
| B5 | — | Sair da sessão e abrir `/missoes` | Redireciona para `/entrar` |
| B6 | 1 | Digitar `/professor` | Redireciona para `/gestor` — administrador não herda a área docente |
| B7 | 1 | Digitar `/dashboard` | Redireciona para `/gestor` |

B4, B6 e B7 são a contraparte manual dos testes de `workspace-route-gates.test.mjs`: o teste prova a decisão do gate; a matriz prova que o navegador realmente obedece a ela, com sessão real e redirecionamento visível.

### C. Isolamento entre os dois alunos (critério 4)

| # | Navegador | Ação | Esperado |
|---|---|---|---|
| C1 | 3 | Listar turmas visíveis no painel | Só **1º EM A** |
| C2 | 3 | Abrir o Diário | Só as próprias reflexões |
| C3 | 4 | Após o Aluno 01 entregar, abrir a Missão | A produção do colega **não** aparece |
| C4 | 3 | Abrir a Missão do Aluno 02 pela URL, se houver id na rota | Recusa ou mostra o próprio trabalho, nunca o do colega |

### D. Jornada ponta a ponta e sincronismo (critérios 5, 6, 7, 8)

Cada passo é validado **no outro navegador**, com recarga da página — é isso que prova o modo real.

| # | Navegador | Ação | Esperado (onde verificar) |
|---|---|---|---|
| D0 | 1 | Abrir `/gestor` antes de tudo | Painel **zerado** — é o "antes" da demonstração |
| D1 | 2 | Publicar a Missão 01 para 1º EM A | 3 e 4: a Missão aparece após recarregar |
| D2 | 3 | Iniciar a Missão e salvar produção | 2: acompanhamento da turma mostra o Aluno 01 produzindo |
| D3 | 4 | Iniciar, produzir e entregar | 2: Aluno 02 aparece como entregue |
| D4 | 3 | Entregar produção e registrar reflexão | 2: Aluno 01 aparece como concluído |
| D5 | 2 | Avaliar a entrega do Aluno 01 (nota + devolutiva) | ver protocolo de snapshot negativo abaixo — **obrigatório** |
| D6 | 1 | Recarregar `/gestor` | Indicadores refletem o que acabou de acontecer |
| D7 | 1 | Conferir o número de entregas | Bate com o que os navegadores 3 e 4 fizeram |

#### Ficha de registro obrigatória (D0–D7)

Nenhuma etapa é aprovada por funcionar na mesma sessão em que foi executada. Registrar, por etapa:

| Campo | |
|---|---|
| Etapa | D0 … D7 |
| Sessão / navegador | 1 Diretora · 2 Professor · 3 Aluno 01 · 4 Aluno 02 |
| Papel | administrador / professor / aluno |
| Ação executada | |
| Resultado na própria sessão | |
| Reload realizado | sim/não — **qual** sessão recarregou |
| Persistência observada | banco / localStorage / memória |
| **Resultado no outro navegador** | ← campo decisivo |
| Veredito | PASS / FAIL |

**Regra absoluta:** uma etapa que funcione apenas no mesmo navegador ou dispositivo é **FAIL**, não PASS parcial.

#### D5 — snapshot negativo obrigatório

D5 é a única etapa que prova, ao mesmo tempo, que a avaliação chega a quem deve e **não vaza** para quem não deve. Sem o snapshot anterior não há com o que comparar, e a metade negativa fica por conta da impressão de quem olha.

**ANTES da avaliação** — registrar, em sessões independentes:

| | Aluno 01 (sessão 3) | Aluno 02 (sessão 4) |
|---|---|---|
| status | | |
| produção (texto e horário de entrega) | | |
| reflexão (texto e horário) | | |
| devolutiva (nota, critérios, feedback) | | |

**AÇÃO** — o Professor (sessão 2) avalia **somente** o Aluno 01: nota, critérios observados e devolutiva.

**DEPOIS** — registrar de novo os dois, com recarga em cada sessão:

- **Aluno 01** apresenta a devolutiva correta — nota, critérios e feedback exatamente como o Professor registrou.
- **Aluno 02 permanece inalterado** nos quatro campos: status, produção, reflexão e devolutiva. Nenhuma avaliação aparece para ele.

**PASS exige as três condições:** (1) evidência positiva no Aluno 01, (2) evidência negativa no Aluno 02, (3) ambas verificadas em sessões independentes. Faltando qualquer uma, D5 é FAIL.

### E. Higiene (critérios 9, 10, 13)

| # | Verificação | Esperado |
|---|---|---|
| E1 | Nomes exibidos nas quatro telas | Só Instituto Horizonte, Helena Duarte, Fabio Ege e "Aluno(a) de demonstração NN" |
| E2 | Console dos quatro navegadores | Sem erro |
| E3 | `git status` na worktree | Nenhum `.env*` versionado |
| E4 | Tela de login | Senha **não** exibida (confirma modo real) |

Registrar o resultado (data, navegadores usados, o que falhou) junto do fechamento do Lote 3.

### Fora do escopo do Lote 3 — e por quê

**AUTHORING SHARED PERSISTENCE = P1 — SCHOOL READY**

`modules/authoring` (Estúdio de Missões) é o único módulo da Plataforma que **não tem caminho de modo real**: `localMissionStudioRepository` grava sempre em `localStorage`, sem Server Action equivalente. Uma Missão criada no Estúdio existe apenas no dispositivo de quem a criou.

Consequências, nesta ordem:

1. **Não abrir o Estúdio de Missões durante o Lote 3.** Ele produziria um resultado não representativo do teste multiusuário — a Missão simplesmente não apareceria nas outras sessões, e o FAIL seria do módulo, não da arquitetura sob teste.
2. **Isso não bloqueia DEMO READY.** A jornada usa a Lesson e a Mission que já existem no seed (`lesson-horizonte-fabrica-noticias-1em-a`, `01-a-fabrica-de-noticias`); nenhuma autoria nova é necessária para percorrer D0–D7.
3. **Isso BLOQUEIA SCHOOL READY.** Uma escola real precisa criar as próprias Missões, e um professor que perde a autoria ao trocar de computador não tem sistema — tem rascunho. Enquanto o fluxo de autoria necessário à operação depender exclusivamente do dispositivo, a primeira escola não pode ser considerada pronta.

Corrigir isso é trabalho próprio, fora da M23: migrar `modules/authoring` para o mesmo padrão de `modules/lesson` (Server Actions + tabela, com a factory decidindo entre real e local). **Não fazer agora.**

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
