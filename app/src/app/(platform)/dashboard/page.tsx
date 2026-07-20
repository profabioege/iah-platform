import { localMissionRepository } from "@/modules/library";
import { isAuthConfigured } from "@/lib/auth-flags";
import { getWorkspaceContext } from "@/modules/workspace";
import { createLearningCycleService, getDefaultRepositories } from "@/modules/platform";
import type { StudentWork } from "@/modules/classroom";

import { DashboardHome, type DashboardMission, type DashboardSource } from "./dashboard-home";

/**
 * Dashboard da Plataforma — "Minha Aula" do Aluno (Sprint M17).
 *
 * O servidor entrega as Missões cadastradas (arquivos de conteúdo). No
 * modo REAL (M22), o servidor também já lê o progresso do banco (fonte
 * de verdade) para as Missões publicadas na turma do aluno; no modo
 * demonstração, a Home (cliente) calcula o progresso a partir do
 * trabalho salvo no dispositivo. A Turma do aluno (Institutional
 * Workspace, M15/M17) habilita o card "Minha Lesson" quando existe uma
 * Lesson publicada para ela.
 */
export default async function DashboardPage() {
  const missions = await localMissionRepository.list();

  const items: DashboardMission[] = missions.map((mission) => ({
    id: mission.id,
    number: mission.number,
    title: mission.title,
    module: mission.module,
    guidingQuestion: mission.guidingQuestion,
  }));

  const workspace = await getWorkspaceContext();
  const classroomId =
    workspace?.role === "student" ? workspace.classrooms[0]?.id : undefined;

  const initialAssignments =
    workspace?.role === "student" && classroomId
      ? await getDefaultRepositories().missionAssignments.listByClassroom(
          workspace.institution.id,
          classroomId,
        )
      : [];

  let source: DashboardSource;
  if (isAuthConfigured()) {
    if (workspace?.role === "student" && workspace.user.studentId && classroomId) {
      const service = createLearningCycleService(getDefaultRepositories());
      const availableMissionIds = new Set(
        initialAssignments
          .filter((assignment) => assignment.status !== "draft")
          .map((assignment) => assignment.missionId),
      );
      const workEntries = await Promise.all(
        items
          .filter((mission) => availableMissionIds.has(mission.id))
          .map(async (mission): Promise<[string, StudentWork]> => [
            mission.id,
            await service.getStudentWork({
              institutionId: workspace.institution.id,
              classroomId,
              studentId: workspace.user.studentId!,
              missionId: mission.id,
            }),
          ]),
      );
      const works: Record<string, StudentWork> = Object.fromEntries(workEntries);
      const lastReflection = Object.values(works)
        .filter((work) => work.reflectionRecordedAt)
        .sort((a, b) =>
          (b.reflectionRecordedAt ?? "").localeCompare(a.reflectionRecordedAt ?? ""),
        )[0];
      source = { kind: "real", works, lastReflection };
    } else {
      source = { kind: "real", works: {} };
    }
  } else {
    const scope = workspace
      ? {
          institutionId: workspace.institution.id,
          ownerId: workspace.user.studentId ?? workspace.user.id,
        }
      : null;
    source = { kind: "demo", scope };
  }

  return (
    <DashboardHome
      missions={items}
      classroomId={classroomId}
      source={source}
      initialAssignments={initialAssignments}
    />
  );
}
