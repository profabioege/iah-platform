export type {
  CreateTrilhaInput,
  SchoolRange,
  Trilha,
  TrilhaAutonomyLevel,
  TrilhaComplexityLevel,
  TrilhaLanguageStyle,
  TrilhaObjective,
  TrilhaStatus,
} from "./domain/entities";
export {
  TRILHA_AUTONOMY_LEVELS,
  TRILHA_COMPLEXITY_LEVELS,
  TRILHA_LANGUAGE_STYLES,
  TRILHA_STATUSES,
  canTransitionTrilhaStatus,
  createTrilha,
  isValidTrilhaAutonomyLevel,
  isValidTrilhaComplexityLevel,
  isValidTrilhaLanguageStyle,
  isValidTrilhaStatus,
  normalizeTrilhaCode,
} from "./domain/entities";
export type { TrilhaRepository } from "./domain/repositories";
