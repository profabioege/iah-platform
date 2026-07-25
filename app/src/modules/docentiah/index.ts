/**
 * Módulo DocentIAH — persistência dos materiais gerados (D-047).
 * Mesmo padrão de 3 camadas de `modules/assessment`: contrato de
 * domínio → repositório em memória (demonstração) → repositório
 * Supabase (real), escolhidos por `isAuthConfigured()`.
 */

export type {
  AttachedContext,
  AttachedContextType,
  GeneratedMaterial,
  GeneratedMaterialStatus,
  GeneratedMaterialType,
  GenerationUsage,
  GenerationUsageStatus,
} from "./domain/entities";

export type {
  AttachedContextRepository,
  DocentiahRepositories,
  GeneratedMaterialRepository,
  GenerationUsageRepository,
} from "./domain/repositories";

export { assertMaterialOwnership } from "./domain/authorization";

export { getDefaultDocentiahRepositories } from "./infrastructure/repository-factory";

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
