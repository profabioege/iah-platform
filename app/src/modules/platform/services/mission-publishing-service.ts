/**
 * Implementação real de `MissionPublishingService` (M17 — Learning
 * Lifecycle). O contrato existia desde D-023 como "arquitetura apenas"
 * — publicar uma Missão numa Turma exigia Atividade, persistência e
 * autenticação; as três já existem agora (`MissionAssignment` como
 * Atividade, `missionAssignments` como persistência em memória,
 * Institutional Workspace como autenticação, M15).
 *
 * `missionVersion` fixo em 1: `Mission` (`modules/library`) ainda não
 * tem versionamento real (isso é `MissionTemplate`, `AUTHORING_MODEL.md`,
 * ainda não implementado) — fixar aqui documenta a lacuna sem fingir
 * resolvê-la.
 */

import type { PlatformRepositories } from "../domain/repositories";
import type { MissionPublishingService } from "../domain/mission-delivery";

export function createMissionPublishingService(
  repositories: PlatformRepositories,
): MissionPublishingService {
  return {
    async publish({ institutionId, classroomId, missionId, dueAt }) {
      const assignment = {
        id: crypto.randomUUID(),
        institutionId,
        classroomId,
        missionId,
        missionVersion: 1,
        publishedAt: new Date().toISOString(),
        dueAt: dueAt ?? null,
        externalAssignmentId: null,
      };
      await repositories.missionAssignments.save(institutionId, assignment);
      return assignment;
    },

    async listByClassroom(institutionId, classroomId) {
      return repositories.missionAssignments.listByClassroom(institutionId, classroomId);
    },

    async listSubmissions(institutionId, assignmentId) {
      const assignment = await repositories.missionAssignments.getById(
        institutionId,
        assignmentId,
      );
      if (!assignment) return [];
      return repositories.productions.listByClassroomMission(
        institutionId,
        assignment.classroomId,
        assignment.missionId,
      );
    },
  };
}
