/**
 * Knowledge Engine — núcleo de conhecimento da plataforma (materializa
 * a entidade `Biblioteca` de docs/DOMAIN_MODEL.md, contexto Acervo,
 * decomposta em entidades endereçáveis, mesmo padrão de AUTHORING_MODEL.md
 * para Missão). Organiza todos os recursos usados na geração de aulas —
 * não é upload de arquivo, é curadoria com metadados pedagógicos.
 *
 * Escopo (docs/DOMAIN_MODEL.md, "Biblioteca: escopo IAH/escola"): a
 * maioria dos recursos nasce `"global"` (catálogo oficial IAH, mesma
 * exceção multi-tenant já aplicada a `Mission`, docs/PERSISTENCE.md);
 * `"institution"` existe para quando uma escola quiser curar sua própria
 * coleção, sem exigir isso na v1.
 */

/** As 13 categorias iniciais de recurso (Sprint M11). */
export type KnowledgeResourceType =
  | "artigo"
  | "pdf"
  | "slides"
  | "video"
  | "estudo_de_caso"
  | "lei"
  | "normativa"
  | "pesquisa"
  | "infografico"
  | "site"
  | "livro"
  | "material_professor"
  | "material_aluno";

/** Rótulos legíveis das categorias — usado para agrupar recursos na interface (Sprint M13). */
export const KNOWLEDGE_RESOURCE_TYPE_LABEL: Record<KnowledgeResourceType, string> = {
  artigo: "Artigos",
  pdf: "PDFs",
  slides: "Slides",
  video: "Vídeos",
  estudo_de_caso: "Estudos de Caso",
  lei: "Leis",
  normativa: "Normativas",
  pesquisa: "Pesquisas",
  infografico: "Infográficos",
  site: "Sites",
  livro: "Livros",
  material_professor: "Materiais do Professor",
  material_aluno: "Materiais do Aluno",
};

export type KnowledgeDifficultyLevel = "introdutorio" | "intermediario" | "avancado";

export type KnowledgeScope = "global" | "institution";

/**
 * Categoria adicional de um `KnowledgeDocument`. Hoje só existe
 * `"official_reference"` — documento oficial de um órgão externo
 * (ex.: referenciais do MEC), sempre `scope: "global"`, nunca
 * vinculado a uma instituição.
 */
export type KnowledgeDocumentCategory = "official_reference";

/**
 * Metadados comuns a todo recurso da Biblioteca — campo a campo da
 * lista da Sprint M11. Compartilhado por `KnowledgeDocument` (hoje o
 * único portador; futuro `KnowledgeSource` de coleções externas herda
 * o mesmo formato ao importar).
 */
export interface KnowledgeMetadata {
  title: string;
  resourceType: KnowledgeResourceType;
  author: string | null;
  sourceName: string | null;
  year: number | null;
  /** BCP 47 (ex.: "pt-BR"). */
  language: string;
  summary: string | null;
  keywords: string[];
  /** Códigos/rótulos BNCC — catálogo formal ainda não existe (D-029/D-030). */
  bnccCompetencies: string[];
  /** Idem, para a BNCC Computação (D-029/D-030). */
  bnccComputacaoCompetencies: string[];
  /** Ano escolar-alvo (ex.: "9º ano E.M."); null quando não se aplica. */
  grade: string | null;
  estimatedMinutes: number | null;
  difficultyLevel: KnowledgeDifficultyLevel | null;
  /** Licença de uso (ex.: "CC-BY-4.0", "Uso interno IAH"). */
  license: string | null;
  /**
   * Categoria opcional além de `resourceType` — hoje só distingue
   * "referencial oficial" (documento publicado por um órgão externo,
   * ex.: MEC) dos demais recursos, que ficam `null`.
   */
  category: KnowledgeDocumentCategory | null;
}

/** Origem de onde um `KnowledgeDocument` vem — manual ou integração futura. */
export type KnowledgeSourceKind =
  | "manual"
  | "notebooklm"
  | "google_drive"
  | "google_docs"
  | "youtube"
  | "openalex"
  | "scielo"
  | "crossref";

export interface KnowledgeSource {
  id: string;
  kind: KnowledgeSourceKind;
  /** Nome legível da origem (ex.: "Upload manual", "SciELO — busca por DOI"). */
  label: string;
  /** Identificador no sistema de origem, quando existir (DOI, fileId, videoId…). */
  externalId: string | null;
  url: string | null;
  /** `null` = nunca sincronizado (todas as integrações são stub nesta Sprint, D-034). */
  importedAt: string | null;
}

export type KnowledgeDocumentStatus = "draft" | "published" | "archived";

/** Um recurso endereçável da Biblioteca — a unidade central do Acervo. */
export interface KnowledgeDocument extends KnowledgeMetadata {
  id: string;
  scope: KnowledgeScope;
  institutionId: string | null;
  sourceId: string;
  collectionIds: string[];
  tagIds: string[];
  topicIds: string[];
  status: KnowledgeDocumentStatus;
  /** Referência ao conteúdo em si (URL ou futuro caminho de arquivo) — sem upload real nesta Sprint. */
  contentRef: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Curadoria — agrupa Documentos sem duplicá-los (DOMAIN_MODEL.md, Biblioteca). */
export interface KnowledgeCollection {
  id: string;
  title: string;
  description: string | null;
  documentIds: string[];
}

/** Rótulo livre, reutilizável entre Documentos. */
export interface KnowledgeTag {
  id: string;
  label: string;
}

/** Tema/subtema — hierarquia simples de um nível (DOMAIN_MODEL.md, "Tema"). */
export interface KnowledgeTopic {
  id: string;
  label: string;
  parentTopicId: string | null;
}

export type KnowledgeReferenceRelation = "lesson" | "mission";

/**
 * O vínculo direto entre a Biblioteca e a Lesson (D-028) ou a Mission
 * Flow (`modules/library`) — a relação pedida pela Sprint M11. Uma
 * entidade própria (em vez de um array de ids solto) porque o vínculo
 * carrega contexto (`note`: por que este recurso foi anexado ali).
 */
export interface KnowledgeReference {
  id: string;
  documentId: string;
  relation: KnowledgeReferenceRelation;
  /** Presente quando `relation === "lesson"` — id de uma `Lesson` (D-028, ainda conceitual). */
  lessonId: string | null;
  /** Presente quando `relation === "mission"` — id de uma `Mission` (`modules/library`). */
  missionId: string | null;
  note: string | null;
}

/**
 * Metadados bibliográficos de um documento oficial (`KnowledgeDocument`
 * com `category: "official_reference"`) — extensão 1:1, não duplica
 * nada de `KnowledgeMetadata`. `rightsStatement` é uma descrição
 * textual dos direitos observados na fonte (nunca uma alegação de
 * licença aberta que não foi verificada — ver
 * docs/product/mec-referencial-ia-2026-integration.md).
 */
export interface OfficialReferenceDetails {
  documentId: string;
  institutionalAuthor: string;
  publisher: string;
  /** Abreviação usada na citação formatada (ex.: "MEC"). */
  publisherShortName: string;
  edition: string;
  publicationPlace: string;
  /** "YYYY" ou "YYYY-MM". */
  publicationDate: string;
  originalFormat: string;
  workingFormat: string;
  rightsStatement: string;
  checksum: string;
  version: number;
}

export function createOfficialReferenceDetails(
  input: Omit<OfficialReferenceDetails, "version"> & { version?: number },
): OfficialReferenceDetails {
  const required: Array<[string, string]> = [
    ["documentId", input.documentId],
    ["institutionalAuthor", input.institutionalAuthor],
    ["publisher", input.publisher],
    ["publisherShortName", input.publisherShortName],
    ["edition", input.edition],
    ["publicationPlace", input.publicationPlace],
    ["publicationDate", input.publicationDate],
    ["originalFormat", input.originalFormat],
    ["workingFormat", input.workingFormat],
    ["rightsStatement", input.rightsStatement],
    ["checksum", input.checksum],
  ];
  for (const [field, value] of required) {
    if (!value || !value.trim()) {
      throw new Error(`OfficialReferenceDetails.${field} não pode ser vazio.`);
    }
  }
  const version = input.version ?? 1;
  if (version < 1) {
    throw new Error("OfficialReferenceDetails.version deve ser >= 1.");
  }
  return { ...input, version };
}

/**
 * Natureza do texto de uma `KnowledgeDocumentUnit` — distinção
 * obrigatória entre o texto original da fonte e qualquer leitura
 * curada sobre ele, para nunca apresentar síntese como se fosse o
 * documento oficial.
 */
export const KNOWLEDGE_UNIT_CONTENT_NATURES = [
  "original_source",
  "curated_summary",
  "institutional_mapping",
  "ai_suggestion",
] as const;
export type KnowledgeUnitContentNature = (typeof KNOWLEDGE_UNIT_CONTENT_NATURES)[number];

/**
 * Unidade de conteúdo endereçável e citável de um `KnowledgeDocument`
 * — tipicamente um capítulo/seção/subseção do documento original,
 * ancorada num intervalo de páginas real (nunca inventado).
 */
export interface KnowledgeDocumentUnit {
  id: string;
  documentId: string;
  chapter: string | null;
  section: string | null;
  subsection: string | null;
  originalStartPage: number;
  originalEndPage: number;
  text: string;
  contentNature: KnowledgeUnitContentNature;
  /** Derivados da própria estrutura de headings do documento — nunca de uma taxonomia externa. */
  topics: string[];
  educationalStages: string[];
  /** Posição de leitura dentro do documento (0-based). */
  sequence: number;
  checksum: string;
}

export function createKnowledgeDocumentUnit(
  input: Omit<KnowledgeDocumentUnit, "id"> & { id: string },
): KnowledgeDocumentUnit {
  if (!input.text || !input.text.trim()) {
    throw new Error("KnowledgeDocumentUnit.text não pode ser vazio.");
  }
  if (input.originalStartPage < 1) {
    throw new Error("KnowledgeDocumentUnit.originalStartPage deve ser >= 1.");
  }
  if (input.originalEndPage < input.originalStartPage) {
    throw new Error(
      "KnowledgeDocumentUnit.originalEndPage não pode ser menor que originalStartPage.",
    );
  }
  if (input.sequence < 0) {
    throw new Error("KnowledgeDocumentUnit.sequence deve ser >= 0.");
  }
  if (!input.checksum || !input.checksum.trim()) {
    throw new Error("KnowledgeDocumentUnit.checksum não pode ser vazio.");
  }
  return { ...input };
}
