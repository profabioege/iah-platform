import { localMissionRepository } from "@/modules/library";

import { DashboardHome, type DashboardMission } from "./dashboard-home";

/**
 * Dashboard da Plataforma.
 *
 * O servidor entrega as Missões cadastradas (arquivos de conteúdo); a Home
 * (cliente) escolhe a Missão ativa e calcula o progresso a partir do trabalho
 * salvo no dispositivo. Nenhum conteúdo estático.
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

  return <DashboardHome missions={items} />;
}
