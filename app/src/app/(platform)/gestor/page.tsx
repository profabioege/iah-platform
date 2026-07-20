import type { Metadata } from "next";

import { getWorkspaceContext } from "@/modules/workspace";
import { getDefaultRepositories } from "@/modules/platform";

import { ExecutiveDashboard } from "./executive-dashboard";

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

  return (
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
  );
}
