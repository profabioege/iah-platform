/**
 * Serviço da sessão do Mentor IAH — encontra/cria a sessão, lista o
 * histórico e persiste a troca de mensagens. Autorização por
 * instituição/turma/aluno é responsabilidade do chamador (Server
 * Action): este serviço confia no `institutionId`/`assignmentId`/
 * `studentId` recebidos, exatamente como `learning-cycle-service`
 * (`modules/platform`).
 *
 * Fase 6 (fallback): o motor determinístico de demonstração
 * (`demoMentorProvider`) passa por este mesmo serviço — não existe um
 * caminho de armazenamento separado para ele. `sendMessage` sempre
 * persiste a mensagem do estudante ANTES de chamar o provedor: se o
 * provedor falhar depois, a mensagem do estudante já está salva.
 */

import type { MissionAssignment } from "@/modules/platform";

import { demoMentorProvider } from "../infrastructure/demo-mentor-provider.ts";
import { createMentorSession } from "../domain/mentor-session.ts";
import type { MentorMessageRecord, MentorSession } from "../domain/mentor-session.ts";
import type { MentorRepositories } from "../domain/repositories.ts";
import type { MentorHistoryMessage, MentorMissionContext } from "../domain/mentor-provider.ts";

/**
 * A atribuição da Missão para esta Turma, se existir e estiver publicada
 * (nunca rascunho). Função pura — o chamador (`mentor-actions.ts`) resolve
 * a lista de atribuições da sessão autenticada; esta função só decide qual
 * delas (se alguma) serve à Missão pedida.
 */
export function findAssignmentForMission(
  assignments: readonly MissionAssignment[],
  missionId: string,
): MissionAssignment | null {
  return (
    assignments.find((a) => a.missionId === missionId && a.status !== "draft") ?? null
  );
}

export interface MentorSessionScope {
  institutionId: string;
  missionId: string;
  assignmentId: string;
  studentId: string;
}

export interface SendMentorMessageParams {
  scope: MentorSessionScope;
  sessionId: string;
  /**
   * Gerado uma única vez no cliente (ex.: `crypto.randomUUID()`) e
   * reaproveitado em cada tentativa — é o que torna o reenvio depois de
   * uma falha idempotente (nunca duplica a mensagem do estudante nem
   * gera uma segunda resposta do Mentor para o mesmo envio).
   */
  clientMessageId: string;
  content: string;
  history: readonly MentorHistoryMessage[];
  context: MentorMissionContext;
  /** Etapa da Missão no momento do envio (rótulo livre, `currentStep.label`). */
  pedagogicalStage: string | null;
}

export function createMentorSessionService(repositories: MentorRepositories) {
  async function getOrCreateSession(scope: MentorSessionScope): Promise<MentorSession> {
    const existing = await repositories.sessions.findActiveByAssignment(
      scope.institutionId,
      scope.assignmentId,
      scope.studentId,
    );
    if (existing) return existing;

    const session = createMentorSession({
      // Determinístico: reabrir a mesma atribuição sempre aponta para a
      // mesma sessão, sem depender de uma leitura-antes-de-escrever para
      // evitar duplicata (a unicidade real vem do banco/seed, não daqui).
      // Inclui institutionId — `id` é chave primária global da tabela,
      // não escopada por tenant, então precisa ser globalmente único.
      id: `mentor-session-${scope.institutionId}-${scope.assignmentId}-${scope.studentId}`,
      institutionId: scope.institutionId,
      missionId: scope.missionId,
      assignmentId: scope.assignmentId,
      studentId: scope.studentId,
      now: new Date().toISOString(),
    });
    await repositories.sessions.create(scope.institutionId, session);

    return (
      (await repositories.sessions.findActiveByAssignment(
        scope.institutionId,
        scope.assignmentId,
        scope.studentId,
      )) ?? session
    );
  }

  async function listMessages(
    institutionId: string,
    sessionId: string,
  ): Promise<MentorMessageRecord[]> {
    return repositories.messages.listBySession(institutionId, sessionId);
  }

  async function sendMessage(
    params: SendMentorMessageParams,
  ): Promise<{ studentMessage: MentorMessageRecord; mentorMessage: MentorMessageRecord }> {
    // 1. Persiste a mensagem do estudante — sempre primeiro, sempre antes
    //    de acionar o Mentor.
    const studentMessage = await repositories.messages.append(params.scope.institutionId, {
      id: params.clientMessageId,
      sessionId: params.sessionId,
      role: "student",
      content: params.content,
      pedagogicalStage: params.pedagogicalStage,
      supportLevel: null,
    });

    // 2. Solicita a resposta do Mentor (motor demonstrativo — Fase 6:
    //    mesmo caminho de persistência de um futuro provedor real).
    const response = await demoMentorProvider.sendMessage({
      message: params.content,
      history: params.history,
      context: params.context,
    });

    // 3. Persiste a resposta.
    const mentorMessage = await repositories.messages.append(params.scope.institutionId, {
      id: `${params.clientMessageId}-reply`,
      sessionId: params.sessionId,
      role: "mentor",
      content: response.content,
      pedagogicalStage: params.pedagogicalStage,
      supportLevel: null,
    });

    await repositories.sessions.touch(
      params.scope.institutionId,
      params.sessionId,
      new Date().toISOString(),
    );

    return { studentMessage, mentorMessage };
  }

  return { getOrCreateSession, listMessages, sendMessage };
}

export type MentorSessionService = ReturnType<typeof createMentorSessionService>;
