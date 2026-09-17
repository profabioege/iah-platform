/**
 * Módulo DocentIAH — recorte da candidata de apresentação: apenas o
 * domínio do Planejador Conversacional (brief da aula e rascunhos de
 * material). Persistência de materiais (repositórios em memória e
 * Supabase) não faz parte desta candidata: nada é salvo.
 */

export {
  CLASS_PROFILE_TAGS,
  createEmptyLessonPlanningBrief,
  requiredFieldsMissing,
  type ClassProfileTagId,
  type CurriculumSkillSuggestion,
  type IahConnectionSuggestion,
  type LessonPlanningBrief,
  type LessonPlanningStatus,
  type SupportMaterialType,
} from "./domain/lesson-planning-brief";

export type {
  ActivityFormat,
  ActivityKind,
  EssayQuestion,
  InfographicDraft,
  LessonPlanActivity,
  LessonPlanDevelopment,
  LessonPlanDraft,
  LessonPlanDraftStatus,
  LessonPlanIntroduction,
  LessonPlanKeyConcept,
  LessonPlanTopic,
  MindMapDraft,
  ObjectiveQuestion,
  ResearchTask,
} from "./domain/material-drafts";
