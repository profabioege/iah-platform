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
  type MissionAssignment,
} from "@/modules/platform";
import { getWorkspaceContext } from "@/modules/workspace";

export async function publishLessonMission(params: {
  institutionId: string;
  classroomId: string;
  missionId: string;
  lessonId: string;
}): Promise<MissionAssignment> {
  const workspace = await getWorkspaceContext();
  if (!workspace || workspace.role === "student") {
    throw new Error("Apenas a equipe pedagógica pode publicar Missões.");
  }
  if (
    workspace.institution.id !== params.institutionId ||
    !workspace.classrooms.some((classroom) => classroom.id === params.classroomId)
  ) {
    throw new Error("Turma fora do contexto institucional atual.");
  }
  const service = createMissionPublishingService(getDefaultRepositories());
  const assignment = await service.publish(params);
  revalidatePath("/professor/turmas");
  revalidatePath("/dashboard");
  revalidatePath("/gestor");
  return assignment;
}
