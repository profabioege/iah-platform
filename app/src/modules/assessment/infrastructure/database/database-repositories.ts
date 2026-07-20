import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdminClient } from "@/modules/platform/infrastructure/database/admin-client";

import type {
  AssessmentAnswer,
  AssessmentAssignment,
  AssessmentDeadlineExtension,
  AssessmentQuestion,
  AssessmentSubmission,
  LessonAssessment,
} from "../../domain/entities";
import type { AssessmentRepositories } from "../../domain/repositories";

type Row = Record<string, unknown>;

function fail(operation: string, message: string): never {
  throw new Error(`Banco de dados: falha em ${operation} — ${message}`);
}

async function rows(
  db: SupabaseClient,
  table: string,
  operation: string,
  build: (query: ReturnType<SupabaseClient["from"]>) => PromiseLike<{
    data: Row[] | null;
    error: { message: string } | null;
  }>,
): Promise<Row[]> {
  const { data, error } = await build(db.from(table));
  if (error) fail(operation, error.message);
  return data ?? [];
}

async function upsert(
  db: SupabaseClient,
  table: string,
  operation: string,
  value: Row | Row[],
  onConflict = "id",
) {
  const { error } = await db.from(table).upsert(value, { onConflict });
  if (error) fail(operation, error.message);
}

const toQuestion = (row: Row): AssessmentQuestion => ({
  id: row.id as string,
  assessmentId: row.assessment_id as string,
  position: row.position as number,
  type: row.question_type as AssessmentQuestion["type"],
  prompt: row.prompt as string,
  points: Number(row.points),
  options: (row.options as AssessmentQuestion["options"]) ?? [],
  correctAnswer: (row.correct_answer as string | boolean | null) ?? null,
  justification: (row.justification as string) ?? "",
  rubric: (row.rubric as AssessmentQuestion["rubric"]) ?? [],
});

const toAssessment = (row: Row, questions: AssessmentQuestion[]): LessonAssessment => ({
  id: row.id as string,
  institutionId: row.institution_id as string,
  authorId: row.author_id as string,
  title: row.title as string,
  instructions: row.instructions as string,
  kind: "diagnostic",
  lessonId: (row.lesson_id as string | null) ?? null,
  missionId: (row.mission_id as string | null) ?? null,
  competencyIds: (row.competency_ids as string[]) ?? [],
  version: row.version as number,
  status: row.status as LessonAssessment["status"],
  questions,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const toAssignment = (row: Row): AssessmentAssignment => ({
  id: row.id as string,
  institutionId: row.institution_id as string,
  classroomId: row.classroom_id as string,
  assessmentId: row.assessment_id as string,
  startsAt: row.starts_at as string,
  endsAt: row.ends_at as string,
  timezone: row.timezone as string,
  allowLateSubmission: row.allow_late_submission as boolean,
  autoCorrectionEnabled: row.auto_correction_enabled as boolean,
  answerKeyPolicy: row.answer_key_policy as AssessmentAssignment["answerKeyPolicy"],
  answerKeyReleaseAt: (row.answer_key_release_at as string | null) ?? null,
  publicationStatus: row.publication_status as AssessmentAssignment["publicationStatus"],
  publishedAt: (row.published_at as string | null) ?? null,
  resultsReleasedAt: (row.results_released_at as string | null) ?? null,
  resultsReleasedBy: (row.results_released_by as string | null) ?? null,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const toAnswer = (row: Row): AssessmentAnswer => ({
  id: row.id as string,
  questionId: row.question_id as string,
  value: (row.answer_value as string | boolean | null) ?? null,
  autoScore: row.auto_score === null ? null : Number(row.auto_score),
  finalScore: row.final_score === null ? null : Number(row.final_score),
  autoFeedback: (row.auto_feedback as string | null) ?? null,
  teacherFeedback: (row.teacher_feedback as string | null) ?? null,
  flagged: Boolean(row.flagged),
});

const toSubmission = (row: Row, answers: AssessmentAnswer[]): AssessmentSubmission => ({
  id: row.id as string,
  institutionId: row.institution_id as string,
  assignmentId: row.assignment_id as string,
  studentId: row.student_id as string,
  status: row.status as AssessmentSubmission["status"],
  answers,
  autoScore: row.auto_score === null ? null : Number(row.auto_score),
  finalScore: row.final_score === null ? null : Number(row.final_score),
  autoFeedback: (row.auto_feedback as string | null) ?? null,
  teacherFeedback: (row.teacher_feedback as string | null) ?? null,
  startedAt: row.started_at as string,
  submittedAt: (row.submitted_at as string | null) ?? null,
  validatedAt: (row.validated_at as string | null) ?? null,
  validatedBy: (row.validated_by as string | null) ?? null,
  reopenedAt: (row.reopened_at as string | null) ?? null,
  updatedAt: row.updated_at as string,
});

export function createDatabaseAssessmentRepositories(): AssessmentRepositories {
  const db = getSupabaseAdminClient();

  async function questionsFor(institutionId: string, assessmentId: string) {
    return (await rows(db, "assessment_questions", "questions.list", (query) =>
      query.select("*").eq("institution_id", institutionId).eq("assessment_id", assessmentId).order("position"),
    )).map(toQuestion);
  }

  async function hydrateSubmissions(source: Row[]) {
    return Promise.all(source.map(async (row) => {
      const answerRows = await rows(db, "assessment_answers", "answers.list", (query) =>
        query.select("*").eq("institution_id", row.institution_id as string).eq("submission_id", row.id as string),
      );
      return toSubmission(row, answerRows.map(toAnswer));
    }));
  }

  return {
    assessments: {
      async list(institutionId) {
        const source = await rows(db, "lesson_assessments", "assessments.list", (query) =>
          query.select("*").eq("institution_id", institutionId).order("updated_at", { ascending: false }),
        );
        return Promise.all(source.map(async (row) => toAssessment(row, await questionsFor(institutionId, row.id as string))));
      },
      async getById(institutionId, id) {
        const source = await rows(db, "lesson_assessments", "assessments.getById", (query) =>
          query.select("*").eq("institution_id", institutionId).eq("id", id).limit(1),
        );
        return source[0] ? toAssessment(source[0], await questionsFor(institutionId, id)) : null;
      },
      async save(institutionId, assessment) {
        await upsert(db, "lesson_assessments", "assessments.save", {
          id: assessment.id, institution_id: institutionId, author_id: assessment.authorId,
          title: assessment.title, instructions: assessment.instructions, kind: assessment.kind,
          lesson_id: assessment.lessonId, mission_id: assessment.missionId,
          competency_ids: assessment.competencyIds, version: assessment.version,
          status: assessment.status, created_at: assessment.createdAt, updated_at: assessment.updatedAt,
        });
        await upsert(db, "assessment_questions", "questions.save", assessment.questions.map((question) => ({
          id: question.id, institution_id: institutionId, assessment_id: assessment.id,
          position: question.position, question_type: question.type, prompt: question.prompt,
          points: question.points, options: question.options, correct_answer: question.correctAnswer,
          justification: question.justification, rubric: question.rubric,
        })));
      },
    },
    assignments: {
      async listByInstitution(institutionId) {
        return (await rows(db, "assessment_assignments", "assignments.listByInstitution", (query) =>
          query.select("*").eq("institution_id", institutionId).order("created_at", { ascending: false }),
        )).map(toAssignment);
      },
      async listByClassroom(institutionId, classroomId) {
        return (await rows(db, "assessment_assignments", "assignments.listByClassroom", (query) =>
          query.select("*").eq("institution_id", institutionId).eq("classroom_id", classroomId).order("created_at", { ascending: false }),
        )).map(toAssignment);
      },
      async getById(institutionId, id) {
        const source = await rows(db, "assessment_assignments", "assignments.getById", (query) =>
          query.select("*").eq("institution_id", institutionId).eq("id", id).limit(1),
        );
        return source[0] ? toAssignment(source[0]) : null;
      },
      async save(institutionId, assignment) {
        await upsert(db, "assessment_assignments", "assignments.save", {
          id: assignment.id, institution_id: institutionId, classroom_id: assignment.classroomId,
          assessment_id: assignment.assessmentId, starts_at: assignment.startsAt, ends_at: assignment.endsAt,
          timezone: assignment.timezone, allow_late_submission: assignment.allowLateSubmission,
          auto_correction_enabled: assignment.autoCorrectionEnabled, answer_key_policy: assignment.answerKeyPolicy,
          answer_key_release_at: assignment.answerKeyReleaseAt, publication_status: assignment.publicationStatus,
          published_at: assignment.publishedAt, results_released_at: assignment.resultsReleasedAt,
          results_released_by: assignment.resultsReleasedBy, created_at: assignment.createdAt, updated_at: assignment.updatedAt,
        });
      },
    },
    submissions: {
      async listByAssignment(institutionId, assignmentId) {
        const source = await rows(db, "assessment_submissions", "submissions.listByAssignment", (query) =>
          query.select("*").eq("institution_id", institutionId).eq("assignment_id", assignmentId),
        );
        return hydrateSubmissions(source);
      },
      async getByStudent(institutionId, assignmentId, studentId) {
        const source = await rows(db, "assessment_submissions", "submissions.getByStudent", (query) =>
          query.select("*").eq("institution_id", institutionId).eq("assignment_id", assignmentId).eq("student_id", studentId).limit(1),
        );
        return source[0] ? (await hydrateSubmissions(source))[0] : null;
      },
      async save(institutionId, submission) {
        await upsert(db, "assessment_submissions", "submissions.save", {
          id: submission.id, institution_id: institutionId, assignment_id: submission.assignmentId,
          student_id: submission.studentId, status: submission.status, auto_score: submission.autoScore,
          final_score: submission.finalScore, auto_feedback: submission.autoFeedback,
          teacher_feedback: submission.teacherFeedback, started_at: submission.startedAt,
          submitted_at: submission.submittedAt, validated_at: submission.validatedAt,
          validated_by: submission.validatedBy, reopened_at: submission.reopenedAt, updated_at: submission.updatedAt,
        }, "assignment_id,student_id");
        if (submission.answers.length > 0) {
          await upsert(db, "assessment_answers", "answers.save", submission.answers.map((answer) => ({
            id: answer.id, institution_id: institutionId, submission_id: submission.id,
            question_id: answer.questionId, answer_value: answer.value, auto_score: answer.autoScore,
            final_score: answer.finalScore, auto_feedback: answer.autoFeedback,
            teacher_feedback: answer.teacherFeedback, flagged: answer.flagged,
          })), "submission_id,question_id");
        }
      },
    },
    extensions: {
      async listByAssignment(institutionId, assignmentId) {
        return (await rows(db, "assessment_deadline_extensions", "extensions.list", (query) =>
          query.select("*").eq("institution_id", institutionId).eq("assignment_id", assignmentId).order("created_at"),
        )).map((row): AssessmentDeadlineExtension => ({
          id: row.id as string, institutionId: row.institution_id as string,
          assignmentId: row.assignment_id as string, studentId: (row.student_id as string | null) ?? null,
          originalEndsAt: row.original_ends_at as string, newEndsAt: row.new_ends_at as string,
          reason: (row.reason as string | null) ?? null, createdBy: row.created_by as string,
          createdAt: row.created_at as string,
        }));
      },
      async save(institutionId, extension) {
        await upsert(db, "assessment_deadline_extensions", "extensions.save", {
          id: extension.id, institution_id: institutionId, assignment_id: extension.assignmentId,
          student_id: extension.studentId, original_ends_at: extension.originalEndsAt,
          new_ends_at: extension.newEndsAt, reason: extension.reason,
          created_by: extension.createdBy, created_at: extension.createdAt,
        });
      },
    },
  };
}
