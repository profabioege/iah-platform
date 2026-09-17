import { buildDemoStudioMission, type StudioMission } from "@/modules/authoring";
import { DEMO_LESSON } from "@/modules/lesson";
import { localMissionRepository } from "@/modules/library";
import { WORKSPACE_TEACHER } from "@/modules/workspace";

/**
 * Semente do Estúdio no modo demo: a Missão 01 do conteúdo (a mesma que o
 * aluno percorre), atribuída ao professor e à série do seed demo. Chamada
 * somente pelas telas do Estúdio depois de `requirePlatformDataMode()`
 * confirmar o modo `demo`.
 */
export async function loadDemoStudioSeed(): Promise<StudioMission[]> {
  const missions = await localMissionRepository.list();
  const missao01 = missions.find((mission) => mission.number === 1);
  if (!missao01) return [];
  return [
    buildDemoStudioMission(missao01, {
      author: WORKSPACE_TEACHER.name,
      schoolYear: DEMO_LESSON.grade,
    }),
  ];
}
