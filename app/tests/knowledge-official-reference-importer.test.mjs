import assert from "node:assert/strict";
import test from "node:test";

import { buildCitation } from "../src/modules/knowledge/domain/citation.ts";
import { parseOfficialReferenceDocument } from "../src/modules/knowledge/domain/official-reference-importer.ts";

/**
 * Fixture curta e sintética — NUNCA o documento real (~9500 linhas).
 * Reproduz deliberadamente os dois artefatos reais encontrados na
 * conversão do PDF do MEC: um heading sem texto próprio antes de suas
 * subseções, e um heading duplicado consecutivo (running header).
 */
const FIXTURE_OK = `---
title: "Documento de Teste"
publisher: "Órgão de Teste"
edition: "1ª edição"
place: "Cidade Teste, UF"
date: "2026-01"
language: "pt-BR"
source_format: "PDF"
---

# Documento de Teste

<!-- Página 1 do PDF original -->

## Capítulo 1: Introdução

<!-- Página 2 do PDF original -->

Texto do capítulo 1.

### 1.1 Contexto

Texto da seção 1.1, ainda na página 2.

<!-- Página 3 do PDF original -->

Continuação da seção 1.1, agora na página 3.

## Capítulo 2: Desafios

<!-- Página 4 do PDF original -->

### 2.1 Desafios
### 2.1 Desafios

Texto real do desafio, após o heading duplicado.
`;

const FIXTURE_WITHOUT_PAGE_MARKER = `---
title: "Documento Sem Página"
publisher: "Órgão de Teste"
edition: "1ª edição"
place: "Cidade Teste, UF"
date: "2026-01"
language: "pt-BR"
source_format: "PDF"
---

# Documento Sem Página

## Capítulo 1: Sem Marcador

Texto sem nenhum marcador de página antes dele.
`;

const OPTIONS = {
  sourceId: "source-teste-manual",
  publisherShortName: "OT",
  rightsStatement: "Documento de teste; direitos fictícios só para fins de fixture.",
};
const NOW = "2026-07-30T00:00:00.000Z";

test("é síncrona — não pode estar fazendo I/O de rede ou de banco", () => {
  const result = parseOfficialReferenceDocument(FIXTURE_OK, OPTIONS, NOW);
  assert.equal(result instanceof Promise, false);
});

test("classifica o documento como global, sem institution_id, sem licença aberta alegada", () => {
  const { document } = parseOfficialReferenceDocument(FIXTURE_OK, OPTIONS, NOW);
  assert.equal(document.scope, "global");
  assert.equal(document.institutionId, null);
  assert.equal(document.category, "official_reference");
  assert.equal(document.license, null);
});

test("registra autoria institucional, direitos e checksum — nunca licença aberta inventada", () => {
  const { details } = parseOfficialReferenceDocument(FIXTURE_OK, OPTIONS, NOW);
  assert.equal(details.institutionalAuthor, "Órgão de Teste");
  assert.equal(details.rightsStatement, OPTIONS.rightsStatement);
  assert.match(details.checksum, /^[0-9a-f]{64}$/);
});

test("reconhece páginas do documento original via carry-forward dos marcadores", () => {
  const { units } = parseOfficialReferenceDocument(FIXTURE_OK, OPTIONS, NOW);
  const byChapterAndSection = (chapter, section) =>
    units.find((unit) => unit.chapter === chapter && unit.section === section);

  const chapter1 = byChapterAndSection("Capítulo 1: Introdução", null);
  assert.ok(chapter1, "unidade do capítulo 1 deveria existir");
  assert.equal(chapter1.originalStartPage, 1);
  assert.equal(chapter1.originalEndPage, 2);

  const section11 = byChapterAndSection("Capítulo 1: Introdução", "1.1 Contexto");
  assert.ok(section11, "unidade da seção 1.1 deveria existir");
  assert.equal(section11.originalStartPage, 2);
  assert.equal(section11.originalEndPage, 3);
});

test("preserva a ordem de leitura via sequence", () => {
  const { units } = parseOfficialReferenceDocument(FIXTURE_OK, OPTIONS, NOW);
  const sequences = units.map((unit) => unit.sequence);
  const sorted = [...sequences].sort((a, b) => a - b);
  assert.deepEqual(sequences, sorted);
});

test("descarta (sem quebrar) unidades sem texto entre headings consecutivos ou duplicados", () => {
  const { units, skippedEmptyUnitCount } = parseOfficialReferenceDocument(FIXTURE_OK, OPTIONS, NOW);
  assert.equal(skippedEmptyUnitCount, 2);
  for (const unit of units) {
    assert.ok(unit.text.trim().length > 0);
  }
});

test("classifica tópicos apenas pela própria hierarquia de headings do documento", () => {
  const { units } = parseOfficialReferenceDocument(FIXTURE_OK, OPTIONS, NOW);
  const section11 = units.find((unit) => unit.section === "1.1 Contexto");
  assert.deepEqual(section11.topics, ["capitulo-1-introducao", "contexto"]);
});

test("é determinístico e idempotente — mesma entrada produz mesma saída, mesmos ids", () => {
  const first = parseOfficialReferenceDocument(FIXTURE_OK, OPTIONS, NOW);
  const second = parseOfficialReferenceDocument(FIXTURE_OK, OPTIONS, NOW);
  assert.equal(first.documentId, second.documentId);
  assert.deepEqual(
    first.units.map((unit) => unit.id),
    second.units.map((unit) => unit.id),
  );
  assert.deepEqual(
    first.units.map((unit) => unit.checksum),
    second.units.map((unit) => unit.checksum),
  );
  assert.equal(first.details.checksum, second.details.checksum);
});

test("previne unidades duplicadas dentro da mesma importação — ids de sequence únicos", () => {
  const { units } = parseOfficialReferenceDocument(FIXTURE_OK, OPTIONS, NOW);
  const ids = units.map((unit) => unit.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("produz uma citação válida a partir de uma unidade importada", () => {
  const { document, details, units } = parseOfficialReferenceDocument(FIXTURE_OK, OPTIONS, NOW);
  const citation = buildCitation(document, details, units[0]);
  assert.match(citation.formattedReference, /^Órgão de Teste\./);
});

test("falha com segurança quando uma seção não pode ser associada a nenhuma página", () => {
  assert.throws(
    () => parseOfficialReferenceDocument(FIXTURE_WITHOUT_PAGE_MARKER, OPTIONS, NOW),
    /página com segurança/,
  );
});

test("rejeita documento sem frontmatter YAML", () => {
  assert.throws(
    () => parseOfficialReferenceDocument("# Sem frontmatter\n\nTexto solto.", OPTIONS, NOW),
    /frontmatter/,
  );
});

test("rejeita frontmatter sem um campo obrigatório", () => {
  const withoutPublisher = FIXTURE_OK.replace('publisher: "Órgão de Teste"\n', "");
  assert.throws(
    () => parseOfficialReferenceDocument(withoutPublisher, OPTIONS, NOW),
    /publisher/,
  );
});
