import assert from "node:assert/strict";
import test from "node:test";

import { buildCitation } from "../src/modules/knowledge/domain/citation.ts";

const DOCUMENT = {
  id: "official-reference-abc123",
  title: "Referencial para Desenvolvimento e Uso Responsáveis de Inteligência Artificial na Educação",
};

const DETAILS = {
  documentId: "official-reference-abc123",
  institutionalAuthor: "Ministério da Educação",
  publisher: "Ministério da Educação",
  publisherShortName: "MEC",
  edition: "1ª edição",
  publicationPlace: "Brasília, DF",
  publicationDate: "2026-02",
  originalFormat: "PDF",
  workingFormat: "Markdown",
  rightsStatement: "Documento oficial do Ministério da Educação; direitos reservados ao MEC.",
  checksum: "a".repeat(64),
  version: 1,
};

function baseUnit(overrides = {}) {
  return {
    chapter: "2 Oportunidades e desafios",
    section: "2.2 Desafios",
    originalStartPage: 45,
    originalEndPage: 45,
    text: "Trecho original sobre vieses em sistemas de IA na educação.",
    contentNature: "original_source",
    ...overrides,
  };
}

test("formata citação com uma única página", () => {
  const citation = buildCitation(DOCUMENT, DETAILS, baseUnit());
  assert.equal(
    citation.formattedReference,
    "Ministério da Educação. Referencial para Desenvolvimento e Uso Responsáveis de Inteligência Artificial na Educação. 1ª edição. Brasília, DF: MEC, 2026, p. 45.",
  );
});

test("formata citação com intervalo de páginas", () => {
  const citation = buildCitation(
    DOCUMENT,
    DETAILS,
    baseUnit({ originalStartPage: 45, originalEndPage: 47 }),
  );
  assert.equal(citation.pageRange, "p. 45-47");
  assert.match(citation.formattedReference, /p\. 45-47\.$/);
});

test("preserva a natureza do conteúdo na citação", () => {
  const citation = buildCitation(DOCUMENT, DETAILS, baseUnit({ contentNature: "curated_summary" }));
  assert.equal(citation.contentNature, "curated_summary");
});

test("rejeita originalStartPage inválida — nunca gera citação com página inexistente", () => {
  assert.throws(
    () => buildCitation(DOCUMENT, DETAILS, baseUnit({ originalStartPage: 0, originalEndPage: 0 })),
    /originalStartPage/,
  );
});

test("rejeita originalEndPage menor que originalStartPage", () => {
  assert.throws(
    () =>
      buildCitation(DOCUMENT, DETAILS, baseUnit({ originalStartPage: 50, originalEndPage: 10 })),
    /originalEndPage/,
  );
});

test("rejeita publicationDate sem ano de 4 dígitos reconhecível", () => {
  assert.throws(
    () => buildCitation(DOCUMENT, { ...DETAILS, publicationDate: "s/d" }, baseUnit()),
    /publicationDate/,
  );
});
