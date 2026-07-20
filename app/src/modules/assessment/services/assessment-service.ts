import type {
  AnswerKeyPolicy,
  AssessmentAnswer,
  AssessmentAssignment,
  AssessmentDeadlineExtension,
  AssessmentSubmission,
  LessonAssessment,
} from "../domain/entities";
import type { AssessmentRepositories } from "../domain/repositories";
import { canStudentSubmit, effectiveEndsAt } from "../domain/policies";
import { autoCorrectSubmission, validateSubmission } from "./correction-service";

export interface CreateAssignmentInput {
  classroomId: string;
  assessmentId: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  allowLateSubmission: boolean;
  autoCorrectionEnabled: boolean;
  answerKeyPolicy: AnswerKeyPolicy;
  answerKeyReleaseAt: string | null;
}

export function createAssessmentService(repositories: AssessmentRepositories) {
  return {
    async saveAssessment(institutionId: string, assessment: LessonAssessment) {
      if (assessment.institutionId !== institutionId) throw new Error("Instituição inválida.");
      if (assessment.questions.length !== 5) throw new Error("A sondagem deve ter cinco questões.");
      const types = assessment.questions.map((question) => question.type);
      if (
        types.filter((type) => type === "multiple_choice").length !== 2 ||
        types.filter((type) => type === "true_false").length !== 2 ||
        types.filter((type) => type === "essay").length !== 1
      ) {
        throw new Error("Use duas questões de múltipla escolha, duas de verdadeiro ou falso e uma dissertativa.");
      }
      await repositories.assessments.save(institutionId, assessment);
      return assessment;
    },

    async publish(
      institutionId: string,
      input: CreateAssignmentInput,
      now = new Date().toISOString(),
    ): Promise<AssessmentAssignment> {
      const assessment = await repositories.assessments.getById(institutionId, input.assessmentId);
      if (!assessment) throw new Error("Sondagem não encontrada.");
      if (new Date(input.endsAt) <= new Date(input.startsAt)) {
        throw new Error("O encerramento deve ocorrer depois do início.");
      }
      if (input.answerKeyPolicy === "scheduled" && !input.answerKeyReleaseAt) {
        throw new Error("Informe a data programada para liberar o gabarito.");
      }
      const assignment: AssessmentAssignment = {
        id: crypto.randomUUID(),
        institutionId,
        classroomId: input.classroomId,
        assessmentId: assessment.id,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        timezone: input.timezone,
        allowLateSubmission: input.allowLateSubmission,
        autoCorrectionEnabled: input.autoCorrectionEnabled,
        answerKeyPolicy: input.answerKeyPolicy,
        answerKeyReleaseAt: input.answerKeyReleaseAt,
        publicationStatus: "published",
        publishedAt: now,
        resultsReleasedAt: null,
        resultsReleasedBy: null,
        createdAt: now,
        updatedAt: now,
      };
      await repositories.assignments.save(institutionId, assignment);
      return assignment;
    },

    async saveDraft(
      institutionId: string,
      assignment: AssessmentAssignment,
      studentId: string,
      values: Record<string, string | boolean | null>,
      now = new Date().toISOString(),
    ): Promise<AssessmentSubmission> {
      const current = await repositories.submissions.getByStudent(
        institutionId,
        assignment.id,
        studentId,
      );
      if (current && current.status !== "draft") {
        throw new Error("A entrega já foi enviada e está bloqueada para edição.");
      }
      const assessment = await repositories.assessments.getById(institutionId, assignment.assessmentId);
      if (!assessment) throw new Error("Sondagem não encontrada.");
      const answers: AssessmentAnswer[] = assessment.questions.map((question) => ({
        id: current?.answers.find((answer) => answer.questionId === question.id)?.id ?? crypto.randomUUID(),
        questionId: question.id,
        value: values[question.id] ?? null,
        autoScore: null,
        finalScore: null,
        autoFeedback: null,
        teacherFeedback: null,
        flagged: false,
      }));
      const submission: AssessmentSubmission = {
        id: current?.id ?? crypto.randomUUID(),
        institutionId,
        assignmentId: assignment.id,
        studentId,
        status: "draft",
        answers,
        autoScore: null,
        finalScore: null,
        autoFeedback: null,
        teacherFeedback: null,
        startedAt: current?.startedAt ?? now,
        submittedAt: null,
        validatedAt: null,
        validatedBy: null,
        reopenedAt: current?.reopenedAt ?? null,
        updatedAt: now,
      };
      await repositories.submissions.save(institutionId, submission);
      return submission;
    },

    async submit(
      institutionId: string,
      assignment: AssessmentAssignment,
      studentId: string,
      values: Record<string, string | boolean | null>,
      now = new Date().toISOString(),
    ): Promise<AssessmentSubmission> {
      const extensions = await repositories.extensions.listByAssignment(institutionId, assignment.id);
      const deadline = effectiveEndsAt(assignment, extensions, studentId);
      if (!canStudentSubmit(assignment, deadline, new Date(now))) {
        throw new Error("O prazo desta sondagem não permite novos envios.");
      }
      let submission = await this.saveDraft(institutionId, assignment, studentId, values, now);
      submission = { ...submission, status: "submitted", submittedAt: now, updatedAt: now };
      if (assignment.autoCorrectionEnabled) {
        const assessment = await repositories.assessments.getById(institutionId, assignment.assessmentId);
        if (!assessment) throw new Error("Sondagem não encontrada.");
        submission = autoCorrectSubmission(assessment, submission);
      }
      await repositories.submissions.save(institutionId, submission);
      return submission;
    },

    async validateReady(
      institutionId: string,
      assignmentId: string,
      reviewerId: string,
      excludeFlagged: boolean,
    ) {
      const submissions = await repositories.submissions.listByAssignment(institutionId, assignmentId);
      const ready = submissions.filter(
        (submission) =>
          submission.status === "submitted" &&
          submission.autoScore !== null &&
          (!excludeFlagged || !submission.answers.some((answer) => answer.flagged)),
      );
      for (const submission of ready) {
        await repositories.submissions.save(
          institutionId,
          validateSubmission(submission, reviewerId),
        );
      }
      return ready.length;
    },

    async releaseValidated(
      institutionId: string,
      assignmentId: string,
      reviewerId: string,
      now = new Date().toISOString(),
    ) {
      const assignment = await repositories.assignments.getById(institutionId, assignmentId);
      if (!assignment) throw new Error("Atividade não encontrada.");
      const submissions = await repositories.submissions.listByAssignment(institutionId, assignmentId);
      const validated = submissions.filter((submission) => submission.status === "validated");
      if (validated.length === 0) throw new Error("Não há correções validadas para liberar.");
      const released = { ...assignment, resultsReleasedAt: now, resultsReleasedBy: reviewerId, updatedAt: now };
      await repositories.assignments.save(institutionId, released);
      return { assignment: released, count: validated.length };
    },

    async extendDeadline(
      institutionId: string,
      assignment: AssessmentAssignment,
      newEndsAt: string,
      studentId: string | null,
      reason: string | null,
      createdBy: string,
      now = new Date().toISOString(),
    ): Promise<AssessmentDeadlineExtension> {
      if (new Date(newEndsAt) <= new Date(assignment.endsAt)) {
        throw new Error("A extensão deve ser posterior ao prazo original.");
      }
      const extension: AssessmentDeadlineExtension = {
        id: crypto.randomUUID(),
        institutionId,
        assignmentId: assignment.id,
        studentId,
        originalEndsAt: assignment.endsAt,
        newEndsAt,
        reason,
        createdBy,
        createdAt: now,
      };
      await repositories.extensions.save(institutionId, extension);
      if (studentId === null) {
        await repositories.assignments.save(institutionId, {
          ...assignment,
          endsAt: newEndsAt,
          updatedAt: now,
        });
      }
      return extension;
    },
  };
}
