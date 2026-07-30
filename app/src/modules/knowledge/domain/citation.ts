/**
 * Contrato de citação para `KnowledgeDocumentUnit`s de documentos
 * oficiais (`category: "official_reference"`). Função pura — sem
 * acesso a banco, sem IA — usada por qualquer módulo que precise
 * citar um trecho de um referencial (DocentIAH, MentorIAH,
 * Planejamento, Biblioteca) sem reimplementar a formatação.
 *
 * `buildCitation` recusa páginas inconsistentes (fail-fast) em vez de
 * gerar uma citação com um número de página que não pode ter vindo do
 * documento original.
 */

import type { KnowledgeDocumentUnit, KnowledgeUnitContentNature, OfficialReferenceDetails } from "./entities";

export interface Citation {
  documentId: string;
  title: string;
  authorOrPublisher: string;
  edition: string;
  year: string;
  pageRange: string;
  chapter: string | null;
  section: string | null;
  excerpt: string;
  contentNature: KnowledgeUnitContentNature;
  /** Referência formatada, estilo ABNT: "Autor. Título. Edição. Local: Sigla, Ano, p. X." */
  formattedReference: string;
}

export interface CitationDocumentInput {
  id: string;
  title: string;
}

/**
 * `unit.originalStartPage`/`originalEndPage` precisam ser >= 1 e
 * consistentes entre si — a mesma validação já feita em
 * `createKnowledgeDocumentUnit`, repetida aqui porque `buildCitation`
 * pode receber dados vindos de fora do factory (ex.: de um
 * repositório) e não deve confiar cegamente neles.
 */
export function buildCitation(
  document: CitationDocumentInput,
  details: OfficialReferenceDetails,
  unit: Pick<
    KnowledgeDocumentUnit,
    "chapter" | "section" | "originalStartPage" | "originalEndPage" | "text" | "contentNature"
  >,
): Citation {
  if (unit.originalStartPage < 1) {
    throw new Error("Não é possível citar: originalStartPage inválida (< 1).");
  }
  if (unit.originalEndPage < unit.originalStartPage) {
    throw new Error(
      "Não é possível citar: originalEndPage é menor que originalStartPage.",
    );
  }

  const year = extractYear(details.publicationDate);
  const pageRange =
    unit.originalStartPage === unit.originalEndPage
      ? `p. ${unit.originalStartPage}`
      : `p. ${unit.originalStartPage}-${unit.originalEndPage}`;

  const formattedReference =
    `${details.institutionalAuthor}. ${document.title}. ${details.edition}. ` +
    `${details.publicationPlace}: ${details.publisherShortName}, ${year}, ${pageRange}.`;

  return {
    documentId: document.id,
    title: document.title,
    authorOrPublisher: details.institutionalAuthor,
    edition: details.edition,
    year,
    pageRange,
    chapter: unit.chapter,
    section: unit.section,
    excerpt: unit.text,
    contentNature: unit.contentNature,
    formattedReference,
  };
}

function extractYear(publicationDate: string): string {
  const match = /^(\d{4})/.exec(publicationDate);
  if (!match) {
    throw new Error(
      `Não é possível citar: publicationDate "${publicationDate}" não começa com um ano de 4 dígitos.`,
    );
  }
  return match[1];
}
