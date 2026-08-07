# Supabase — IAH Educacional

Guia de criação e configuração do projeto Supabase (PostgreSQL) — o banco real da plataforma, decidido em `PERSISTENCE.md`/D-023, com a postura de segurança de D-041. Este documento é o passo a passo do que **só você** pode fazer (contas e consoles são seus); todo o código que consome o banco já está pronto e ligado por variáveis de ambiente.

> **Documento reescrito para o Ambiente Demonstrativo Multiusuário (Instituto Horizonte).** A versão anterior descrevia um cenário que não existe mais: Colégio Beryon, migrations `0001`–`0003` e inserção manual da instituição. Nada disso vale — o cenário demonstrativo é criado pelo script de seed, e as migrations vão até `0009`.

## Regra que organiza tudo o mais

**Um projeto Supabase por ambiente, nunca compartilhado.** O ambiente de demonstração usa um projeto exclusivo com dados 100% fictícios (Instituto Horizonte, D-039). Um banco que pode receber dado real de escola nunca é o mesmo que hospeda contas fictícias com senha compartilhada.

## 1. Criar o projeto

1. [supabase.com](https://supabase.com) → New project (organização pessoal; o plano Free basta).
2. Nome: `iah-demo-horizonte`. Região: `sa-east-1` (São Paulo).
3. Guarde a senha do banco no seu gerenciador de senhas — ela não aparece de novo e não vai para lugar nenhum do repositório.

## 2. Aplicar as migrations (na ordem)

No SQL Editor, execute o conteúdo de cada arquivo de `app/db/migrations/`, **nesta ordem**:

| # | Arquivo | O que cria |
|---|---|---|
| 1 | `0001_initial_schema.sql` | schema institucional multi-tenant |
| 2 | `0002_classroom_sync_state.sql` | estado de sincronização de turmas |
| 3 | `0003_identity.sql` | `users`, `profiles`, campos institucionais |
| 4 | `0004_knowledge_engine.sql` | Knowledge Engine |
| 5 | `0005_production_foundation.sql` | `password_hash`, Lesson, MissionAssignment, MissionReview, **RLS deny-by-default em todas as tabelas** |
| 6 | `0006_iah_jobs.sql` | fila assíncrona (D-047) — opcional para a demonstração |
| 7 | `0007_iah_claim_next_job.sql` | claim transacional da fila — opcional |
| 8 | `0008_knowledge_official_references.sql` | referencial oficial do MEC |
| 9 | `0009_service_role_grants.sql` | **GRANTs explícitos para `service_role`** |

**A `0009` não é opcional.** Sem ela, os privilégios de tabela dependem exclusivamente do `ALTER DEFAULT PRIVILEGES` do papel `postgres`, dependência frágil e não declarada que só se manifesta em runtime como `permission denied` (D-047, item 7).

As migrations `0006` e `0007` só são necessárias se a fila de jobs for exercitada; aplicá-las não atrapalha.

**Nenhuma migration insere dados.** O banco nasce vazio — schema e dados são ciclos de vida separados (`PERSISTENCE.md`).

## 3. Copiar as chaves

Project Settings → API:

| Variável | Onde encontrar | Cuidado |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | pública, ok |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key | **SECRETA — ignora RLS; só servidor, nunca `NEXT_PUBLIC_`, nunca no repositório** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon public` key | opcional; hoje sem uso no núcleo (D-041) |

Junto com `AUTH_SECRET` (gere com `npx auth secret`), essas variáveis vão em `app/.env.local` e no painel da Vercel. As **três** obrigatórias andam juntas: `getPlatformConfigError()` recusa configuração parcial em vez de cair em modo demonstração silenciosamente.

## 4. Popular o cenário de demonstração

A instituição **não** é inserida à mão. O script de seed cria o cenário inteiro, é idempotente (upsert por id) e vive fora das migrations de propósito:

```bash
IAH_DEMO_PASSWORD="<a senha que você escolher>" node db/seed/seed-demo.mjs
```

Executar na pasta `app/`, com `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já definidas no ambiente.

`IAH_DEMO_PASSWORD` **existe apenas nesta linha de comando**: ela vira hash scrypt em `users.password_hash` e nunca é gravada em arquivo, nunca vai para a Vercel, nunca entra no repositório.

O que o seed cria:

| Entidade | Quantidade |
|---|---|
| Instituição | 1 — Instituto Horizonte (`inst-horizonte`, `institutohorizonte.edu.br`) |
| Ano letivo | 1 — 2026 |
| Contas autenticáveis | 12 — 1 direção, 1 professor, 10 estudantes |
| Turmas | 5 — 1º EM A/B, 2º EM A/B, 3º EM A |
| Estudantes / matrículas | 10 / 10 (2 por turma) |
| Disciplina | 1 — Inteligência Artificial & Humanidades |
| Missão | 1 — "A Fábrica de Notícias" |
| Lesson | 1 — turma **1º EM A** (a turma da jornada demonstrativa) |

**O seed não insere progresso, entrega, reflexão nem avaliação.** A jornada pedagógica nasce zerada e é preenchida pelo uso — inclusive durante a demonstração ao vivo, que é justamente o efeito desejado: os indicadores da Direção sobem na frente de quem assiste.

## 5. Verificação pós-setup

No Table Editor:

- `institutions`: 1 linha, `slug = 'horizonte'`.
- `users`: 12 linhas, todas com `password_hash` preenchido (formato `scrypt:1:…`).
- `profiles`: 1 `administrador`, 1 `professor`, 10 `aluno`.
- `classrooms`: 5 · `students`: 10 · `enrollments`: 10.
- `lessons`: 1, com `classroom_id = 'class-1em-a'`.
- `mission_progress`, `productions`, `reflections`: **vazias** — é o esperado.

Na aplicação, o sinal decisivo de que o modo real ativou: **a senha desaparece da tela `/entrar`**. Enquanto ela aparecer, alguma das três variáveis não está sendo lida e a instância segue em modo demonstração.

## 6. RLS (Row Level Security)

A migration `0005` habilita RLS em **todas** as tabelas **sem nenhuma política permissiva**. Isso é deliberado, não uma lacuna: as chaves `anon`/`authenticated` não leem nem escrevem nada, e a `service_role` ignora RLS por desenho do PostgreSQL — é assim que o servidor opera. A autorização por tenant e papel é aplicada na camada de serviço, onde `institutionId` é sempre derivado da sessão e nunca aceito do cliente (D-041).

Políticas RLS por tenant só serão escritas quando (e se) existir acesso direto do navegador ao banco. Política não exercida não é criada.

## 7. Reset entre apresentações

Reexecutar o seed restaura a estrutura (upsert idempotente), mas **não apaga** a jornada produzida na apresentação anterior. Para devolver o ambiente ao estado inicial, use o procedimento documentado em `operations/demo-instituto-horizonte.md`.

Aproveite todo reset para **rotacionar `IAH_DEMO_PASSWORD`** — a senha é única e compartilhada por 12 contas; tratá-la como descartável é o que a torna aceitável.
