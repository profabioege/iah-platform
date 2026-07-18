# Knowledge Engine — Biblioteca Inteligente

Arquitetura do núcleo de conhecimento da plataforma: entidades, metadados, categorias, mecanismo de busca, integrações futuras e o vínculo direto com `Lesson` e Mission Flow. Materializa a entidade `Biblioteca` já mapeada em alto nível em [DOMAIN_MODEL.md](DOMAIN_MODEL.md) (contexto Acervo), no mesmo espírito em que [AUTHORING_MODEL.md](AUTHORING_MODEL.md) decompôs `Mission` e [PERSISTENCE.md](PERSISTENCE.md) materializou o núcleo institucional. Decisão registrada em `DECISIONS.md` D-034.

## Estado honesto desta fase

**Não existe banco de dados conectado, nenhuma integração externa chamada, nenhuma tela criada.** Esta Sprint (M11) criou o núcleo — entidades, contratos de repositório com busca, seeds de demonstração, schema versionado e sete contratos de integração futura, todos stub. Nenhuma página consome `modules/knowledge` ainda.

## Por que "Knowledge Engine", não só "upload de arquivo"

A Biblioteca não guarda arquivos soltos — ela guarda **recursos com metadados pedagógicos completos** (título, tipo, autor, fonte, ano, idioma, resumo, palavras-chave, competências BNCC e BNCC Computação, ano escolar, tema, tempo estimado, nível de dificuldade, licença), organizados em coleções, com tags e temas reutilizáveis, e **vinculados diretamente** às Lessons e Mission Flows que os usam. É o que permite, no futuro, uma Lesson (D-028) ser montada — manual ou automaticamente pelo IPE — puxando recursos já catalogados em vez de anexos soltos.

## Camadas

```
app/src/modules/knowledge/
├── domain/
│   ├── entities.ts              ← 6 entidades + metadados + 13 categorias
│   ├── repositories.ts          ← contratos, incluindo o mecanismo de busca
│   └── integration-provider.ts  ← contratos das 7 integrações futuras (stub)
├── infrastructure/
│   ├── seed/seed-repositories.ts        ← implementação em memória (em uso; busca real)
│   ├── database/database-repositories.ts ← stub até haver credenciais
│   └── repository-factory.ts            ← decide seed vs. banco (reaproveita modules/platform)
├── seeds/demo-seed.ts           ← dados de demonstração (1 documento, ligado à Missão 01)
└── index.ts                     ← API pública do módulo

app/db/migrations/
└── 0004_knowledge_engine.sql    ← schema versionado, sem nenhum INSERT
```

## As 6 entidades

| Entidade | Finalidade |
|---|---|
| `KnowledgeSource` | De onde um recurso veio — upload manual ou uma das 7 integrações futuras. |
| `KnowledgeDocument` | O recurso endereçável em si — título + os 15 campos de metadados + vínculos com coleção/tags/temas. |
| `KnowledgeCollection` | Curadoria — agrupa Documentos sem duplicá-los (mesma regra já registrada em `DOMAIN_MODEL.md`). |
| `KnowledgeTag` | Rótulo livre, reutilizável entre Documentos. |
| `KnowledgeTopic` | Tema/subtema — hierarquia de um nível (`parentTopicId`). |
| `KnowledgeReference` | **O vínculo direto** entre um Documento e uma `Lesson` ou uma Mission Flow — a relação pedida pela Sprint M11, como entidade própria (carrega `note`: por que o recurso foi anexado ali), não um array de ids solto. |

## Metadados (`KnowledgeMetadata`)

Título, Tipo de recurso, Autor, Fonte, Ano, Idioma, Resumo, Palavras-chave, Competências BNCC, Competências BNCC Computação, Ano escolar, Tempo estimado, Nível de dificuldade, Licença — todos em `domain/entities.ts`. Competências BNCC/BNCC Computação são arrays de string livre nesta Sprint (o catálogo formal de códigos ainda não existe — mesma pendência já registrada em D-028/D-029/D-030); a mesma modelagem que `Mission`/`Lesson` usarão quando esse catálogo nascer.

## As 13 categorias iniciais (`KnowledgeResourceType`)

Artigos (`artigo`), PDFs (`pdf`), Slides (`slides`), Vídeos (`video`), Estudos de Caso (`estudo_de_caso`), Leis (`lei`), Normativas (`normativa`), Pesquisas (`pesquisa`), Infográficos (`infografico`), Sites (`site`), Livros (`livro`), Materiais do Professor (`material_professor`), Materiais do Aluno (`material_aluno`).

## Escopo: catálogo global vs. por escola

Segue a mesma exceção multi-tenant já documentada para `Mission` (`PERSISTENCE.md`, item 3): a maioria dos recursos nasce `scope: "global"` (catálogo oficial IAH — "Biblioteca Oficial", uma das 13 categorias listadas na Sprint), sem `institutionId`. `scope: "institution"` existe para quando uma escola quiser curar sua própria coleção — não exigido nesta Sprint, mas já suportado pelo schema (`knowledge_documents.institution_id`, com `check` garantindo que só é preenchido quando `scope = 'institution'`).

## Mecanismo de busca

Um único método parametrizado, `KnowledgeDocumentRepository.search(query: KnowledgeSearchQuery)`, em vez de seis endpoints soltos — cobre as seis pesquisas pedidas pela Sprint M11:

| Pesquisa pedida | Campo em `KnowledgeSearchQuery` |
|---|---|
| Por tema | `topic` |
| Por competência | `bnccCompetency` |
| Por habilidade | `bnccComputacaoCompetency` (a BNCC Computação organiza por habilidade, não só competência) |
| Por ano | `grade` |
| Por tipo | `resourceType` |
| Textual | `text` (contra título, resumo e palavras-chave) |

Todos os filtros são opcionais e combináveis (AND). A implementação seed (`seed-repositories.ts`) já filtra de verdade em memória — não é stub, só a fonte de dados é de demonstração; a implementação de banco (`database-repositories.ts`) é stub até o Supabase existir, mesmo padrão D-019/D-023.

## Integrações futuras (contratos, sem chamada de rede)

`KnowledgeIntegrationProvider` — um contrato genérico (`isConfigured`, `importFrom(query)`) com um stub por origem prevista: NotebookLM, Google Drive, Google Docs, YouTube, OpenAlex, SciELO, Crossref. Nenhuma chamada de rede, nenhuma credencial, nenhuma dependência nova — mesmo padrão já validado em `modules/integrations` (D-019) e no IPE do Mission Studio (D-026).

## Relação direta com `Lesson` e Mission Flow

`KnowledgeReference` liga um `KnowledgeDocument` a **uma** `Lesson` (D-028, `lessonId` — ainda sem tabela própria, referenciado por id solto até `Lesson` ganhar implementação real) **ou** a **uma** `Mission` (`modules/library`, `missionId` — com foreign key real para `missions.id`, já que essa tabela existe desde a migration 0001). O seed de demonstração já prova essa relação: o documento "Como uma IA escreve uma notícia" está referenciado à Missão 01 via `KnowledgeReference`.

## Critérios para a troca Mock → Banco Real

Mesmo checklist de `PERSISTENCE.md`, aplicado a este módulo: projeto Supabase configurado → migration `0004` aplicada → `database-repositories.ts` implementado de fato → nenhuma página muda (a troca acontece só na factory). Nenhum passo executado nesta Sprint.
