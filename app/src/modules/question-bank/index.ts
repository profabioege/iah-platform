/**
 * Módulo Question Bank — matriz curricular do Ensino Médio, banco de
 * questões versionado com revisão editorial, listas, tentativas e
 * devolutivas (reformulação, incremento 1 — D-049).
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
  type ListResults,
  type PlannedSkill,
  type QuestionBankActor,
  type QuestionBankService,
  type StudentListView,
} from "./services/question-bank-service";
export { createDatabaseQuestionBankRepositories } from "./infrastructure/database-repositories";
