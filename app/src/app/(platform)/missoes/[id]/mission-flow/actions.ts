"use server";

/**
 * Server Actions do ciclo de aprendizagem do Aluno no modo REAL (M22) —
 * produção, entrega e reflexão persistidas no banco
 * (`learning-cycle-service`, `modules/platform`). `institutionId`/
 * `classroomId`/`studentId` NUNCA vêm do cliente: são sempre derivados
 * da sessão autenticada (`getWorkspaceContext()`) — a autorização por
 * papel/tenant é aplicada aqui, não só na interface.
 */

import { createLearningCycleService, type LearningCycleScope } from "@/modules/platform";
import { getRequestRepositories } from "@/modules/platform/infrastructure/request-repositories";
import { getWorkspaceContext } from "@/modules/workspace";
import type { StudentWork } from "@/modules/classroom";

async function requireStudentScope(missionId: string): Promise<LearningCycleScope> {
  const workspace = await getWorkspaceContext();
  if (!workspace) throw new Error("Sessão expirada — entre novamente.");
  if (workspace.role !== "student" || !workspace.user.studentId) {
    throw new Error("Apenas Alunos realizam Missões.");
  }
  const classroomId = workspace.classrooms[0]?.id;
  if (!classroomId) {
    throw new Error("Nenhuma Turma vinculada à sua matrícula.");
  }
  return {
    institutionId: workspace.institution.id,
    classroomId,
    studentId: workspace.user.studentId,
    missionId,
  };
}

async function service() {
  return createLearningCycleService(await getRequestRepositories());
}

export async function getStudentWorkAction(missionId: string): Promise<StudentWork> {
  const scope = await requireStudentScope(missionId);
  return (await service()).getStudentWork(scope);
}

export async function startMissionAction(missionId: string): Promise<StudentWork> {
  const scope = await requireStudentScope(missionId);
  return (await service()).startMission(scope);
}

export async function saveProductionDraftAction(
  missionId: string,
  content: string,
): Promise<StudentWork> {
  const scope = await requireStudentScope(missionId);
  return (await service()).saveProductionDraft(scope, content);
}

export async function setProductionDeliveredAction(
  missionId: string,
  delivered: boolean,
): Promise<StudentWork> {
  const scope = await requireStudentScope(missionId);
  return (await service()).setProductionDelivered(scope, delivered);
}

export async function saveReflectionDraftAction(
  missionId: string,
  text: string,
): Promise<StudentWork> {
  const scope = await requireStudentScope(missionId);
  return (await service()).saveReflectionDraft(scope, text);
}

export async function setReflectionRecordedAction(
  missionId: string,
  recorded: boolean,
): Promise<StudentWork> {
  const scope = await requireStudentScope(missionId);
  return (await service()).setReflectionRecorded(scope, recorded);
}
