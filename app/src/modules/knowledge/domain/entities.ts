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
