import {
  getDefaultAssessmentRepositories,
  type AssessmentSubmission,
} from "@/modules/assessment";
import { getDefaultRepositories } from "@/modules/platform";
import type { WorkspaceContext } from "@/modules/workspace";

import type { DiagnosticIndicators } from "./assessment-indicators";

export interface PedagogicalOverview {
  indicators: DiagnosticIndicators;
  turmasSemParticipacao: string[];
  professoresComCorrecoesPendentes: Array<{ teacherName: string; pendentes: number }>;
}

/**
 * Dados pedagógicos reais para a Coordenação (D-046) — mesma lógica de
 * junção Aplicação+Entrega+Questão já usada no antigo Painel do Gestor,
 * agora só aqui (é a leitura pedagógica, não a operacional de Direção).
 */
export async function loadPedagogicalOverview(
  workspace: WorkspaceContext,
): Promise<PedagogicalOverview> {
  const assessmentRepositories = getDefaultAssessmentRepositories();
  const platformRepositories = getDefaultRepositories();

  const [assignments, assessments, teachers] = await Promise.all([
    assessmentRepositories.assignments.listByInstitution(workspace.institution.id),
    assessmentRepositories.assessments.list(workspace.institution.id),
    platformRepositories.teachers.listByInstitution(workspace.institution.id),
  ]);
  const submissionsByAssignment: Record<string, AssessmentSubmission[]> = Object.fromEntries(
    await Promise.all(
      assignments.map(async (assignment) => [
        assignment.id,
        await assessmentRepositories.submissions.listByAssignment(
          workspace.institution.id,
          assignment.id,
        ),
      ]),
    ),
  );
  const allSubmissions = Object.values(submissionsByAssignment).flat();

  const validated = allSubmissions.filter((item) => item.status === "validated");
  const releasedAssignmentIds = new Set(
    assignments.filter((item) => item.resultsReleasedAt).map((item) => item.id),
  );

  const questionScores = new Map<string, { score: number; possible: number; count: number }>();
  for (const submission of validated) {
    const assignment = assignments.find((item) => item.id === submission.assignmentId);
    const assessment = assessments.find((item) => item.id === assignment?.assessmentId);
    for (const answer of submission.answers) {
      const question = assessment?.questions.find((item) => item.id === answer.questionId);
      if (!question) continue;
      const current = questionScores.get(question.id) ?? { score: 0, possible: 0, count: 0 };
      current.score += answer.finalScore ?? answer.autoScore ?? 0;
      current.possible += question.points;
      current.count += 1;
      questionScores.set(question.id, current);
    }
  }

  const indicators: DiagnosticIndicators = {
    publishedActivities: assignments.filter((item) => item.publicationStatus === "published").length,
    participants: new Set(
      allSubmissions.filter((item) => item.status !== "draft").map((item) => item.studentId),
    ).size,
    received: allSubmissions.filter((item) => item.status !== "draft").length,
    awaitingValidation: allSubmissions.filter((item) => item.status === "submitted").length,
    releasedResults: validated.filter((item) => releasedAssignmentIds.has(item.assignmentId)).length,
    averageScore: validated.length
      ? validated.reduce((sum, item) => sum + (item.finalScore ?? 0), 0) / validated.length
      : null,
    questionPerformance: assessments.flatMap((assessment) =>
      assessment.questions.flatMap((question) => {
        const data = questionScores.get(question.id);
        return data && data.possible > 0
          ? [
              {
                label: `${assessment.title} · Questão ${question.position}`,
                percentage: Math.round((data.score / data.possible) * 100),
                responses: data.count,
              },
            ]
          : [];
      }),
    ),
  };

  const turmasSemParticipacao = workspace.classrooms
    .filter((classroom) => {
      const classroomAssignments = assignments.filter((a) => a.classroomId === classroom.id);
      if (classroomAssignments.length === 0) return false; // sem atividade publicada, não é "sem participação"
      const classroomSubmissions = classroomAssignments.flatMap(
        (a) => submissionsByAssignment[a.id] ?? [],
      );
      return classroomSubmissions.length === 0;
    })
    .map((classroom) => classroom.name);

  const professoresComCorrecoesPendentes = teachers
    .map((teacher) => {
      const classroomIds = new Set(
        workspace.classrooms
          .filter((classroom) => classroom.teacherIds.includes(teacher.id))
          .map((classroom) => classroom.id),
      );
      const pendentes = assignments
        .filter((assignment) => classroomIds.has(assignment.classroomId))
        .flatMap((assignment) => submissionsByAssignment[assignment.id] ?? [])
        .filter((submission) => submission.status === "submitted").length;
      return { teacherName: teacher.name, pendentes };
    })
    .filter((row) => row.pendentes > 0);

  return { indicators, turmasSemParticipacao, professoresComCorrecoesPendentes };
}
