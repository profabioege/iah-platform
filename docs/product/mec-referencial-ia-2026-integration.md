# Referencial do MEC sobre IA na Educação — integração à Biblioteca Inteligente

**Status:** Contratos de domínio, extensão de dados e importador implementados
e testados. **Nenhum dado foi inserido em nenhum banco** — esta Micro Missão
entrega a estrutura e o mecanismo de ingestão, não a ingestão em si (ver
"Próximos passos").

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

## Próximos passos (fora do escopo desta Micro Missão)

- Implementação de infraestrutura (Supabase) para
  `OfficialReferenceRepository` e `KnowledgeDocumentUnitRepository` — hoje
  só os contratos de domínio existem.
- Um script/rota que efetivamente rode o importador contra o arquivo e
  persista `document` + `details` + `units` no banco (criação do
  `knowledge_sources` correspondente, `kind: "manual"`, incluída).
- Consumo real por DocentIAH/MentorIAH/Planejamento — hoje só documentado
  na Fase 8, nenhum código dos três módulos foi tocado.
- Classificação temática mais fina (cross-cutting, baseada em conteúdo) além
  da estrutural por heading, caso o produto precise dela.
