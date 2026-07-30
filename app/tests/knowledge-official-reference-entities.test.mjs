import assert from "node:assert/strict";
import test from "node:test";

import {
  createKnowledgeDocumentUnit,
  createOfficialReferenceDetails,
} from "../src/modules/knowledge/domain/entities.ts";

function baseDetailsInput(overrides = {}) {
  return {
    documentId: "official-reference-abc123",
    institutionalAuthor: "Ministério da Educação",
    publisher: "Ministério da Educação",
    publisherShortName: "MEC",
    edition: "1ª edição",
    publicationPlace: "Brasília, DF",
    publicationDate: "2026-02",
    originalFormat: "PDF",
    workingFormat: "Markdown",
    rightsStatement:
      "Documento oficial do Ministério da Educação; direitos reservados ao MEC. Licença de distribuição não verificada.",
    checksum: "a".repeat(64),
    ...overrides,
  };
}

function baseUnitInput(overrides = {}) {
  return {
    id: "official-reference-abc123-unit-0",
    documentId: "official-reference-abc123",
    chapter: "1 Inteligência Artificial na Educação",
    section: null,
    subsection: null,
    originalStartPage: 10,
    originalEndPage: 12,
    text: "Texto original extraído do documento.",
    contentNature: "original_source",
    topics: ["inteligencia-artificial-na-educacao"],
    educationalStages: [],
    sequence: 0,
    checksum: "b".repeat(64),
    ...overrides,
  };
}

test("cria metadados de referência oficial válidos, version default 1", () => {
  const details = createOfficialReferenceDetails(baseDetailsInput());
  assert.equal(details.version, 1);
  assert.equal(details.institutionalAuthor, "Ministério da Educação");
});

test("rejeita institutionalAuthor vazio — autoria institucional é obrigatória", () => {
  assert.throws(
    () => createOfficialReferenceDetails(baseDetailsInput({ institutionalAuthor: "  " })),
    /institutionalAuthor/,
  );
});

test("rejeita rightsStatement vazio — direitos precisam ser registrados, nunca omitidos", () => {
  assert.throws(
    () => createOfficialReferenceDetails(baseDetailsInput({ rightsStatement: "" })),
    /rightsStatement/,
  );
});

test("rejeita checksum vazio", () => {
  assert.throws(
    () => createOfficialReferenceDetails(baseDetailsInput({ checksum: "" })),
    /checksum/,
  );
});

test("rejeita version < 1", () => {
  assert.throws(
    () => createOfficialReferenceDetails(baseDetailsInput({ version: 0 })),
    /version/,
  );
});

test("cria uma unidade de conteúdo válida", () => {
  const unit = createKnowledgeDocumentUnit(baseUnitInput());
  assert.equal(unit.contentNature, "original_source");
  assert.equal(unit.originalStartPage, 10);
});

test("rejeita texto vazio — nenhuma unidade sem conteúdo real", () => {
  assert.throws(() => createKnowledgeDocumentUnit(baseUnitInput({ text: "   " })), /text/);
});

test("rejeita originalStartPage < 1 — nunca uma página inexistente", () => {
  assert.throws(
    () => createKnowledgeDocumentUnit(baseUnitInput({ originalStartPage: 0 })),
    /originalStartPage/,
  );
});

test("rejeita originalEndPage menor que originalStartPage", () => {
  assert.throws(
    () =>
      createKnowledgeDocumentUnit(
        baseUnitInput({ originalStartPage: 20, originalEndPage: 10 }),
      ),
    /originalEndPage/,
  );
});

test("rejeita sequence negativa", () => {
  assert.throws(
    () => createKnowledgeDocumentUnit(baseUnitInput({ sequence: -1 })),
    /sequence/,
  );
});

test("distingue content nature — original_source nunca é confundido com curated_summary", () => {
  const original = createKnowledgeDocumentUnit(baseUnitInput({ contentNature: "original_source" }));
  const curated = createKnowledgeDocumentUnit(
    baseUnitInput({ id: "unit-2", sequence: 1, contentNature: "curated_summary" }),
  );
  assert.notEqual(original.contentNature, curated.contentNature);
});
