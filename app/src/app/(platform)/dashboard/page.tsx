import { localMissionRepository } from "@/modules/library";
import { isAuthConfigured } from "@/lib/auth-flags";
import { getWorkspaceContext } from "@/modules/workspace";

import { DashboardHome, type DashboardMission } from "./dashboard-home";

/**
 * Dashboard da Plataforma — "Minha Aula" do Aluno (Sprint M17).
 *
 * O servidor entrega as Missões cadastradas (arquivos de conteúdo); a Home
 * (cliente) escolhe a Missão ativa e calcula o progresso a partir do trabalho
 * salvo no dispositivo. A Turma do aluno (Institutional Workspace, M15/M17)
 * habilita o card "Minha Lesson" quando existe uma Lesson publicada para ela.
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

  const workspace = isAuthConfigured() ? null : await getWorkspaceContext();
  const classroomId =
    workspace?.role === "student" ? workspace.classrooms[0]?.id : undefined;
  const scope = workspace
    ? {
        institutionId: workspace.institution.id,
        ownerId: workspace.user.studentId ?? workspace.user.id,
      }
    : null;

  return <DashboardHome missions={items} classroomId={classroomId} scope={scope} />;
}
