/** Rascunhos estruturados gerados pelo Planejador Conversacional — sempre editáveis, nunca a versão final "pronta para exportar" (MVP). */

export interface LessonPlanIntroduction {
  /** Contextualização real do tema — parágrafo autoexplicativo, não instrução ao professor. */
  contextualization: string;
  /** Perguntas prontas para levantar conhecimentos prévios da turma. */
  priorKnowledgeQuestions: string[];
  /** Exemplo, situação cotidiana ou pequeno caso concreto para abrir a aula. */
  openingExample: string;
  /** Nota curta de condução dos primeiros minutos (única parte dirigida ao professor). */
  teacherGuidance: string;
}

export interface LessonPlanTopic {
  title: string;
  explanation: string;
}

export interface LessonPlanKeyConcept {
  term: string;
  definition: string;
}

export interface LessonPlanDevelopment {
  topics: LessonPlanTopic[];
  keyConcepts: LessonPlanKeyConcept[];
  examples: string[];
  iahConnection: string | null;
  deepeningQuestions: string[];
  commonMisconceptions: string[];
}

export type ActivityFormat = "individual" | "dupla" | "grupo" | "pesquisa_orientada";
export type ActivityKind = "objective" | "essay" | "research" | "mixed";

export interface ObjectiveQuestion {
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  rationale: string;
  difficulty: string;
}

export interface EssayQuestion {
  prompt: string;
  cognitiveDemand: string;
  expectedAnswer: string;
  correctionCriteria: string[];
  suggestedScore: number | null;
}

export interface ResearchTask {
  centralQuestion: string;
  guidingQuestions: string[];
  recommendedSources: string[];
  expectedProduct: string;
  qualityCriteria: string[];
  verificationGuidance: string;
  authorshipNote: string;
}

export interface LessonPlanActivity {
  title: string;
  objective: string;
  instructions: string;
  durationMinutes: number;
  format: ActivityFormat;
  resources: string[];
  /** Qual conteúdo de atividade está em uso — os três formatos já vêm gerados; isto só decide o que é exibido/salvo. */
  activityKind: ActivityKind;
  objectiveQuestions: ObjectiveQuestion[];
  essayQuestions: EssayQuestion[];
  researchTask: ResearchTask | null;
  answerKey: string;
  correctionCriteria: string[];
}

export type LessonPlanDraftStatus = "draft";

export interface LessonPlanDraft {
  title: string;
  introduction: LessonPlanIntroduction;
  development: LessonPlanDevelopment;
  activity: LessonPlanActivity;
  sourceReferences: string[];
  status: LessonPlanDraftStatus;
}

export interface InfographicBlock {
  title: string;
  content: string;
}

export interface InfographicDraft {
  title: string;
  centralMessage: string;
  blocks: InfographicBlock[];
  dataOrConcepts: string[];
  visualHierarchy: string[];
  iconSuggestions: string[];
  sources: string[];
  palette: string;
}

export interface MindMapBranch {
  label: string;
  subBranches: string[];
}

export interface MindMapDraft {
  centralConcept: string;
  branches: MindMapBranch[];
  relations: string[];
  examples: string[];
  iahConnections: string[];
  curricularSkills: string[];
}
