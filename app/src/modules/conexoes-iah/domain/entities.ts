/**
 * Conexões IAH (MVP) — domínio central. Um professor parte de um
 * conteúdo/conceito da sua disciplina e recebe conexões fundamentadas
 * com Inteligência Artificial & Humanidades, revisáveis antes de virar
 * uma aula de laboratório correlacionada.
 *
 * Reutiliza Institution/Teacher/Classroom/AcademicYear de
 * `modules/platform` e `GeneratedMaterial` de `modules/docentiah`
 * (a aula gerada persiste como `GeneratedMaterial` de tipo
 * `"laboratory_lesson"` — ver migration 20260722000100). Este módulo
 * só acrescenta o que ainda não existe: o registro da conexão
 * curricular e o vínculo com a aula gerada.
 */

/** Duplicação intencional e mínima do enum de etapas já usado em `lib/ai/prompts/docentiah/slides/schema.ts` — evita acoplar dois módulos de features independentes por um enum de rótulos. */
export const EDUCATION_LEVELS = [
  "ensino_fundamental_anos_iniciais",
  "ensino_fundamental_anos_finais",
  "ensino_medio",
] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];
export const EDUCATION_LEVEL_LABEL: Record<EducationLevel, string> = {
  ensino_fundamental_anos_iniciais: "Ensino Fundamental — Anos Iniciais",
  ensino_fundamental_anos_finais: "Ensino Fundamental — Anos Finais",
  ensino_medio: "Ensino Médio",
};

/** Séries/anos disponíveis para seleção, por etapa — evita casamento de texto livre contra o catálogo. */
export const GRADE_OPTIONS: Record<EducationLevel, string[]> = {
  ensino_fundamental_anos_iniciais: ["1º ano", "2º ano", "3º ano", "4º ano", "5º ano"],
  ensino_fundamental_anos_finais: ["6º ano", "7º ano", "8º ano", "9º ano"],
  ensino_medio: ["1ª série", "2ª série", "3ª série"],
};

export type ValidationStatus = "validated" | "in_review" | "draft";

export type KnowledgeSourceType =
  | "official_curriculum"
  | "institutional_curriculum"
  | "conceptual_reference"
  | "iah_curated_connection"
  | "teacher_material"
  | "uploaded_document"
  | "web_source";

/**
 * Registro de referência/citação — nome igual ao `KnowledgeReference` de
 * `modules/knowledge`, mas conceito diferente (lá é um vínculo
 * Documento↔Lição/Missão; aqui é uma citação de fonte). Como os dois
 * módulos não se importam um ao outro, não há colisão em tempo de
 * compilação — mantido documentado para quem for ler o código depois.
 */
export interface KnowledgeReference {
  id: string;
  sourceType: KnowledgeSourceType;
  title: string;
  organization: string;
  version: string;
  publicationDate: string | null;
  url: string | null;
  documentId: string | null;
  section: string;
  excerpt: string;
  retrievedAt: string;
  /** 0 a 1. */
  confidence: number;
  validationStatus: ValidationStatus;
}

/** Eixo temático do Método IAH — catálogo fechado e pequeno, curado editorialmente (não inferido). */
export interface IahAxis {
  id: string;
  slug: string;
  name: string;
  description: string;
}

/** Um registro do catálogo curricular mínimo: um tema/conteúdo de uma disciplina, numa etapa e série. */
export interface CurriculumCatalogEntry {
  id: string;
  disciplineSlug: string;
  disciplineName: string;
  educationLevel: EducationLevel;
  grade: string;
  topic: string;
  /** Conceitos associados a este tema — normalizados (ver `normalizeTerm`), usados no casamento por termo livre. */
  concepts: string[];
  referenceIds: string[];
  possibleIahAxisIds: string[];
  validationStatus: ValidationStatus;
}

/** Um registro da biblioteca conceitual interdisciplinar. */
export interface ConceptEntry {
  id: string;
  concept: string;
  /** Sinônimos/variações normalizadas usadas no casamento por termo livre. */
  keywords: string[];
  definition: string;
  theoristsOrTheories: string[];
  areas: string[];
  contexts: string[];
  relatedConcepts: string[];
  referenceIds: string[];
  validationStatus: ValidationStatus;
}

/** Uma conexão autoral curada entre um conceito curricular e um eixo IAH. */
export interface IahConnectionEntry {
  id: string;
  /** Termos normalizados que disparam esta conexão (concept + keywords do ConceptEntry de origem). */
  conceptKeywords: string[];
  iahAxisId: string;
  title: string;
  contemporaryProblem: string;
  /** Até duas frases. */
  rationale: string;
  investigativeQuestion: string;
  suggestedActivity: string;
  learningEvidence: string;
  referenceIds: string[];
  confidence: number;
  validationStatus: ValidationStatus;
}

export interface AmbiguousInterpretation {
  label: string;
  description: string;
}

/** Resumo do "Contexto identificado" (Etapa 2) — nunca inventado; vazio/baixa confiança quando não há correspondência segura. */
export interface IdentifiedContextSnapshot {
  term: string;
  normalizedTerm: string;
  matchedConceptIds: string[];
  relatedAreas: string[];
  curricularContext: string | null;
  associatedConcepts: string[];
  confidence: number;
  ambiguousInterpretations: AmbiguousInterpretation[];
  hasReliableMatch: boolean;
}

/** Uma conexão selecionada/editada/escrita pelo professor (Etapa 3). */
export interface SelectedConnection {
  /** null quando o professor escreveu a conexão do zero. */
  sourceConnectionEntryId: string | null;
  title: string;
  rationale: string;
  /** Base da pergunta norteadora sugerida (Etapa 5) — cai para `rationale` quando ausente (ex.: conexão própria). */
  investigativeQuestion: string;
  iahAxisId: string;
  pedagogicalApproach: string;
  referenceIds: string[];
  confidence: number;
  custom: boolean;
}

export type CurriculumConnectionStatus =
  | "rascunho"
  | "sugerida"
  | "revisada"
  | "aprovada"
  | "publicada"
  | "arquivada";

export interface CurriculumConnection {
  id: string;
  institutionId: string;
  classroomId: string | null;
  createdByTeacherId: string;
  /** Slug do catálogo de disciplinas deste módulo (`infrastructure/catalog/curriculum-catalog.ts`) — não é FK de `subjects`, já que a instituição hoje só tem uma Disciplina real (IA & Humanidades). */
  sourceSubjectId: string;
  sourceTeacherId: string | null;
  educationLevel: EducationLevel;
  grade: string;
  academicPeriod: string | null;
  sourceTopic: string;
  sourceConcept: string | null;
  identifiedContext: IdentifiedContextSnapshot;
  selectedReferenceIds: string[];
  iahAxisIds: string[];
  selectedConnections: SelectedConnection[];
  guidingQuestion: string;
  pedagogicalRationale: string;
  confidence: number;
  status: CurriculumConnectionStatus;
  promptVersion: string;
  createdAt: string;
  updatedAt: string;
}

/** Vínculo enxuto entre a Conexão e a aula gerada — o conteúdo em si vive em `GeneratedMaterial` (reuso, ver docentiah). */
export interface CorrelatedLesson {
  id: string;
  curriculumConnectionId: string;
  generatedMaterialId: string;
  status: CurriculumConnectionStatus;
  createdAt: string;
  updatedAt: string;
}

/** Conteúdo completo da Aula de laboratório correlacionada — vira `GeneratedMaterial.outputData`. */
export interface CorrelatedLessonContent {
  title: string;
  sourceDisciplineAndTopic: string;
  connectionWithIah: string;
  pedagogicalRationale: string;
  guidingQuestion: string;
  learningObjectives: string[];
  essentialConcepts: string[];
  priorKnowledge: string[];
  durationMinutes: number;
  initialMobilization: string;
  contextualization: string;
  investigationOrExperiment: string;
  studentProduction: string;
  socialization: string;
  synthesis: string;
  assessmentCriteria: string[];
  requiredMaterials: string[];
  teacherGuidance: string;
  possibleDifficulties: string[];
  interdisciplinaryExtensions: string[];
  references: KnowledgeReference[];
  warnings: string[];
}
