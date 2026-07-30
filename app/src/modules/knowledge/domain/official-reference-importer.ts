/**
 * Importador determinístico de documentos oficiais (ex.: referenciais
 * publicados pelo MEC) convertidos para Markdown com marcadores de
 * página preservados (`<!-- Página N do PDF original -->`).
 *
 * Regras (Micro Missão "Referencial MEC"):
 *  - Função pura: sem chamada de IA, sem rede, sem banco de dados.
 *  - Determinística e idempotente: o mesmo texto de entrada sempre
 *    produz o mesmo `documentId`, os mesmos ids de unidade e os
 *    mesmos checksums — nunca um id aleatório.
 *  - Falha (lança erro) em vez de inventar uma página quando uma
 *    seção não pode ser associada a nenhum marcador de página visto
 *    até aquele ponto do documento.
 *  - Todo texto extraído é classificado como `"original_source"` —
 *    este importador nunca gera síntese; qualquer leitura curada é um
 *    processo humano/editorial separado, registrado com outra
 *    `contentNature`.
 *  - Tópicos são derivados apenas da própria hierarquia de headings do
 *    documento (`topic-classification.ts`) — nunca de uma taxonomia
 *    externa nem de leitura semântica do texto.
 */

import { createHash } from "node:crypto";
import {
  createKnowledgeDocumentUnit,
  createOfficialReferenceDetails,
  type KnowledgeDocument,
  type KnowledgeDocumentUnit,
  type OfficialReferenceDetails,
} from "./entities.ts";
import { deriveStructuralTopics } from "./topic-classification.ts";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const PAGE_MARKER_PATTERN = /^<!--\s*Página\s+(\d+)\s+do PDF original\s*-->\s*$/;
const HEADING_PATTERN = /^(#{1,4})\s+(.+?)\s*$/;

const REQUIRED_FRONTMATTER_KEYS = [
  "title",
  "publisher",
  "edition",
  "place",
  "date",
  "language",
  "source_format",
] as const;

export interface OfficialReferenceFrontmatter {
  title: string;
  publisher: string;
  edition: string;
  place: string;
  date: string;
  language: string;
  sourceFormat: string;
}

export interface OfficialReferenceImportOptions {
  /** -> `KnowledgeSource.id` (ex.: um `knowledge_sources` com `kind: "manual"`) — precisa já existir, este importador não o cria. */
  sourceId: string;
  /** Abreviação usada na citação formatada (ex.: "MEC") — não está no frontmatter da fonte. */
  publisherShortName: string;
  /** Julgamento editorial sobre direitos observados na fonte — nunca inventado, sempre fornecido explicitamente. */
  rightsStatement: string;
  /** Default: `frontmatter.publisher`. Só informe se o autor institucional formal divergir do publicador. */
  institutionalAuthor?: string;
}

export interface OfficialReferenceImportResult {
  documentId: string;
  frontmatter: OfficialReferenceFrontmatter;
  /**
   * `scope: "global"`, `institutionId: null`, `category: "official_reference"`,
   * `license: null` — nunca alega licenciamento aberto; `status: "draft"`
   * por padrão (publicar é decisão editorial, não automática).
   */
  document: KnowledgeDocument;
  details: OfficialReferenceDetails;
  units: KnowledgeDocumentUnit[];
  /**
   * Unidades descartadas por não terem texto algum entre um heading e
   * o próximo (ex.: headings duplicados por artefato de conversão de
   * PDF) — não é um erro, mas é reportado para auditoria.
   */
  skippedEmptyUnitCount: number;
}

export function parseOfficialReferenceDocument(
  rawText: string,
  options: OfficialReferenceImportOptions,
  now: string,
): OfficialReferenceImportResult {
  const { frontmatter, body } = extractFrontmatter(rawText);
  const checksum = sha256(rawText);
  const documentId = `official-reference-${checksum.slice(0, 16)}`;

  const details = createOfficialReferenceDetails({
    documentId,
    institutionalAuthor: options.institutionalAuthor ?? frontmatter.publisher,
    publisher: frontmatter.publisher,
    publisherShortName: options.publisherShortName,
    edition: frontmatter.edition,
    publicationPlace: frontmatter.place,
    publicationDate: frontmatter.date,
    originalFormat: frontmatter.sourceFormat,
    workingFormat: "Markdown",
    rightsStatement: options.rightsStatement,
    checksum,
  });

  const document: KnowledgeDocument = {
    id: documentId,
    title: frontmatter.title,
    resourceType: "normativa",
    author: null,
    sourceName: frontmatter.publisher,
    year: extractYear(frontmatter.date),
    language: frontmatter.language,
    summary: null,
    keywords: [],
    bnccCompetencies: [],
    bnccComputacaoCompetencies: [],
    grade: null,
    estimatedMinutes: null,
    difficultyLevel: null,
    license: null,
    category: "official_reference",
    scope: "global",
    institutionId: null,
    sourceId: options.sourceId,
    collectionIds: [],
    tagIds: [],
    topicIds: [],
    status: "draft",
    contentRef: null,
    createdAt: now,
    updatedAt: now,
  };

  const { units, skippedEmptyUnitCount } = parseUnits(body, documentId);

  return { documentId, frontmatter, document, details, units, skippedEmptyUnitCount };
}

function extractYear(publicationDate: string): number | null {
  const match = /^(\d{4})/.exec(publicationDate);
  return match ? Number(match[1]) : null;
}

function extractFrontmatter(rawText: string): {
  frontmatter: OfficialReferenceFrontmatter;
  body: string;
} {
  const match = FRONTMATTER_PATTERN.exec(rawText);
  if (!match) {
    throw new Error(
      "Documento sem frontmatter YAML no formato esperado (bloco --- ... --- no início do arquivo).",
    );
  }
  const raw: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([a-zA-Z_]+):\s*"?([^"]*?)"?\s*$/.exec(line);
    if (kv) {
      raw[kv[1]] = kv[2];
    }
  }
  for (const key of REQUIRED_FRONTMATTER_KEYS) {
    if (!raw[key] || !raw[key].trim()) {
      throw new Error(`Frontmatter do documento não tem o campo obrigatório "${key}".`);
    }
  }
  const frontmatter: OfficialReferenceFrontmatter = {
    title: raw.title,
    publisher: raw.publisher,
    edition: raw.edition,
    place: raw.place,
    date: raw.date,
    language: raw.language,
    sourceFormat: raw.source_format,
  };
  const body = rawText.slice(match[0].length);
  return { frontmatter, body };
}

interface UnitDraft {
  chapter: string | null;
  section: string | null;
  subsection: string | null;
  startPage: number | null;
  textLines: string[];
  sequence: number;
}

function parseUnits(
  body: string,
  documentId: string,
): { units: KnowledgeDocumentUnit[]; skippedEmptyUnitCount: number } {
  const units: KnowledgeDocumentUnit[] = [];
  let currentPage: number | null = null;
  let chapter: string | null = null;
  let section: string | null = null;
  let subsection: string | null = null;
  let draft: UnitDraft | null = null;
  let sequence = 0;
  let skippedEmptyUnitCount = 0;

  const closeDraft = (endPage: number | null) => {
    if (!draft) {
      return;
    }
    const text = draft.textLines.join("\n").trim();
    if (!text) {
      skippedEmptyUnitCount += 1;
      draft = null;
      return;
    }
    if (draft.startPage === null || endPage === null) {
      const label = draft.subsection ?? draft.section ?? draft.chapter ?? "(sem título)";
      throw new Error(
        `Não foi possível associar página com segurança à seção "${label}": nenhum marcador ` +
          `"<!-- Página N do PDF original -->" foi encontrado antes dela.`,
      );
    }
    const checksum = sha256(text);
    units.push(
      createKnowledgeDocumentUnit({
        id: `${documentId}-unit-${draft.sequence}`,
        documentId,
        chapter: draft.chapter,
        section: draft.section,
        subsection: draft.subsection,
        originalStartPage: draft.startPage,
        originalEndPage: endPage,
        text,
        contentNature: "original_source",
        topics: deriveStructuralTopics([draft.chapter, draft.section, draft.subsection]),
        educationalStages: [],
        sequence: draft.sequence,
        checksum,
      }),
    );
    draft = null;
  };

  for (const line of body.split(/\r?\n/)) {
    const pageMatch = PAGE_MARKER_PATTERN.exec(line);
    if (pageMatch) {
      currentPage = Number(pageMatch[1]);
      continue;
    }

    const headingMatch = HEADING_PATTERN.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      if (level === 1) {
        continue;
      }
      closeDraft(currentPage);
      if (level === 2) {
        chapter = text;
        section = null;
        subsection = null;
      } else if (level === 3) {
        section = text;
        subsection = null;
      } else {
        subsection = text;
      }
      draft = { chapter, section, subsection, startPage: currentPage, textLines: [], sequence: sequence++ };
      continue;
    }

    if (draft) {
      draft.textLines.push(line);
    }
  }
  closeDraft(currentPage);

  return { units, skippedEmptyUnitCount };
}

function sha256(text: string): string {
  return createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");
}
