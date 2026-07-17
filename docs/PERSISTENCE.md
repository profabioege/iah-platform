# Persistência — IAH Educacional

Arquitetura de persistência da plataforma: stack escolhida, camadas, estratégia multi-tenant, migrations, seeds e os critérios para a troca futura de dados simulados para banco real. Complementa [DOMAIN_MODEL.md](DOMAIN_MODEL.md) (o modelo conceitual que este schema materializa) e [IMPORT_ARCHITECTURE.md](IMPORT_ARCHITECTURE.md) (como dados externos entram). Decisão registrada em `DECISIONS.md` D-023.

## Estado honesto desta fase

**Não existe banco de dados conectado.** Esta Sprint criou o núcleo (contratos, schema versionado, seeds, factory) — não uma conexão real. Os `DatabaseRepositories` são stubs deliberados (padrão D-019): lançam erro se chamados, porque não há credencial contra a qual testar uma query, e query nunca testada é código especulativo. A UI continua funcionando exatamente como antes (localStorage + turma simulada) e **nenhuma página consome o módulo `platform` ainda**.

## Escolha da stack: Supabase (PostgreSQL), sem Prisma

| Critério | Avaliação |
|---|---|
| **Supabase (escolhido)** | `@supabase/supabase-js` e `@supabase/ssr` **já estão instalados** no projeto (zero dependência nova — regra do `CLAUDE.md`); o `ROADMAP.md` já previa Supabase para a Autenticação real (item 2 do backlog) — banco e auth no mesmo provedor; PostgreSQL gerenciado, com Row Level Security nativa (essencial para multi-tenant); integração direta com Vercel. |
| **Prisma (descartado nesta fase)** | Adicionaria dependência pesada + etapa de codegen sem benefício imediato; o volume de queries atual não justifica um ORM. Pode ser adotado depois **sem retrabalho**: os contratos de repositório isolam a implementação — trocar supabase-js por Prisma é trocar o conteúdo de `database-repositories.ts`, nada mais. |
| **PostgreSQL auto-hospedado (descartado)** | Custo operacional (backup, upgrades, segurança) sem equipe para sustentá-lo. Supabase É PostgreSQL — nada impede migrar para um Postgres próprio no futuro, o SQL é o mesmo. |

## Camadas

```
app/src/modules/platform/
├── domain/
│   ├── entities.ts              ← Types: 12 entidades multi-tenant (Domain/Types)
│   └── repositories.ts          ← Contratos/Interfaces (Repositories)
├── services/
│   ├── indicator-service.ts     ← Indicadores: projeção calculada, nunca persistida
│   └── import-service.ts        ← Importação: preview + gravação via contratos
├── infrastructure/
│   ├── seed/seed-repositories.ts        ← implementação em memória (em uso)
│   ├── database/supabase-client.ts      ← ponto único de conexão (Database)
│   ├── database/database-repositories.ts ← stub até haver credenciais
│   └── repository-factory.ts            ← Factory: decide seed vs database
├── seeds/demo-seed.ts           ← dados de demonstração (Seeds)
└── index.ts                     ← API pública do módulo

app/db/migrations/
└── 0001_initial_schema.sql      ← schema versionado (Migrations)

app/src/modules/integrations/import/   ← Providers de importação
├── domain/import-provider.ts           (contrato ImportProvider)
└── infrastructure/import-providers.ts  (manual funcional + 5 stubs)
```

## Estratégia Multi-Tenant

1. **Instituição é a raiz** (`DOMAIN_MODEL.md`): toda tabela operacional tem `institution_id NOT NULL` com foreign key, e índice por `institution_id`.
2. **Isolamento lógico, não físico**: um único banco para centenas de escolas — sem bancos separados. O isolamento acontece em três camadas:
   - **Contrato**: todo método de repositório recebe `institutionId` como primeiro parâmetro (`domain/repositories.ts`) — é impossível chamar uma query sem declarar o tenant.
   - **Query**: toda implementação filtra por `institution_id` (as seed repositories já fazem isso; as de banco farão o mesmo).
   - **Banco (futuro)**: Row Level Security do PostgreSQL, ativada junto com a Autenticação real — a política RLS amarra o `institution_id` ao usuário autenticado, tornando o vazamento entre tenants impossível mesmo com bug de aplicação.
3. **Exceção deliberada**: a tabela `missions` não tem `institution_id` — Missões são catálogo global IAH (template, P2 do `DOMAIN_MODEL.md`). Conteúdo por escola é ponto em aberto documentado lá.
4. **Indicadores não são tabela**: são projeção calculada (`indicator-service.ts`), recalculada de `mission_progress` — decisão do `DOMAIN_MODEL.md` mantida no schema.

## Migrations

- SQL puro, versionado em `app/db/migrations/`, numeração sequencial (`0001_...`). Sem ferramenta de migration por ora (nenhum banco para aplicá-las); quando o projeto Supabase existir, aplicam-se via SQL Editor ou `supabase db push` — a numeração garante ordem.
- **Migrations nunca inserem dados.** Schema e dados são ciclos de vida separados; o banco real nasce vazio.

## Estratégia de Seeds

Regra central: **dado fictício nunca é persistido no banco oficial.**

- **Dados de demonstração** vivem em `app/src/modules/platform/seeds/demo-seed.ts` — arquivos TypeScript rotulados, carregados **em memória** pelas `SeedRepositories`. A demonstração de agosto continua funcionando exatamente assim, sem banco.
- **Dados reais** só existirão no PostgreSQL, inseridos por uso real (ou importação revisada — `IMPORT_ARCHITECTURE.md`). As duas fontes nunca se misturam: a factory entrega **ou** seeds **ou** banco, nunca uma mistura.
- A turma de demonstração do seed espelha a do `simulated-class-monitor` (mesmos 11 alunos/estados). A duplicação é transitória e deliberada: o monitor atual continua servindo o Painel do Professor sem nenhuma alteração de UI; na troca para banco, o Painel passa a ler do módulo `platform` e o monitor simulado é aposentado.

## Critérios para a troca Mock → Banco Real

A troca acontece **na factory** (`repository-factory.ts`) e em nenhum outro lugar. Checklist para executá-la:

1. [ ] Projeto Supabase criado; `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` definidos em `app/.env.local` e na Vercel (`getDefaultRepositories()` passa a escolher `database` automaticamente).
2. [ ] Migrations de `app/db/migrations/` aplicadas, na ordem.
3. [ ] `database-repositories.ts` implementado de fato (hoje stub) — cada query filtrando por `institution_id`, testada contra o banco real.
4. [ ] Autenticação real ativa (`ROADMAP.md` item 2) — sem ela, não há como amarrar requisições a uma Instituição.
5. [ ] RLS ativada com políticas por `institution_id`.
6. [ ] Páginas migradas uma a uma dos stores atuais (`local-student-work-store`, `simulated-class-monitor`) para os repositórios do módulo `platform` — a UI não muda, muda a injeção (mesma regra de sempre, D-001/D-015).
7. [ ] `simulated-class-monitor` aposentado quando o Painel do Professor ler do `platform`.

## Fluxo de dados (visão de ponta a ponta)

```
HOJE (demonstração):
  UI → stores atuais (localStorage / turma simulada)          ← inalterado
  [módulo platform pronto, aguardando: seeds em memória]

FUTURO (produção):
  UI → módulo platform → repository-factory → DatabaseRepositories
      → Supabase/PostgreSQL (RLS por institution_id)
  Importação: ImportProvider (manual/csv/google/microsoft/moodle/api)
      → ImportService.preview → revisão humana → ImportService.import
      → repositórios (Classroom/Student/Enrollment)
```
