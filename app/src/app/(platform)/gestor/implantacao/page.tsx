import type { Metadata } from "next";

import { getWorkspaceContext, WORKSPACE_ENROLLMENTS, WORKSPACE_TEACHER } from "@/modules/workspace";

import { ImplementationWizard, type WizardClassroom } from "./implementation-wizard";

export const metadata: Metadata = {
  title: "Implantação Institucional",
  description: "Implantação do Método IAH® — Inteligência Artificial & Humanidades.",
};

/**
 * Implantação Institucional (Sprint M19) — experiência de confiança do
 * Gestor Escolar, guiada sobre os dados REAIS já existentes no ambiente
 * de demonstração (D-038). Rota aninhada em `/gestor`: herda a proteção
 * de papel já existente no middleware (exclusiva do Administrador), sem
 * nenhuma mudança de autenticação.
 */
export default async function ImplantacaoPage() {
  const context = await getWorkspaceContext();
  if (!context) return null; // middleware garante sessão; guarda defensiva

  const classrooms: WizardClassroom[] = context.classrooms.map((classroom) => ({
    id: classroom.id,
    name: classroom.name,
    grade: classroom.grade,
    studentCount: WORKSPACE_ENROLLMENTS.filter(
      (e) => e.classroomId === classroom.id,
    ).length,
  }));

  const totalStudents = classrooms.reduce((sum, c) => sum + c.studentCount, 0);

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
          {context.institution.name} · Ano Letivo {context.schoolYear.label} —
          Ambiente de demonstração, dados simulados.
        </p>
      </header>

      <ImplementationWizard
        data={{
          institutionName: context.institution.name,
          academicYear: context.schoolYear.label,
          teacherName: WORKSPACE_TEACHER.name,
          teacherEmail: WORKSPACE_TEACHER.email,
          adminName: context.user.name,
          institutionDomain: context.institution.domain,
          classrooms,
          totalStudents,
        }}
      />
    </div>
  );
}
