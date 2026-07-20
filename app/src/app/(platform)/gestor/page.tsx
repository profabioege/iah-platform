import type { Metadata } from "next";

import { getWorkspaceContext, WORKSPACE_ENROLLMENTS, WORKSPACE_TEACHER } from "@/modules/workspace";
import { DEMO_MISSION_PROGRESS } from "@/modules/platform/seeds/demo-seed";

import { ExecutiveDashboard } from "./executive-dashboard";

export const metadata: Metadata = {
  title: "Visão Executiva",
  description: "Visão executiva da implantação institucional do IAH.",
};

/**
 * Executive Experience — principal leitura institucional do Gestor.
 *
 * Nesta fase, os números vêm exclusivamente do Workspace e do seed
 * institucional já usado por toda a demonstração. Não existe analytics
 * fabricado nem integração nova: a UI organiza os dados atuais para responder
 * rapidamente como estão implantação, professor, alunos e disciplina.
 */
export default async function GestorPage() {
  const context = await getWorkspaceContext();
  if (!context) return null; // middleware garante sessão; guarda defensiva

  const classroomRows = context.classrooms.map((classroom) => {
    const enrollments = WORKSPACE_ENROLLMENTS.filter(
      (enrollment) => enrollment.classroomId === classroom.id,
    );
    const progress = DEMO_MISSION_PROGRESS.filter(
      (item) => item.classroomId === classroom.id,
    );
    const activeCount = progress.filter(
      (item) => item.status !== "nao_acessou",
    ).length;

    return {
      id: classroom.id,
      name: classroom.name,
      studentCount: enrollments.length,
      activeCount,
      engagement:
        enrollments.length > 0
          ? Math.round((activeCount / enrollments.length) * 100)
          : 0,
    };
  });

  const totalStudents = classroomRows.reduce(
    (total, classroom) => total + classroom.studentCount,
    0,
  );
  const activeStudents = DEMO_MISSION_PROGRESS.filter(
    (item) => item.status !== "nao_acessou",
  ).length;
  const deliveredStudents = DEMO_MISSION_PROGRESS.filter((item) =>
    ["entregue", "reflexao", "concluiu"].includes(item.status),
  ).length;
  const completedStudents = DEMO_MISSION_PROGRESS.filter(
    (item) => item.status === "concluiu",
  ).length;

  return (
    <ExecutiveDashboard
      institutionName={context.institution.name}
      academicYear={context.schoolYear.label}
      managerName={context.user.name}
      subjectName={context.subjects[0]?.name ?? "Inteligência Artificial & Humanidades"}
      teacher={{
        name: WORKSPACE_TEACHER.name,
        email: WORKSPACE_TEACHER.email,
        classroomCount: context.classrooms.length,
      }}
      classrooms={classroomRows}
      totals={{
        students: totalStudents,
        activeStudents,
        deliveredStudents,
        completedStudents,
      }}
    />
  );
}
