import type { Metadata } from "next";

import { localMissionRepository } from "@/modules/library";
import { getDefaultRepositories } from "@/modules/platform";
import { getWorkspaceContext } from "@/modules/workspace";
import { Badge } from "@/components/ui/badge";

import type { ClassroomRow } from "./classrooms-section";
import { IdentityCard } from "./identity-card";
import { QuickShortcuts } from "./quick-shortcuts";

export const metadata: Metadata = {
  title: "Painel do Professor",
  description: "Acompanhe a turma durante a Missão.",
};

/**
 * Painel do Professor — porta de entrada da rotina docente (M18.4:
 * redução de carga cognitiva). Mantém só a faixa de identidade e os
 * três atalhos principais (Turmas, Missões, DocentIAH); acompanhamento
 * de turma, atividades e devolutivas passam a viver dentro de Turmas.
 *
 * A fonte dos dados é o contrato ClassMonitorReader; hoje injeta-se a
 * implementação simulada (dados fictícios, autorizados para a fase de
 * demonstração). Ao trocar pela implementação com banco, apenas esta
 * injeção muda.
 */
export default async function ProfessorPage() {
  const missions = await localMissionRepository.list();
  const mission = missions[0];
  const classrooms = await listClassroomRows();
  const workspace = await getWorkspaceContext();

  const activeClassroom = workspace?.classrooms[0] ?? null;
  const totalStudents = classrooms.reduce((total, classroom) => total + classroom.studentCount, 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Painel do Professor
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Acompanhamento da turma
        </h1>
        {mission ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/15 text-primary">
              Missão {String(mission.number).padStart(2, "0")}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {mission.title}
              {activeClassroom ? ` · ${activeClassroom.name}` : ""}
            </span>
          </div>
        ) : null}
      </header>

      {workspace ? (
        <IdentityCard
          identity={{
            name: workspace.user.name,
            role: workspace.role,
            subjectName: workspace.subjects[0]?.name ?? null,
            institutionName: workspace.institution.name,
            schoolYearLabel: workspace.schoolYear.label,
            classroomCount: workspace.classrooms.length,
            studentCount: totalStudents,
          }}
        />
      ) : null}

      <QuickShortcuts />
    </div>
  );
}

/**
 * Turmas da instituição + estado de sincronização, lidas do módulo
 * platform (hoje servido pelos seeds de demonstração; a troca para banco
 * é uma mudança de factory — ver docs/PERSISTENCE.md). Usado aqui só
 * para o total de alunos da faixa de identidade.
 */
async function listClassroomRows(): Promise<ClassroomRow[]> {
  const repositories = getDefaultRepositories();
  // Instituição resolvida da fonte de dados, nunca fixa em código (M16) —
  // hoje o seed tem só o Instituto Horizonte (D-039); multi-instituição
  // chega com a autenticação real amarrando o usuário ao tenant.
  const institutionId = (await repositories.institutions.list())[0]?.id;
  if (!institutionId) return [];
  const [classrooms, academicYears, syncStates] = await Promise.all([
    repositories.classrooms.listByInstitution(institutionId),
    repositories.academicYears.listByInstitution(institutionId),
    repositories.classroomSyncStates.listByInstitution(institutionId),
  ]);

  return Promise.all(
    classrooms.map(async (classroom) => {
      const enrollments = await repositories.enrollments.listByClassroom(
        institutionId,
        classroom.id,
      );
      return {
        id: classroom.id,
        name: classroom.name,
        academicYear:
          academicYears.find((year) => year.id === classroom.academicYearId)
            ?.label ?? "—",
        studentCount: enrollments.length,
        sync:
          syncStates.find((state) => state.classroomId === classroom.id) ?? null,
      };
    }),
  );
}
