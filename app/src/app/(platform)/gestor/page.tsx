import type { Metadata } from "next";

import { getWorkspaceContext } from "@/modules/workspace";
import { getDefaultRepositories } from "@/modules/platform";
import { getDefaultAssessmentRepositories } from "@/modules/assessment";

import { ExecutiveDashboard } from "./executive-dashboard";
import { AssessmentIndicators, type DiagnosticIndicators } from "./assessment-indicators";

export const metadata: Metadata = {
  title: "Visão Executiva",
  description: "Visão executiva da implantação institucional do IAH.",
};

/**
 * Executive Experience — principal leitura institucional do Gestor.
 *
 * Os números são projeções dos mesmos repositórios institucionais consumidos
 * pelos fluxos Professor e Aluno; o adapter local da M21 sobrepõe apenas as
 * transições realizadas no navegador demonstrativo.
 */
export default async function GestorPage() {
  const context = await getWorkspaceContext();
  if (!context) return null; // middleware garante sessão; guarda defensiva
  const repositories = getDefaultRepositories();
  const assessmentRepositories = getDefaultAssessmentRepositories();
  const [teachers, missionRecords] = await Promise.all([
    repositories.teachers.listByInstitution(context.institution.id),
    repositories.missions.list(),
  ]);
  // Mission ativa lida do repositório institucional — nunca fixa em código.
  const activeMissionId = missionRecords[0]?.id ?? "";

  const classroomData = await Promise.all(context.classrooms.map(async (classroom) => {
    const [students, progress, assignments] = await Promise.all([
      repositories.students.listByClassroom(context.institution.id, classroom.id),
      activeMissionId
        ? repositories.missionProgress.listByClassroomMission(
            context.institution.id,
            classroom.id,
            activeMissionId,
          )
        : Promise.resolve([]),
      repositories.missionAssignments.listByClassroom(
        context.institution.id,
        classroom.id,
      ),
    ]);
    const activeCount = progress.filter(
      (item) => item.status !== "nao_acessou",
    ).length;

    return {
      classroom: {
        id: classroom.id,
        name: classroom.name,
        studentCount: students.length,
        activeCount,
        engagement:
          students.length > 0
            ? Math.round((activeCount / students.length) * 100)
            : 0,
      },
      students: students.map((student) => ({
        id: student.id,
        classroomId: classroom.id,
        missionId: activeMissionId,
        status: progress.find((item) => item.studentId === student.id)?.status ?? "nao_acessou",
      })),
      assignments,
    };
  }));

  const classroomRows = classroomData.map((item) => item.classroom);
  const studentRows = classroomData.flatMap((item) => item.students);
  const assignmentRows = classroomData.flatMap((item) => item.assignments);

  const totalStudents = classroomRows.reduce(
    (total, classroom) => total + classroom.studentCount,
    0,
  );
  const activeStudents = studentRows.filter(
    (item) => item.status !== "nao_acessou",
  ).length;
  const deliveredStudents = studentRows.filter((item) =>
    ["entregue", "reflexao", "concluiu"].includes(item.status),
  ).length;
  const completedStudents = studentRows.filter(
    (item) => item.status === "concluiu",
  ).length;
  const teacher = teachers[0];
  const assessmentAssignments = await assessmentRepositories.assignments.listByInstitution(
    context.institution.id,
  );
  const assessments = await assessmentRepositories.assessments.list(context.institution.id);
  const assessmentSubmissions = (
    await Promise.all(
      assessmentAssignments.map((assignment) =>
        assessmentRepositories.submissions.listByAssignment(
          context.institution.id,
          assignment.id,
        ),
      ),
    )
  ).flat();
  const validated = assessmentSubmissions.filter((item) => item.status === "validated");
  const releasedAssignmentIds = new Set(
    assessmentAssignments
      .filter((item) => item.resultsReleasedAt)
      .map((item) => item.id),
  );
  const questionScores = new Map<string, { score: number; possible: number; count: number }>();
  for (const submission of validated) {
    const assignment = assessmentAssignments.find((item) => item.id === submission.assignmentId);
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
  const diagnosticIndicators: DiagnosticIndicators = {
    publishedActivities: assessmentAssignments.filter((item) => item.publicationStatus === "published").length,
    participants: new Set(assessmentSubmissions.filter((item) => item.status !== "draft").map((item) => item.studentId)).size,
    received: assessmentSubmissions.filter((item) => item.status !== "draft").length,
    awaitingValidation: assessmentSubmissions.filter((item) => item.status === "submitted").length,
    releasedResults: validated.filter((item) => releasedAssignmentIds.has(item.assignmentId)).length,
    averageScore: validated.length
      ? validated.reduce((sum, item) => sum + (item.finalScore ?? 0), 0) / validated.length
      : null,
    questionPerformance: assessments.flatMap((assessment) =>
      assessment.questions.flatMap((question) => {
        const data = questionScores.get(question.id);
        return data && data.possible > 0
          ? [{ label: `${assessment.title} · Questão ${question.position}`, percentage: Math.round((data.score / data.possible) * 100), responses: data.count }]
          : [];
      }),
    ),
  };

  return (
    <div>
      <ExecutiveDashboard
      institutionId={context.institution.id}
      institutionName={context.institution.name}
      academicYear={context.schoolYear.label}
      managerName={context.user.name}
      subjectName={context.subjects[0]?.name ?? "Inteligência Artificial & Humanidades"}
      teacher={{
        name: teacher?.name ?? "Professor(a) responsável",
        email: teacher?.email ?? "",
        classroomCount: context.classrooms.length,
      }}
      classrooms={classroomRows}
      totals={{
        students: totalStudents,
        activeStudents,
        deliveredStudents,
        completedStudents,
      }}
      students={studentRows}
      assignments={assignmentRows}
      />
      <AssessmentIndicators indicators={diagnosticIndicators} />
    </div>
  );
}
