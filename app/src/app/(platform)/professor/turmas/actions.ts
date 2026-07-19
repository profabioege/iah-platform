"use server";

/**
 * Server Action do fluxo Professor (M17 — Learning Lifecycle):
 * "Publica a Mission para a turma". Usa o `MissionPublishingService`
 * real de `modules/platform` (D-023 tinha o contrato como "arquitetura
 * apenas" — Atividade, persistência e autenticação já existem agora).
 */

import { revalidatePath } from "next/cache";

import {
  createMissionPublishingService,
  getDefaultRepositories,
} from "@/modules/platform";

export async function publishLessonMission(params: {
  institutionId: string;
  classroomId: string;
  missionId: string;
}): Promise<void> {
  const service = createMissionPublishingService(getDefaultRepositories());
  await service.publish(params);
  revalidatePath("/professor/turmas");
}
