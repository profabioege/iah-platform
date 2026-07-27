"use server";

/**
 * Server Actions da persistência do Mentor IAH (primeira fatia — sessão
 * + mensagens). `institutionId`/`assignmentId`/`studentId` NUNCA vêm do
 * cliente: são sempre derivados da sessão autenticada
 * (`getWorkspaceContext()`), o mesmo padrão de
 * `missoes/[id]/mission-flow/actions.ts` (StudentWork).
 */

import { getDefaultRepositories } from "@/modules/platform";
import { getWorkspaceContext } from "@/modules/workspace";

import type { MentorHistoryMessage } from "../domain/mentor-provider.ts";
import type { MentorMessageRecord } from "../domain/mentor-session.ts";
import type { MentorMissionContext } from "../domain/mentor-provider.ts";
import type { MentorSessionScope } from "../services/mentor-session-service.ts";
import {
  createMentorSessionService,
  findAssignmentForMission,
} from "../services/mentor-session-service.ts";
import { getDefaultMentorRepositories } from "./repository-factory.ts";

async function requireMentorScope(missionId: string): Promise<MentorSessionScope> {
  const workspace = await getWorkspaceContext();
  if (!workspace) throw new Error("Sessão expirada — entre novamente.");
  if (workspace.role !== "student" || !workspace.user.studentId) {
    throw new Error("Apenas Alunos podem conversar com o Mentor IAH.");
  }
  const classroomId = workspace.classrooms[0]?.id;
  if (!classroomId) {
    throw new Error("Nenhuma Turma vinculada à sua matrícula.");
  }

  const assignments = await getDefaultRepositories().missionAssignments.listByClassroom(
    workspace.institution.id,
    classroomId,
  );
  const assignment = findAssignmentForMission(assignments, missionId);
  if (!assignment) {
    throw new Error("Esta Missão ainda não foi atribuída à sua turma.");
  }

  return {
    institutionId: workspace.institution.id,
    missionId,
    assignmentId: assignment.id,
    studentId: workspace.user.studentId,
  };
}

function service() {
  return createMentorSessionService(getDefaultMentorRepositories());
}

/** Chamada ao abrir o painel: localiza ou cria a sessão e devolve o histórico. */
export async function openMentorSessionAction(
  missionId: string,
): Promise<{ sessionId: string; messages: MentorMessageRecord[] }> {
  const scope = await requireMentorScope(missionId);
  const session = await service().getOrCreateSession(scope);
  const messages = await service().listMessages(scope.institutionId, session.id);
  return { sessionId: session.id, messages };
}

export async function sendMentorMessageAction(params: {
  missionId: string;
  sessionId: string;
  clientMessageId: string;
  content: string;
  history: MentorHistoryMessage[];
  context: MentorMissionContext;
  pedagogicalStage: string | null;
}): Promise<{ studentMessage: MentorMessageRecord; mentorMessage: MentorMessageRecord }> {
  const scope = await requireMentorScope(params.missionId);

  // A sessão informada pelo cliente precisa ser a sessão real deste
  // aluno para esta atribuição — nunca confia no id recebido sozinho
  // (isolamento entre alunos).
  const session = await service().getOrCreateSession(scope);
  if (session.id !== params.sessionId) {
    throw new Error("Sessão do Mentor não corresponde ao aluno autenticado.");
  }

  return service().sendMessage({
    scope,
    sessionId: session.id,
    clientMessageId: params.clientMessageId,
    content: params.content,
    history: params.history,
    context: params.context,
    pedagogicalStage: params.pedagogicalStage,
  });
}
