import type {
  CorrelatedLessonContent,
  EducationLevel,
  IdentifiedContextSnapshot,
  KnowledgeReference,
  SelectedConnection,
} from "./entities";

export interface IdentifyConceptContextInput {
  /** Termo digitado ou escolhido pelo professor — um tema amplo ou um conceito específico. */
  term: string;
  disciplineSlug?: string;
  educationLevel?: EducationLevel;
  grade?: string;
}

export interface IdentifyConceptContextResult {
  context: IdentifiedContextSnapshot;
  references: KnowledgeReference[];
}

export interface SuggestIahConnectionsInput {
  context: IdentifiedContextSnapshot;
  /** 3 na primeira exibição, até 7 com "Ver outras conexões". */
  limit: number;
}

export interface SuggestIahConnectionsResult {
  connections: SelectedConnection[];
  references: KnowledgeReference[];
}

export interface GenerateCorrelatedLessonInput {
  sourceSubjectName: string;
  sourceTopic: string;
  sourceConcept: string | null;
  educationLevel: EducationLevel;
  grade: string;
  context: IdentifiedContextSnapshot;
  selectedConnections: SelectedConnection[];
  guidingQuestion: string;
}

export interface GenerateCorrelatedLessonResult {
  lesson: CorrelatedLessonContent;
}

/**
 * Sintetizador e organizador das fontes de conhecimento — nunca fonte
 * primária. A implementação demonstrativa (`providers/demo-curriculum-
 * connection-provider.ts`) é determinística e consulta as quatro
 * `KnowledgeSource`; uma implementação futura pode delegar a etapa de
 * síntese/redação a um LLM real, mantendo este mesmo contrato.
 */
export interface CurriculumConnectionProvider {
  identifyConceptContext(input: IdentifyConceptContextInput): Promise<IdentifyConceptContextResult>;
  suggestIahConnections(input: SuggestIahConnectionsInput): Promise<SuggestIahConnectionsResult>;
  generateCorrelatedLesson(input: GenerateCorrelatedLessonInput): Promise<GenerateCorrelatedLessonResult>;
}
