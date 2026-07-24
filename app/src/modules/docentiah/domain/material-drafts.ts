/** Rascunhos estruturados gerados pelo Planejador Conversacional — sempre editáveis, nunca a versão final "pronta para exportar" (MVP). */

export interface LessonPlanDraft {
  title: string;
  context: string;
  objectives: string[];
  selectedSkills: string[];
  iahConnection: string | null;
  mobilization: string;
  development: string;
  activity: string;
  synthesis: string;
  assessment: string;
  materials: string[];
  teacherGuidance: string;
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
