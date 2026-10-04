/**
 * Módulo Question Bank — matriz curricular do Ensino Médio, banco de
 * questões versionado com revisão editorial, listas, tentativas e
 * devolutivas (reformulação, incremento 1 — D-049) e Catálogo IAH comum às escolas
 * (D-050; carga do Enem em `catalog/enem-import.ts`).
 *
 * Este barril NÃO reexporta `request-context.ts` (alcança a sessão e o
 * cliente do banco): Server Components e Server Actions importam esse
 * arquivo diretamente.
 */

export * from "./domain/entities";
export type { QuestionBankRepositories } from "./domain/repositories";
export {
  buildAttemptReport,
  validateOptions,
  type AttemptReport,
  type ItemReport,
  type SkillReport,
} from "./domain/report";
export {
  MAX_LIST_ITEMS,
  answerIdFor,
  attemptIdFor,
  createQuestionBankService,
  type BankItem,
  type BankItemLink,
  type ListResults,
  type PlannedSkill,
  type QuestionBankActor,
  type QuestionBankService,
  type StudentListItem,
  type StudentListView,
} from "./services/question-bank-service";
export {
  MASTERY_LABEL,
  MASTERY_RULES,
  circuitPosition,
  groupEvidence,
  nextRoundLevel,
  skillMastery,
  type MasteryState,
  type SkillMastery,
  type StudentCircuitPosition,
} from "./domain/adaptive";
export {
  DEFAULT_ROUND_SIZE,
  createAdaptiveCircuitService,
  type AdaptiveCircuitService,
  type CircuitPanel,
  type CircuitStudentRow,
  type MyCircuit,
} from "./services/adaptive-circuit-service";
export {
  createEditorialService,
  type EditorialService,
  type QueueRow,
  type ReviewItem,
  type VersionInput,
} from "./services/editorial-service";
export { parseBlocks, markdownToMarkupV2, type MarkupBlock } from "./domain/markup";
export { parseMarkup, decodeEntities, figureRefs, type MarkupNode } from "./domain/markup";
export { createDatabaseQuestionBankRepositories } from "./infrastructure/database-repositories";
