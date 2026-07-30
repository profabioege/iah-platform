# Referencial do MEC sobre IA na Educação — integração à Biblioteca Inteligente

**Status:** Contratos de domínio, extensão de dados, importador e persistência
real em PostgreSQL implementados e testados (seção 12). Validado com o
documento real contra um PostgreSQL efêmero local (Podman) — **nenhum dado foi
inserido no Supabase remoto**, e o driver/serviço ainda não são usados pela
aplicação web (ver "Próximos passos").

## 1. O documento

**Referencial para Desenvolvimento e Uso Responsáveis de Inteligência
Artificial na Educação** — Ministério da Educação, 1ª edição, Brasília, DF,
fevereiro de 2026, pt-BR.

Fonte localizada em `C:\Users\profabio77\Downloads\referencial-ia-na-educacao (1).md`
(conversão integral do PDF original para Markdown, com a localização das
páginas originais preservada em comentários HTML `<!-- Página N do PDF
original -->`, 241 ocorrências). O `.md` fornecido é byte-idêntico ao arquivo
irmão sem sufixo `(1)` no mesmo diretório (`diff` sem saída).

- Checksum SHA-256 do `.md` fonte: `cfa5ce1da7a943d011fdf1c39e867ffde69fca8ffd3426c29000717d4e249ac6`
- Checksum SHA-256 do `.pdf` original: `db50aa4fd0c5d146d9c18a0340668f48430c6d3651061d53c7a9eeb22f28e3ad`

Nenhum conteúdo do documento foi inventado, resumido ou parafraseado nesta
Micro Missão — a estrutura de capítulos abaixo foi extraída diretamente do
arquivo fonte (`grep` nos headings), não escrita de memória.

## 2. Auditoria do estado existente (Fase 2)

Auditados `modules/library`, `modules/knowledge` e `modules/curriculum`
(`origin/main`). Nenhum dos três tem hoje qualquer estrutura de chunk,
citação, fonte com direitos autorais/checksum, ou documento oficial:

- `modules/library` (`Mission`) e `modules/curriculum` (`CurriculumUnit`/`CurriculumTheme`)
  não têm nenhum campo bibliográfico — `CurriculumTheme.knowledgeDocumentIds`
  já é o único ponto de contato com a Biblioteca, e não muda nesta missão.
- `modules/knowledge` (Sprint M11/D-034) já resolve `scope: "global" |
  "institution"` com `institution_id` obrigatório apenas quando
  `scope = "institution"` (check constraint em `0004_knowledge_engine.sql`) —
  exatamente a garantia multi-tenant que um documento oficial precisa, sem
  nenhuma mudança de schema nessa parte.
- Nenhuma tabela `knowledge_*` tem hoje: autor institucional, publicador,
  edição, local de publicação, formato original, direitos autorais,
  checksum, versão, página, seção, ou distinção entre texto original e
  síntese curada.

**Conclusão da auditoria:** a extensão pertence inteiramente a
`modules/knowledge`; nenhuma estrutura nova duplica algo que já existe.

## 3–4. Classificação, direitos e procedência

- `KnowledgeDocument.scope = "global"`, `institutionId = null` — nunca
  pertence a uma instituição. Já garantido pelo check constraint existente
  de `0004`; nenhum código novo pode violar isso sem falhar no banco.
- `KnowledgeDocument.category = "official_reference"` (campo novo, opcional,
  `null` para os demais recursos da Biblioteca).
- `KnowledgeDocument.resourceType = "normativa"` — a categoria já existente
  mais próxima de um referencial de orientação publicado por um órgão
  federal (não é `"lei"`, que reservamos para instrumentos com força legal
  formal).
- `KnowledgeDocument.license = null` — **nunca preenchido com uma licença
  aberta que não foi verificada.** Direitos e procedência ficam em
  `rightsStatement` (`OfficialReferenceDetails`), um texto editorial que
  descreve o que se sabe (documento oficial do MEC, direitos reservados ao
  MEC) sem alegar uma licença específica (CC-BY, domínio público etc.) que
  não foi confirmada na fonte.
- Checksum do arquivo fonte fica em `OfficialReferenceDetails.checksum` —
  usado tanto como prova de integridade quanto para derivar
  deterministicamente o `documentId` (ver Fase 9).

## 5. Extensão de dados

Extensão deliberadamente mínima — nenhuma coluna nova em
`knowledge_documents` além de `category` (nullable, só usado por
referenciais oficiais); os ~10 campos bibliográficos específicos ficam numa
tabela de extensão 1:1, não poluindo o modelo compartilhado por todo tipo de
recurso da Biblioteca.

`app/db/migrations/0008_knowledge_official_references.sql`:

- `alter table knowledge_documents add column category text check (category
  in ('official_reference'))`.
- `knowledge_official_references` — 1:1 com `knowledge_documents`
  (`document_id text primary key references knowledge_documents (id)`):
  `institutional_author`, `publisher`, `publisher_short_name`, `edition`,
  `publication_place`, `publication_date`, `original_format`,
  `working_format`, `rights_statement`, `checksum`, `version`.
- `knowledge_document_units` — unidade de conteúdo endereçável e citável
  (capítulo/seção/subseção + página original): `original_start_page`/
  `original_end_page` (`check >= 1` e `check end >= start` — nunca uma
  página inexistente), `content_nature` (`original_source` |
  `curated_summary` | `institutional_mapping` | `ai_suggestion` — distingue
  por constraint o texto original de qualquer leitura curada sobre ele),
  `topics`/`educational_stages` (`text[]`, livres), `sequence` (ordem de
  leitura), `unique (document_id, sequence)` (idempotência: reprocessar o
  mesmo documento não duplica unidades).
- RLS habilitada nas duas tabelas novas, **sem nenhuma policy e sem nenhum
  grant explícito** — mesmo padrão "deny by default" de todas as tabelas
  `knowledge_*` desde `0005_production_foundation.sql`. Isto **não** é o
  padrão de grants explícitos a `service_role` usado em `iah_jobs`
  (D-047) — aquele é uma exceção justificada só para a fila assíncrona, não
  um precedente para tabelas de conteúdo.

Contratos de domínio (`app/src/modules/knowledge/domain/entities.ts`,
aditivos — nenhum tipo existente perdeu campo ou mudou de forma):
`KnowledgeDocumentCategory`, `OfficialReferenceDetails` +
`createOfficialReferenceDetails()`, `KnowledgeUnitContentNature`,
`KnowledgeDocumentUnit` + `createKnowledgeDocumentUnit()`. Repositórios
(`repositories.ts`): `OfficialReferenceRepository`,
`KnowledgeDocumentUnitRepository` — **contratos de domínio apenas**, sem
implementação de infraestrutura Supabase nesta missão (ver "Próximos
passos").

## 6. Contrato de citação

`app/src/modules/knowledge/domain/citation.ts` — `buildCitation(document,
details, unit)`, função pura. Recusa (lança erro) página inconsistente em
vez de gerar uma citação com um número que não pode ter vindo do documento
original. Formato adotado (estilo ABNT):

```
Ministério da Educação. Referencial para Desenvolvimento e Uso Responsáveis
de Inteligência Artificial na Educação. 1ª edição. Brasília, DF: MEC, 2026,
p. 45.
```

Intervalos de página usam `p. 45-47`. `contentNature` é sempre preservado na
citação, para que quem consome nunca confunda um trecho original com uma
leitura curada sobre ele.

## 7. Classificação de tópicos — estrutural, não semântica

`app/src/modules/knowledge/domain/topic-classification.ts` deriva o(s)
tópico(s) de cada unidade **apenas da própria hierarquia de headings** do
documento (capítulo/seção/subseção, "slugificados") — nunca de uma
taxonomia externa nem de uma leitura semântica do texto, que exigiria um
modelo de IA e não é permitida nesta Micro Missão (determinismo, sem
chamadas externas).

**Limitação deliberada e documentada:** um trecho sobre "privacidade" que
apareça fora de uma seção com esse nome não é marcado com esse tópico. Os
temas reais confirmados no documento (não inventados — extraídos via `grep`
dos próprios headings) incluem as 6 Oportunidades e os 8 Desafios do
Capítulo 2, e os temas de cada capítulo 3–11 (ética e equidade; ensino e
aprendizado com IA; centralidade do professor; Educação Básica; Educação
Profissional e Tecnológica; Educação Superior e Pós-Graduação; competências
de gestores; governança; conclusão). Uma classificação temática mais fina
(cross-cutting, baseada em conteúdo) fica como evolução futura, fora do
escopo desta missão.

## 8. Uso futuro por outros módulos (documentação apenas — nada implementado)

- **Biblioteca:** o referencial passa a aparecer como mais um
  `KnowledgeDocument` pesquisável por `KnowledgeSearchQuery` (já existente),
  agora também filtrável por `category`. Cada `KnowledgeDocumentUnit` é uma
  entrada endereçável dentro dele.
- **DocentIAH:** ao gerar uma missão ou material, poderia citar uma unidade
  específica do referencial (via `buildCitation`) como fundamentação
  pedagógica de uma escolha metodológica — nunca inserindo o texto integral,
  sempre um trecho citado com página.
- **MentorIAH:** poderia referenciar uma unidade ao explicar a um estudante
  por que uma prática de uso de IA é ou não recomendada — mesma lógica de
  citação, nunca paráfrase apresentada como se fosse o documento oficial.
- **Planejamento/Currículo:** `CurriculumTheme.knowledgeDocumentIds` (já
  existente, sem mudança) já permite vincular um Tema ao documento inteiro;
  vincular a uma unidade específica exigiria um novo campo, não criado nesta
  missão por não haver pedido de uso ainda.

Nenhum destes três consumidores foi tocado nesta Micro Missão.

## 9. Importador determinístico

`app/src/modules/knowledge/domain/official-reference-importer.ts` —
`parseOfficialReferenceDocument(rawText, options, now)`, função pura e
síncrona: sem IA, sem rede, sem banco de dados.

- **Frontmatter:** parser mínimo para o bloco YAML plano
  (`chave: "valor"`) do topo do arquivo — não é um parser YAML geral,
  suficiente para o formato real da fonte. Falha se um campo obrigatório
  (`title`, `publisher`, `edition`, `place`, `date`, `language`,
  `source_format`) estiver ausente.
- **Páginas:** *carry-forward* do último marcador
  `<!-- Página N do PDF original -->` visto. Cada unidade guarda a página
  ativa no início do seu heading (`originalStartPage`) e a página ativa ao
  fechar (`originalEndPage`). **Falha com segurança** (lança erro) se uma
  seção terminar antes de qualquer marcador de página ter sido visto —
  nunca inventa um número de página.
- **Unidades vazias** (heading duplicado consecutivo — artefato real de
  cabeçalho repetido pela conversão do PDF, confirmado nas linhas 1220/1255
  e 1757/1761 do arquivo fonte — ou capítulo sem texto próprio antes da
  primeira subseção) são descartadas silenciosamente, não é erro; o total
  é reportado em `skippedEmptyUnitCount` para auditoria.
- **Determinístico e idempotente:** `documentId` é derivado do checksum do
  texto (`official-reference-<checksum[0:16]>`), e cada unidade tem
  `id = "<documentId>-unit-<sequence>"` — a mesma entrada sempre produz os
  mesmos ids e os mesmos checksums; nunca um id aleatório.
- Todo texto extraído recebe `contentNature: "original_source"` — este
  importador nunca gera síntese.

### Validação contra o documento real (dry-run local, sem persistência)

Executado localmente contra o arquivo fonte (leitura direta do disco,
nenhuma escrita em lugar nenhum do repositório ou de um banco):

- **78 unidades** de conteúdo extraídas, cobrindo as páginas **5 a 241**
  (consistente com as 241 ocorrências de marcador de página no arquivo).
- **8 unidades vazias descartadas** — os 2 pares de heading duplicado já
  documentados (`2.1 Oportunidades`, `2.2 Desafios`) mais capítulos sem
  texto próprio antes de sua primeira subseção.
- Checksum calculado: `cfa5ce1da7a943d011fdf1c39e867ffde69fca8ffd3426c29000717d4e249ac6` —
  **idêntico** ao checksum calculado independentemente via `sha256sum` sobre
  o arquivo em disco.
- Documento classificado corretamente: `scope: "global"`,
  `institutionId: null`, `category: "official_reference"`, `license: null`.

## 10. Revisão de multi-tenancy e RLS

- Documento oficial é sempre `scope: "global"` / `institution_id: null` —
  já impedido de ser diferente pelo check constraint de `0004` (`(scope =
  'institution') = (institution_id is not null)`), sem necessidade de
  nenhuma regra nova.
- Nenhuma das duas tabelas novas (`knowledge_official_references`,
  `knowledge_document_units`) tem coluna `institution_id` — não existe por
  onde um dado institucional vazar através delas.
- RLS habilitada nas duas, sem policy — mesmo padrão "deny by default" já
  em vigor para todo o Knowledge Engine. Nenhum grant a `service_role` foi
  adicionado (ao contrário de `iah_jobs`/D-047, que é uma exceção
  específica e não se aplica aqui).

## 11. Testes

`app/tests/knowledge-official-reference-entities.test.mjs`,
`-citation.test.mjs`, `-importer.test.mjs`, `-migration.test.mjs` — 38 testes
novos, cobrindo: validação de metadados obrigatórios, autoria institucional,
preservação de direitos (nunca licença aberta inventada), classificação
global sem `institution_id`, distinção `original_source`/`curated_summary`,
reconhecimento de página por *carry-forward*, ordenação por `sequence`,
checksum, determinismo/idempotência, prevenção de unidade duplicada,
citação válida, rejeição de página inexistente, isolamento institucional
(nenhum `institution_id` nas tabelas novas), ausência de chamada externa
(função síncrona), e o conteúdo estrutural da migration (RLS, constraints,
ausência de `grant`/`revoke`/`insert`).

A fixture do importador é sintética e curta (~40 linhas, reproduzindo os
dois artefatos reais de conversão) — **o documento completo nunca foi
copiado para um fixture de teste**, apenas usado uma vez, localmente, no
dry-run acima.

## 12. Persistência PostgreSQL (Micro Missão seguinte)

Implementa a persistência real de `document` + `details` + `units` — antes
só existiam os contratos de domínio. **Continua sem uso pela aplicação web e
sem nenhuma conexão com o Supabase remoto** (ver "Bloqueio de banco remoto").

### Arquitetura

- `infrastructure/database/postgres-official-reference-driver.ts` — driver
  `pg` (não `@supabase/supabase-js`): a operação de ingestão precisa de
  `BEGIN`/`COMMIT`/`ROLLBACK` reais entre três tabelas
  (`knowledge_documents`, `knowledge_official_references`,
  `knowledge_document_units`), algo que o cliente REST do Supabase não
  expõe (mesma razão pela qual `iah_claim_next_job`, D-047, precisou de uma
  função SQL via `.rpc()`). Implementa `OfficialReferenceRepository` e
  `KnowledgeDocumentUnitRepository` (contratos já existentes, sem mudança de
  assinatura) mais dois helpers estreitos para o documento base
  (`insertKnowledgeDocumentRow`/`findKnowledgeDocumentRowById` — não é uma
  implementação completa de `KnowledgeDocumentRepository`, que tem
  `list`/`search` irrelevantes para a ingestão).
- `services/official-reference-ingestion-service.ts` —
  `createOfficialReferenceIngestionService(pool)`, mesmo padrão
  `create*Service` de `modules/platform/services/`. Recebe um `pg.Pool`
  (não um agregado de repositórios pré-montado) porque o limite
  transacional exige possuir a mesma conexão do início ao fim.

### Transação de ingestão

Uma única transação (`client.query("BEGIN")` → … → `COMMIT`/`ROLLBACK`):

1. já existe um documento com este `id` (derivado do checksum)? Se sim,
   commit vazio, retorna `{ outcome: "already_ingested" }` — **idempotente**,
   não duplica nada.
2. existe conflito de chave natural (mesmo título + edição + data de
   publicação, checksum diferente)? Se sim, `ROLLBACK` implícito (erro
   lançado dentro do `try`, capturado pelo `catch` que sempre reverte) e
   `OfficialReferenceChecksumConflictError` — nunca sobrescreve.
3. insere `knowledge_documents` + `knowledge_official_references`.
4. insere todas as `knowledge_document_units`.
5. confere a contagem persistida contra a esperada
   (`OfficialReferenceUnitCountMismatchError` se divergir).
6. `COMMIT`.

Qualquer exceção em qualquer passo cai no `catch`, que sempre executa
`ROLLBACK` antes de relançar o erro — comprovado por teste: uma unidade com
`sequence` duplicada (violação da constraint `unique(document_id,
sequence)`) no meio do lote reverte a transação inteira, sem deixar nem o
documento, nem a referência, nem nenhuma unidade órfã.

### Idempotência e conflito — três cenários reais

- **Mesmo documento** (mesmo `id`, derivado do checksum): segunda ingestão
  retorna `already_ingested`, mesma contagem de unidades, nenhuma linha
  nova.
- **Conflito de checksum** (mesmo título + edição + data, conteúdo
  diferente): `OfficialReferenceChecksumConflictError`, nenhuma linha
  gravada.
- **Nova edição** (edição ou data diferentes): cria uma referência
  independente (novo `id`, novo checksum) — a anterior não é tocada.

### Comando de ingestão local

`app/scripts/ingest-official-reference.mjs` (`node --experimental-strip-types`):

```
npm run knowledge:official-reference:dry-run -- --file <caminho>
npm run knowledge:official-reference:ingest  -- --file <caminho>
```

- `--dry-run` (padrão): só faz o parse e mostra estatísticas — nunca abre
  conexão com banco.
- `--persist`: exige `TEST_DATABASE_URL` (ou `--database-url-env <NOME>`)
  apontando para um PostgreSQL **local**; executa a ingestão real dentro da
  transação acima.
- Nunca imprime a connection string nem o conteúdo integral do documento —
  só título, checksum abreviado (12 caracteres), quantidade de unidades,
  unidades vazias descartadas, intervalo de páginas e o resultado
  (`ingested`/`already_ingested`).

### Bloqueio de banco remoto

`assertLocalDatabaseUrl()` só aceita `localhost` e `127.0.0.1` (mesmo host
usado pelo harness de teste e pelo service container da CI) — qualquer
outro hostname (Supabase ou qualquer serviço gerenciado) é rejeitado antes
de abrir qualquer conexão, sem flag de bypass. **Autorização futura para o
Supabase remoto é uma decisão separada e explícita**, fora desta Micro
Missão: exigiria trocar o host permitido, decidir o papel de conexão
(`service_role`, nunca `anon`/`authenticated`) e uma revisão de segurança
própria — nada disso foi implementado aqui.

### Validação real (Podman, banco efêmero, nenhuma escrita permanente)

Reutilizado integralmente o harness já existente
(`scripts/postgres-test-env.mjs`, `postgres:16.4`, porta só em
`127.0.0.1`, sem volume) — nenhuma infraestrutura de banco duplicada.
Executado uma vez, localmente, contra o arquivo real:

1. Postgres efêmero sobe, as 8 migrations são aplicadas num banco vazio.
2. Primeira ingestão: `outcome: "ingested"`, **78 unidades persistidas**,
   páginas **5–241**.
3. Segunda ingestão (mesmo arquivo): `outcome: "already_ingested"`, mesma
   contagem — **idempotência real comprovada no banco**, não só na função
   pura do importador.
4. Consulta direta confirma exatamente 1 linha em `knowledge_documents` com
   este id e 78 linhas em `knowledge_document_units`.
5. Container parado e removido — `podman ps -a` sem nenhum residual.

### Testes PostgreSQL novos

`app/tests/integration/knowledge-official-reference-postgres.test.mjs` — 15
testes reais (roda com `npm run test:integration:postgres`, mesmo runner e
mesmo harness dos testes de `iah_jobs`, sem duplicar infraestrutura):
schema (tabelas, coluna `category`, RLS habilitada), ingestão real (insere,
ordem preservada, páginas preservadas, checksum preservado, citação
recuperável, escopo global/`institution_id` null/`license` null),
idempotência, conflito de checksum, nova edição, rollback atômico
(nenhuma unidade órfã), `original_source` vs. `curated_summary`
distinguíveis, `institution_id` falso rejeitado pelo check constraint,
`anon`/`authenticated` bloqueados, conexão padrão (papel server-side)
autorizada.

### Limitações desta Micro Missão

- Sem embeddings, sem busca vetorial, sem RAG — a persistência é
  relacional simples, texto + metadados, nada de índice semântico.
- Sem uso pela aplicação web: o driver e o serviço existem, prontos para
  receber uma conexão server-side no futuro, mas nenhuma rota/Server Action
  os chama ainda.
- Sem ingestão no Supabase remoto — só valida contra Postgres efêmero local
  (Podman) ou o service container da CI.
- Detecção de conflito de checksum é por chave natural (título + edição +
  data) — um erro de digitação na edição ou na data faria dois documentos
  com o mesmo conteúdo passarem por "novas edições" distintas em vez de
  conflito; aceitável para o volume atual (ingestão manual, um documento
  por vez), não para ingestão em massa.

## Próximos passos (fora do escopo desta Micro Missão)

- Autorização explícita e revisão de segurança para apontar a ingestão ao
  Supabase remoto (papel de conexão, host permitido, quem pode disparar).
- Consumo real por DocentIAH/MentorIAH/Planejamento — hoje só documentado
  na Fase 8, nenhum código dos três módulos foi tocado.
- Classificação temática mais fina (cross-cutting, baseada em conteúdo) além
  da estrutural por heading, caso o produto precise dela.
- Embeddings/busca vetorial/RAG, caso o produto precise de recuperação
  semântica em vez de só citação por página/seção.
