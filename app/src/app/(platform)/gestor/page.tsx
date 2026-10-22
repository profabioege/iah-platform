import type { Metadata } from "next";

import { getWorkspaceContext } from "@/modules/workspace";
import { getRequestRepositories } from "@/modules/platform/infrastructure/request-repositories";

import { ExecutiveDashboard, type ExecutiveView } from "./executive-dashboard";
import { computeExecutiveTotals } from "./executive-totals";
import { buildTeacherLinks } from "./teacher-links";

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
/** `?visao=` usado pelos itens "Professores" e "Missões" do menu do gestor. */
const VIEW_BY_PARAM: Record<string, ExecutiveView> = {
  professores: "teachers",
  missoes: "discipline",
};

export default async function GestorPage({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string }>;
}) {
  const { visao } = await searchParams;
  const initialView = (visao && VIEW_BY_PARAM[visao]) || "overview";
  const context = await getWorkspaceContext();
  if (!context) return null; // middleware garante sessão; guarda defensiva
  const repositories = await getRequestRepositories();
  const [teachers, missionRecords] = await Promise.all([
    repositories.teachers.listByInstitution(context.institution.id),
    repositories.missions.list(),
  ]);
  // Missão de referência do catálogo (fallback quando a turma ainda não
  // tem publicação) — nunca fixa em código.
  const catalogMissionId = missionRecords[0]?.id ?? "";

  const classroomData = await Promise.all(context.classrooms.map(async (classroom) => {
    const [students, assignments] = await Promise.all([
      repositories.students.listByClassroom(context.institution.id, classroom.id),
      repositories.missionAssignments.listByClassroom(
        context.institution.id,
        classroom.id,
      ),
    ]);
    // Missão ativa da TURMA: a publicada mais recentemente. Sem isso, a
    // participação mostrada seria a da primeira missão do catálogo, que
    // pode não ser a da aula.
    const activeMissionId =
      assignments
        .filter((a) => a.status === "published")
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0]?.missionId ??
      catalogMissionId;
    const progress = activeMissionId
      ? await repositories.missionProgress.listByClassroomMission(
          context.institution.id,
          classroom.id,
          activeMissionId,
        )
      : [];
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
  const {
    activeStudents,
    deliveredStudents,
    completedStudents,
    reviewedStudents,
    pendingReviewStudents,
  } = computeExecutiveTotals(studentRows);

  return (
    <ExecutiveDashboard
      key={initialView}
      initialView={initialView}
      institutionId={context.institution.id}
      institutionName={context.institution.name}
      academicYear={context.schoolYear.label}
      managerName={context.user.name}
      subjectName={context.subjects[0]?.name ?? "Inteligência Artificial & Humanidades"}
      teachers={buildTeacherLinks(teachers, context.classrooms)}
      classrooms={classroomRows}
      totals={{
        students: totalStudents,
        activeStudents,
        deliveredStudents,
        completedStudents,
        reviewedStudents,
        pendingReviewStudents,
      }}
      students={studentRows}
      assignments={assignmentRows}
    />
  );
}
