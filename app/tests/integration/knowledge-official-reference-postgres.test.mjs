import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { buildCitation } from "../../src/modules/knowledge/domain/citation.ts";
import { parseOfficialReferenceDocument } from "../../src/modules/knowledge/domain/official-reference-importer.ts";
import {
  createPostgresKnowledgeDocumentUnitRepository,
  createPostgresOfficialReferenceRepository,
} from "../../src/modules/knowledge/infrastructure/database/postgres-official-reference-driver.ts";
import { createOfficialReferenceIngestionService } from "../../src/modules/knowledge/services/official-reference-ingestion-service.ts";
import { pool } from "./support/postgres-test-setup.mjs";

const OPTIONS_BASE_SOURCE_ID = "source-teste-pg-manual";

/** `knowledge_documents.source_id` referencia `knowledge_sources` — precisa existir antes de qualquer ingestão. */
before(async () => {
  await pool.query(
    `insert into knowledge_sources (id, kind, label, external_id, url, imported_at)
     values ($1, 'manual', 'Fonte de teste (integração PostgreSQL)', null, null, null)
     on conflict (id) do nothing`,
    [OPTIONS_BASE_SOURCE_ID],
  );
});

after(async () => {
  await pool.end();
});

let titleSeq = 0;
/** Cada teste usa um título único — evita colisão de chave natural entre casos que rodam em paralelo. */
function nextTitle() {
  titleSeq += 1;
  return `Documento de Teste PG ${process.pid}-${Date.now()}-${titleSeq}`;
}

const OPTIONS_BASE = {
  sourceId: OPTIONS_BASE_SOURCE_ID,
  publisherShortName: "OT",
  rightsStatement: "Documento de teste; direitos fictícios só para fins de fixture.",
};
const NOW = "2026-07-31T00:00:00.000Z";

/** Fixture curta e sintética — nunca o documento real. Duas unidades reais. */
function buildFixture({ title, edition = "1ª edição", date = "2026-01", bodyMarker = "" }) {
  return `---
title: "${title}"
publisher: "Órgão de Teste"
edition: "${edition}"
place: "Cidade Teste, UF"
date: "${date}"
language: "pt-BR"
source_format: "PDF"
---

# ${title}

<!-- Página 1 do PDF original -->

## Capítulo 1: Introdução

<!-- Página 2 do PDF original -->

Texto do capítulo 1.${bodyMarker}

### 1.1 Contexto

<!-- Página 3 do PDF original -->

Texto da seção 1.1.
`;
}

function parse(fixtureText, options = OPTIONS_BASE) {
  return parseOfficialReferenceDocument(fixtureText, options, NOW);
}

async function ingest(parsed) {
  const service = createOfficialReferenceIngestionService(pool);
  return service.ingest(parsed);
}

// ---------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------

test("schema: knowledge_official_references e knowledge_document_units existem", async () => {
  const { rows } = await pool.query(
    `select table_name from information_schema.tables
     where table_name in ('knowledge_official_references', 'knowledge_document_units')`,
  );
  assert.equal(rows.length, 2);
});

test("schema: coluna category existe em knowledge_documents", async () => {
  const { rows } = await pool.query(
    `select 1 from information_schema.columns
     where table_name = 'knowledge_documents' and column_name = 'category'`,
  );
  assert.equal(rows.length, 1);
});

test("schema: RLS habilitada nas duas tabelas novas", async () => {
  const { rows } = await pool.query(
    `select relname, relrowsecurity from pg_class
     where relname in ('knowledge_official_references', 'knowledge_document_units')`,
  );
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.equal(row.relrowsecurity, true, `${row.relname} deveria ter RLS habilitada`);
  }
});

// ---------------------------------------------------------------------
// Ingestão real — inserção, ordem, páginas, checksum, escopo
// ---------------------------------------------------------------------

test("ingestão real: insere referência e as unidades esperadas", async () => {
  const title = nextTitle();
  const parsed = parse(buildFixture({ title }));
  const result = await ingest(parsed);

  assert.equal(result.outcome, "ingested");
  assert.equal(result.unitCount, 2);
  assert.deepEqual(result.pageRange, { min: 1, max: 3 });

  const unitRepository = createPostgresKnowledgeDocumentUnitRepository(pool);
  const units = await unitRepository.listByDocument(result.documentId);
  assert.equal(units.length, 2);
});

test("ingestão real: escopo global, institution_id null, license null", async () => {
  const title = nextTitle();
  const parsed = parse(buildFixture({ title }));
  const result = await ingest(parsed);

  const { rows } = await pool.query(
    "select scope, institution_id, license, category from knowledge_documents where id = $1",
    [result.documentId],
  );
  assert.equal(rows[0].scope, "global");
  assert.equal(rows[0].institution_id, null);
  assert.equal(rows[0].license, null);
  assert.equal(rows[0].category, "official_reference");
});

test("ingestão real: preserva ordem (sequence), páginas e checksum de cada unidade", async () => {
  const title = nextTitle();
  const parsed = parse(buildFixture({ title }));
  const result = await ingest(parsed);

  const unitRepository = createPostgresKnowledgeDocumentUnitRepository(pool);
  const units = await unitRepository.listByDocument(result.documentId);
  const sequences = units.map((u) => u.sequence);
  assert.deepEqual(sequences, [...sequences].sort((a, b) => a - b));

  for (const unit of units) {
    const expected = parsed.units.find((u) => u.id === unit.id);
    assert.ok(expected);
    assert.equal(unit.originalStartPage, expected.originalStartPage);
    assert.equal(unit.originalEndPage, expected.originalEndPage);
    assert.equal(unit.checksum, expected.checksum);
  }
});

test("ingestão real: citação é recuperável a partir de uma unidade persistida", async () => {
  const title = nextTitle();
  const parsed = parse(buildFixture({ title }));
  const result = await ingest(parsed);

  const referenceRepository = createPostgresOfficialReferenceRepository(pool);
  const unitRepository = createPostgresKnowledgeDocumentUnitRepository(pool);
  const details = await referenceRepository.getByDocumentId(result.documentId);
  const units = await unitRepository.listByDocument(result.documentId);

  const citation = buildCitation({ id: result.documentId, title }, details, units[0]);
  assert.match(citation.formattedReference, /^Órgão de Teste\./);
});

// ---------------------------------------------------------------------
// Idempotência, conflito de checksum, nova edição
// ---------------------------------------------------------------------

test("idempotência: reingerir o mesmo documento não duplica nada", async () => {
  const title = nextTitle();
  const fixtureText = buildFixture({ title });

  const first = await ingest(parse(fixtureText));
  const second = await ingest(parse(fixtureText));

  assert.equal(first.outcome, "ingested");
  assert.equal(second.outcome, "already_ingested");
  assert.equal(second.documentId, first.documentId);
  assert.equal(second.unitCount, first.unitCount);

  const { rows } = await pool.query(
    "select count(*)::int as count from knowledge_document_units where document_id = $1",
    [first.documentId],
  );
  assert.equal(rows[0].count, first.unitCount);
});

test("conflito de checksum: mesma chave natural, conteúdo diferente -> erro tipado, nada sobrescrito", async () => {
  const title = nextTitle();
  const originalParsed = parse(buildFixture({ title }));
  await ingest(originalParsed);

  const modified = parse(buildFixture({ title, bodyMarker: " Texto adicional que muda o checksum." }));
  assert.notEqual(modified.details.checksum, originalParsed.details.checksum);

  await assert.rejects(() => ingest(modified), /checksum/i);

  const { rows } = await pool.query(
    "select count(*)::int as count from knowledge_documents where title = $1",
    [title],
  );
  assert.equal(rows[0].count, 1, "nenhum segundo documento deveria ter sido criado");
});

test("nova edição: edição diferente cria uma referência independente, sem substituir a anterior", async () => {
  const title = nextTitle();
  const first = await ingest(parse(buildFixture({ title, edition: "1ª edição" })));
  const second = await ingest(parse(buildFixture({ title, edition: "2ª edição" })));

  assert.equal(first.outcome, "ingested");
  assert.equal(second.outcome, "ingested");
  assert.notEqual(first.documentId, second.documentId);

  const { rows } = await pool.query(
    "select count(*)::int as count from knowledge_documents where title = $1",
    [title],
  );
  assert.equal(rows[0].count, 2);
});

// ---------------------------------------------------------------------
// Rollback atômico
// ---------------------------------------------------------------------

test("rollback: falha ao inserir uma unidade reverte a transação inteira (nenhuma unidade órfã)", async () => {
  const title = nextTitle();
  const parsed = parse(buildFixture({ title }));
  // Força colisão de `sequence` (unique(document_id, sequence)) na segunda unidade.
  const poisoned = {
    ...parsed,
    units: [parsed.units[0], { ...parsed.units[1], sequence: parsed.units[0].sequence }],
  };

  await assert.rejects(() => ingest(poisoned));

  const { rows: documentRows } = await pool.query(
    "select count(*)::int as count from knowledge_documents where title = $1",
    [title],
  );
  assert.equal(documentRows[0].count, 0, "documento não deveria existir após rollback");

  const { rows: referenceRows } = await pool.query(
    "select count(*)::int as count from knowledge_official_references where document_id = $1",
    [parsed.documentId],
  );
  assert.equal(referenceRows[0].count, 0, "referência não deveria existir após rollback");

  const { rows: unitRows } = await pool.query(
    "select count(*)::int as count from knowledge_document_units where document_id = $1",
    [parsed.documentId],
  );
  assert.equal(unitRows[0].count, 0, "nenhuma unidade órfã deveria existir após rollback");
});

// ---------------------------------------------------------------------
// Natureza do conteúdo
// ---------------------------------------------------------------------

test("original_source e curated_summary ficam distinguíveis, nunca confundidos", async () => {
  const title = nextTitle();
  const result = await ingest(parse(buildFixture({ title })));

  const { rows } = await pool.query(
    "select content_nature from knowledge_document_units where document_id = $1",
    [result.documentId],
  );
  assert.ok(rows.every((r) => r.content_nature === "original_source"));

  // Uma unidade curada é um dado distinto, nunca produzido por este importador —
  // inserida aqui só para provar que o schema separa as duas naturezas.
  const unitRepository = createPostgresKnowledgeDocumentUnitRepository(pool);
  const curated = await unitRepository.save({
    id: `${result.documentId}-unit-curated-0`,
    documentId: result.documentId,
    chapter: null,
    section: null,
    subsection: null,
    originalStartPage: 1,
    originalEndPage: 1,
    text: "Síntese curada por um processo editorial humano, não o importador.",
    contentNature: "curated_summary",
    topics: [],
    educationalStages: [],
    sequence: 9999,
    checksum: "c".repeat(64),
  });
  assert.equal(curated.contentNature, "curated_summary");

  const { rows: naturesAfter } = await pool.query(
    "select distinct content_nature from knowledge_document_units where document_id = $1",
    [result.documentId],
  );
  const natures = naturesAfter.map((r) => r.content_nature).sort();
  assert.deepEqual(natures, ["curated_summary", "original_source"]);
});

// ---------------------------------------------------------------------
// Multi-tenancy e permissões
// ---------------------------------------------------------------------

test("institution_id falso é rejeitado — referência oficial nunca pode ser 'institution'", async () => {
  const title = nextTitle();
  const parsed = parse(buildFixture({ title }));
  await assert.rejects(
    () =>
      pool.query(
        `insert into knowledge_documents (
           id, scope, institution_id, source_id, title, resource_type, author,
           source_name, year, language, summary, keywords, bncc_competencies,
           bncc_computacao_competencies, grade, estimated_minutes, difficulty_level,
           license, category, status, content_ref, created_at, updated_at
         ) values ($1,'global',$2,$3,$4,'normativa',null,null,null,'pt-BR',null,'{}','{}','{}',null,null,null,null,'official_reference','draft',null,now(),now())`,
        ["fake-inst-check-" + parsed.documentId, "fake-institution-id", parsed.document.sourceId, title],
      ),
    /check/i,
  );
});

test("permissões: papel anon não consegue ler knowledge_document_units", async () => {
  const client = await pool.connect();
  try {
    await client.query("set role anon");
    await assert.rejects(() => client.query("select * from knowledge_document_units limit 1"));
  } finally {
    await client.query("reset role");
    client.release();
  }
});

test("permissões: papel authenticated não consegue ler knowledge_official_references", async () => {
  const client = await pool.connect();
  try {
    await client.query("set role authenticated");
    await assert.rejects(() => client.query("select * from knowledge_official_references limit 1"));
  } finally {
    await client.query("reset role");
    client.release();
  }
});

test("permissões: conexão padrão (papel server-side/dono) consegue ler as tabelas novas", async () => {
  const { rows } = await pool.query("select 1 from knowledge_document_units limit 1");
  assert.ok(Array.isArray(rows));
});
