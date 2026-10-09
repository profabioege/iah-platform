"use server";

/**
 * Atribuição de uma Missão da Trilha IA & Humanidades a uma turma (D-053).
 *
 * Mesmo serviço de publicação das Turmas (`createMissionPublishingService`),
 * sem exigir uma Lesson: a Missão de dois eixos já traz objetivo,
 * habilidade da disciplina, competências de IA e critérios. Escopo
 * (instituição, turma) sempre conferido na sessão; a RLS de
 * `mission_assignments` (0010) só deixa o professor da turma gravar.
 */

import { revalidatePath } from "next/cache";

import { localMissionRepository } from "@/modules/library";
import { createMissionPublishingService } from "@/modules/platform";
import { getRequestRepositories } from "@/modules/platform/infrastructure/request-repositories";
import { getWorkspaceContext } from "@/modules/workspace";

export async function assignAiMissionAction(params: {
  classroomId: string;
  missionId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const workspace = await getWorkspaceContext();
    if (!workspace || workspace.role !== "teacher") {
      throw new Error("Apenas o professor da turma atribui missões.");
    }
    if (!workspace.classrooms.some((c) => c.id === params.classroomId)) {
      throw new Error("Turma fora do seu alcance.");
    }
    const mission = await localMissionRepository.getById(params.missionId);
    if (!mission || !mission.axes || mission.status !== "published") {
      throw new Error("Esta missão não faz parte da Trilha IA & Humanidades.");
    }
    const repositories = await getRequestRepositories();
    const existing = await repositories.missionAssignments.listByClassroom(
      workspace.institution.id,
      params.classroomId,
    );
    if (!existing.some((a) => a.missionId === mission.id && a.status === "published")) {
      await createMissionPublishingService(repositories).publish({
        institutionId: workspace.institution.id,
        classroomId: params.classroomId,
        missionId: mission.id,
        lessonId: null,
      });
    }
    revalidatePath("/professor/trilha-ia");
    revalidatePath("/professor/turmas");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível atribuir." };
  }
}
