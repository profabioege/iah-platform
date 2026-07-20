export type AssessmentQuestionType =
  | "multiple_choice"
  | "true_false"
  | "essay";

export type AnswerKeyPolicy =
  | "after_submission"
  | "after_end"
  | "scheduled"
  | "manual"
  | "never";

export type AssessmentLifecycleStatus =
  | "draft"
  | "scheduled"
  | "open"
  | "closed"
  | "archived";

export interface AssessmentOption {
  id: string;
  label: string;
}

export interface EssayRubricBand {
  score: number;
  description: string;
  /** Cada grupo exige ao menos um termo para que a faixa seja atingida. */
  keywordGroups: string[][];
}

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  position: number;
  type: AssessmentQuestionType;
  prompt: string;
  points: number;
  options: AssessmentOption[];
  correctAnswer: string | boolean | null;
  justification: string;
  rubric: EssayRubricBand[];
}

/** Template autoral versionado previsto como LessonAssessment em D-028/D-031. */
export interface LessonAssessment {
  id: string;
  institutionId: string;
  authorId: string;
  title: string;
  instructions: string;
  kind: "diagnostic";
  lessonId: string | null;
  missionId: string | null;
  competencyIds: string[];
  version: number;
  status: "draft" | "published" | "archived";
  questions: AssessmentQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentAssignment {
  id: string;
  institutionId: string;
  classroomId: string;
  assessmentId: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  allowLateSubmission: boolean;
  autoCorrectionEnabled: boolean;
  answerKeyPolicy: AnswerKeyPolicy;
  answerKeyReleaseAt: string | null;
  publicationStatus: "draft" | "published" | "archived";
  publishedAt: string | null;
  resultsReleasedAt: string | null;
  resultsReleasedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentDeadlineExtension {
  id: string;
  institutionId: string;
  assignmentId: string;
  studentId: string | null;
  originalEndsAt: string;
  newEndsAt: string;
  reason: string | null;
  createdBy: string;
  createdAt: string;
}

export interface AssessmentAnswer {
  id: string;
  questionId: string;
  value: string | boolean | null;
  autoScore: number | null;
  finalScore: number | null;
  autoFeedback: string | null;
  teacherFeedback: string | null;
  flagged: boolean;
}

export interface AssessmentSubmission {
  id: string;
  institutionId: string;
  assignmentId: string;
  studentId: string;
  status: "draft" | "submitted" | "validated";
  answers: AssessmentAnswer[];
  autoScore: number | null;
  finalScore: number | null;
  autoFeedback: string | null;
  teacherFeedback: string | null;
  startedAt: string;
  submittedAt: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
  reopenedAt: string | null;
  updatedAt: string;
}

export interface AssessmentResultVisibility {
  result: boolean;
  feedback: boolean;
  answerKey: boolean;
}

export function getAssessmentStatus(
  assignment: AssessmentAssignment,
  now = new Date(),
): AssessmentLifecycleStatus {
  if (assignment.publicationStatus === "archived") return "archived";
  if (assignment.publicationStatus === "draft") return "draft";
  if (now.getTime() < new Date(assignment.startsAt).getTime()) return "scheduled";
  if (now.getTime() > new Date(assignment.endsAt).getTime()) return "closed";
  return "open";
}
