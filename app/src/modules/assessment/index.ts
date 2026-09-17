export type {
  AnswerKeyPolicy,
  AssessmentAnswer,
  AssessmentAssignment,
  AssessmentDeadlineExtension,
  AssessmentLifecycleStatus,
  AssessmentOption,
  AssessmentQuestion,
  AssessmentQuestionType,
  AssessmentResultVisibility,
  AssessmentSubmission,
  EssayRubricBand,
  LessonAssessment,
} from "./domain/entities";
export {
  ASSESSMENT_LIFECYCLE_STATUS_LABEL,
  ASSESSMENT_SUBMISSION_STATUS_LABEL,
  getAssessmentStatus,
} from "./domain/entities";
export {
  canStudentAccess,
  canStudentSubmit,
  effectiveEndsAt,
  resultVisibility,
} from "./domain/policies";
export { assertClassroomScope, assertRole } from "./domain/authorization";
export type { AssessmentRepositories } from "./domain/repositories";
export { createAssessmentService } from "./services/assessment-service";
export { autoCorrectAnswer, autoCorrectSubmission, validateSubmission } from "./services/correction-service";
export { getDefaultAssessmentRepositories } from "./infrastructure/repository-factory";
