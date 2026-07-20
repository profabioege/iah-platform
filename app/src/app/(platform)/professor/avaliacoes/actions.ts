"use server";

import { revalidatePath } from "next/cache";

import {
  assertClassroomScope,
  assertRole,
  createAssessmentService,
  getDefaultAssessmentRepositories,
  validateSubmission,
  type AnswerKeyPolicy,
  type AssessmentQuestion,
  type AssessmentSubmission,
  type LessonAssessment,
} from "@/modules/assessment";
import { getWorkspaceContext } from "@/modules/workspace";
import { getDefaultRepositories } from "@/modules/platform";

export interface AssessmentDraftInput {
  title: string;
  instructions: string;
  lessonId?: string | null;
  missionId?: string | null;
  competencyIds: string[];
  questions: Array<Omit<AssessmentQuestion, "id" | "assessmentId" | "position">>;
}

async function teacherContext() {
  const workspace = await getWorkspaceContext();
  if (!workspace) throw new Error("Sessão inválida.");
  assertRole(workspace.role, ["teacher", "admin"]);
  return workspace;
}

function refreshAssessmentPaths() {
  revalidatePath("/professor/avaliacoes");
  revalidatePath("/avaliacoes");
  revalidatePath("/dashboard");
  revalidatePath("/gestor");
}

export async function createAssessmentAction(input: AssessmentDraftInput) {
  const workspace = await teacherContext();
  if (!input.title.trim()) throw new Error("Informe o título da sondagem.");
  if (input.lessonId && input.missionId) throw new Error("Associe a uma Lesson ou Mission, não às duas.");
  const now = new Date().toISOString();
  const assessmentId = crypto.randomUUID();
  const assessment: LessonAssessment = {
    id: assessmentId,
    institutionId: workspace.institution.id,
    authorId: workspace.user.id,
    title: input.title.trim(),
    instructions: input.instructions.trim(),
    kind: "diagnostic",
    lessonId: input.lessonId ?? null,
    missionId: input.missionId ?? null,
    competencyIds: input.competencyIds,
    version: 1,
    status: "published",
    questions: input.questions.map((question, index) => ({
      ...question,
      id: crypto.randomUUID(),
      assessmentId,
      position: index + 1,
    })),
    createdAt: now,
    updatedAt: now,
  };
  await createAssessmentService(getDefaultAssessmentRepositories()).saveAssessment(
    workspace.institution.id,
    assessment,
  );
  refreshAssessmentPaths();
  return assessment;
}

export async function publishAssessmentAction(input: {
  assessmentId: string;
  classroomId: string;
  startsAt: string;
  endsAt: string;
  allowLateSubmission: boolean;
  autoCorrectionEnabled: boolean;
  answerKeyPolicy: AnswerKeyPolicy;
  answerKeyReleaseAt: string | null;
}) {
  const workspace = await teacherContext();
  assertClassroomScope(workspace.classrooms.map((item) => item.id), input.classroomId);
  const assignment = await createAssessmentService(
    getDefaultAssessmentRepositories(),
  ).publish(workspace.institution.id, {
    ...input,
    timezone: workspace.institution.timezone,
  });
  refreshAssessmentPaths();
  return assignment;
}

export async function extendAssessmentDeadlineAction(input: {
  assignmentId: string;
  studentId: string | null;
  newEndsAt: string;
  reason: string | null;
}) {
  const workspace = await teacherContext();
  const repositories = getDefaultAssessmentRepositories();
  const assignment = await repositories.assignments.getById(workspace.institution.id, input.assignmentId);
  if (!assignment) throw new Error("Atividade não encontrada.");
  assertClassroomScope(workspace.classrooms.map((item) => item.id), assignment.classroomId);
  if (input.studentId) {
    const students = await getDefaultRepositories().students.listByClassroom(
      workspace.institution.id,
      assignment.classroomId,
    );
    if (!students.some((student) => student.id === input.studentId)) {
      throw new Error("Aluno fora da turma desta atividade.");
    }
  }
  const extension = await createAssessmentService(repositories).extendDeadline(
    workspace.institution.id,
    assignment,
    input.newEndsAt,
    input.studentId,
    input.reason,
    workspace.user.id,
  );
  refreshAssessmentPaths();
  return extension;
}

export async function updateSubmissionReviewAction(input: {
  assignmentId: string;
  studentId: string;
  scores: Record<string, number>;
  feedback: Record<string, string>;
  flaggedQuestionIds: string[];
  teacherFeedback: string;
  validate: boolean;
}) {
  const workspace = await teacherContext();
  const repositories = getDefaultAssessmentRepositories();
  const assignment = await repositories.assignments.getById(workspace.institution.id, input.assignmentId);
  if (!assignment) throw new Error("Atividade não encontrada.");
  assertClassroomScope(workspace.classrooms.map((item) => item.id), assignment.classroomId);
  const submission = await repositories.submissions.getByStudent(
    workspace.institution.id,
    input.assignmentId,
    input.studentId,
  );
  if (!submission || submission.status === "draft") throw new Error("Entrega não disponível para correção.");
  const assessment = await repositories.assessments.getById(
    workspace.institution.id,
    assignment.assessmentId,
  );
  if (!assessment) throw new Error("Sondagem não encontrada.");
  for (const [questionId, score] of Object.entries(input.scores)) {
    const question = assessment.questions.find((item) => item.id === questionId);
    if (!question || !Number.isFinite(score) || score < 0 || score > question.points) {
      throw new Error("Pontuação individual fora do limite da questão.");
    }
  }
  let updated: AssessmentSubmission = {
    ...submission,
    answers: submission.answers.map((answer) => ({
      ...answer,
      finalScore: Number.isFinite(input.scores[answer.questionId])
        ? input.scores[answer.questionId]
        : answer.finalScore,
      teacherFeedback: input.feedback[answer.questionId] ?? answer.teacherFeedback,
      flagged: input.flaggedQuestionIds.includes(answer.questionId),
    })),
    teacherFeedback: input.teacherFeedback,
    updatedAt: new Date().toISOString(),
  };
  if (input.validate) updated = validateSubmission(updated, workspace.user.id);
  await repositories.submissions.save(workspace.institution.id, updated);
  refreshAssessmentPaths();
  return updated;
}

export async function validateAssessmentBatchAction(input: {
  assignmentId: string;
  excludeFlagged: boolean;
}) {
  const workspace = await teacherContext();
  const repositories = getDefaultAssessmentRepositories();
  const assignment = await repositories.assignments.getById(workspace.institution.id, input.assignmentId);
  if (!assignment) throw new Error("Atividade não encontrada.");
  assertClassroomScope(workspace.classrooms.map((item) => item.id), assignment.classroomId);
  const count = await createAssessmentService(repositories).validateReady(
    workspace.institution.id,
    input.assignmentId,
    workspace.user.id,
    input.excludeFlagged,
  );
  refreshAssessmentPaths();
  return count;
}

export async function releaseAssessmentResultsAction(assignmentId: string) {
  const workspace = await teacherContext();
  const repositories = getDefaultAssessmentRepositories();
  const assignment = await repositories.assignments.getById(workspace.institution.id, assignmentId);
  if (!assignment) throw new Error("Atividade não encontrada.");
  assertClassroomScope(workspace.classrooms.map((item) => item.id), assignment.classroomId);
  const result = await createAssessmentService(repositories).releaseValidated(
    workspace.institution.id,
    assignmentId,
    workspace.user.id,
  );
  refreshAssessmentPaths();
  return result;
}

export async function reopenAssessmentSubmissionAction(input: {
  assignmentId: string;
  studentId: string;
}) {
  const workspace = await teacherContext();
  const repositories = getDefaultAssessmentRepositories();
  const assignment = await repositories.assignments.getById(workspace.institution.id, input.assignmentId);
  if (!assignment) throw new Error("Atividade não encontrada.");
  assertClassroomScope(workspace.classrooms.map((item) => item.id), assignment.classroomId);
  const submission = await repositories.submissions.getByStudent(workspace.institution.id, input.assignmentId, input.studentId);
  if (!submission) throw new Error("Entrega não encontrada.");
  const now = new Date().toISOString();
  const reopened = {
    ...submission,
    status: "draft" as const,
    submittedAt: null,
    validatedAt: null,
    validatedBy: null,
    reopenedAt: now,
    updatedAt: now,
  };
  await repositories.submissions.save(workspace.institution.id, reopened);
  refreshAssessmentPaths();
  return reopened;
}
