import type { Metadata } from "next";

import { getAuthMode } from "@/lib/auth-flags";
import { getRequestRepositories } from "@/modules/platform/infrastructure/request-repositories";
import { getWorkspaceContext, WORKSPACE_ENROLLMENTS, WORKSPACE_TEACHER } from "@/modules/workspace";

import { ImplementationWizard } from "./implementation-wizard";
import { buildImplementationData, type ImplementationData } from "./implementation-data";

export const metadata: Metadata = {
  title: "Implantação Institucional",
  description: "Implantação do Método IAH® — Inteligência Artificial & Humanidades.",
};

/**
 * Implantação Institucional (Sprint M19) — experiência de confiança do
 * Gestor Escolar. Rota aninhada em `/gestor`: herda a proteção de papel
 * já existente no middleware (exclusiva do Administrador), sem nenhuma
 * mudança de autenticação.
 *
 * Modo real (REGISTRO 14, G1): professores, vínculos e matrículas vêm dos
 * repositórios da instituição — os mesmos do Painel do Gestor. Modo
 * demonstração: segue sobre o seed do ambiente de demonstração (D-038).
 */
export default async function ImplantacaoPage() {
  const context = await getWorkspaceContext();
  if (!context) return null; // middleware garante sessão; guarda defensiva

  const realMode = getAuthMode() === "supabase";
  const data: ImplementationData = realMode
    ? await loadInstitutionData(context)
    : demoData(context);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Implantação Institucional
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Implantação do Método IAH®
        </h1>
        <p className="text-sm text-muted-foreground">
          {context.institution.name} · Ano Letivo {context.schoolYear.label} —{" "}
          {realMode ? "Dados da instituição." : "Ambiente de demonstração, dados simulados."}
        </p>
      </header>

      <ImplementationWizard
        realMode={realMode}
        data={{
          institutionName: context.institution.name,
          academicYear: context.schoolYear.label,
          adminName: context.user.name,
          institutionDomain: context.institution.domain,
          ...data,
        }}
      />
    </div>
  );
}

type Context = NonNullable<Awaited<ReturnType<typeof getWorkspaceContext>>>;

async function loadInstitutionData(context: Context): Promise<ImplementationData> {
  const repositories = await getRequestRepositories();
  const [teachers, studentLists] = await Promise.all([
    repositories.teachers.listByInstitution(context.institution.id),
    Promise.all(
      context.classrooms.map((classroom) =>
        repositories.students.listByClassroom(context.institution.id, classroom.id),
      ),
    ),
  ]);
  return buildImplementationData({
    classrooms: context.classrooms,
    studentsByClassroom: new Map(
      context.classrooms.map((classroom, index) => [classroom.id, studentLists[index]]),
    ),
    teachers,
    institutionDomain: context.institution.domain,
  });
}

/** Demonstração: o mesmo retrato de antes, sobre o seed (professor único). */
function demoData(context: Context): ImplementationData {
  const classrooms = context.classrooms.map((classroom) => ({
    id: classroom.id,
    name: classroom.name,
    grade: classroom.grade,
    studentCount: WORKSPACE_ENROLLMENTS.filter((e) => e.classroomId === classroom.id).length,
    teacherNames: [WORKSPACE_TEACHER.name],
  }));
  return {
    classrooms,
    teachers: [
      {
        id: WORKSPACE_TEACHER.id,
        name: WORKSPACE_TEACHER.name,
        email: WORKSPACE_TEACHER.email,
        classrooms: classrooms.map((c) => ({ id: c.id, name: c.name })),
      },
    ],
    totalStudents: classrooms.reduce((sum, c) => sum + c.studentCount, 0),
    classroomsWithStudents: classrooms.length,
    institutionalEmailShare: 100,
  };
}
