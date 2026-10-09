"use server";

/**
 * Server Action do Professor no modo REAL (M22): avaliação + devolutiva
 * de uma entrega (`learning-cycle-service`, `modules/platform`).
 * `institutionId` nunca vem do cliente — é derivado da sessão; a turma
 * informada é validada contra as turmas do próprio professor (mesma
 * checagem de `professor/turmas/actions.ts`).
 */

import { revalidatePath } from "next/cache";

import { createLearningCycleService } from "@/modules/platform";
import { getRequestRepositories } from "@/modules/platform/infrastructure/request-repositories";
import { getWorkspaceContext } from "@/modules/workspace";
import type { StudentWork, StudentWorkAxesReview } from "@/modules/classroom";
import { localMissionRepository } from "@/modules/library";

export async function reviewSubmissionAction(params: {
  classroomId: string;
  studentId: string;
  missionId: string;
  grade: string;
  observedCriteria: string[];
  feedback: string;
  /** Avaliação separada dos dois eixos — obrigatória nas Missões de dois eixos (D-053). */
  axes?: StudentWorkAxesReview | null;
}): Promise<StudentWork> {
  const workspace = await getWorkspaceContext();
  if (!workspace || workspace.role === "student") {
    throw new Error("Apenas a equipe pedagógica pode avaliar entregas.");
  }
  if (!workspace.classrooms.some((c) => c.id === params.classroomId)) {
    throw new Error("Turma fora do contexto institucional atual.");
  }

  // A especificação dos eixos vem do arquivo da Missão, nunca do cliente.
  // Missão só registrada no banco (sem arquivo de conteúdo, como a
  // sintética da homologação) não tem eixos: segue a avaliação de sempre.
  const mission = await localMissionRepository.getById(params.missionId);

  const service = createLearningCycleService(await getRequestRepositories());
  const work = await service.reviewSubmission(
    {
      institutionId: workspace.institution.id,
      classroomId: params.classroomId,
      studentId: params.studentId,
      missionId: params.missionId,
    },
    {
      grade: params.grade,
      observedCriteria: params.observedCriteria,
      feedback: params.feedback,
      reviewerId: workspace.user.id,
      reviewerName: workspace.user.name,
      axes: params.axes ?? null,
    },
    mission?.axes,
  );
  revalidatePath("/professor");
  revalidatePath("/professor/turmas");
  revalidatePath("/dashboard");
  revalidatePath("/gestor");
  return work;
}
