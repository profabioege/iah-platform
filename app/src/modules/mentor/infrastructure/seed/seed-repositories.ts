/**
 * Implementação SEED da persistência do Mentor IAH — em memória,
 * mesma convenção de `modules/platform`/`modules/assessment`: escritas
 * afetam só a memória do processo (nunca disco), coerente com "dado
 * fictício nunca é inserido por uma migration" (docs/PERSISTENCE.md).
 */

import type { MentorMessageRecord, MentorSession } from "../../domain/mentor-session.ts";
import type { MentorRepositories } from "../../domain/repositories.ts";

/** `institutionId` não faz parte do contrato público de `MentorMessageRecord` (o Mentor não expõe tenant ao chamador), mas o seed precisa dele para isolar dados em memória — mesmo papel da coluna `institution_id` na tabela real. */
type StoredMessage = MentorMessageRecord & { institutionId: string };

export function createSeedMentorRepositories(): MentorRepositories {
  const sessions: MentorSession[] = [];
  const messages: StoredMessage[] = [];

  return {
    sessions: {
      async findActiveByAssignment(institutionId, assignmentId, studentId) {
        return (
          sessions.find(
            (s) =>
              s.institutionId === institutionId &&
              s.assignmentId === assignmentId &&
              s.studentId === studentId &&
              s.status === "active",
          ) ?? null
        );
      },
      async create(institutionId, session) {
        const exists = sessions.some(
          (s) => s.institutionId === institutionId && s.id === session.id,
        );
        if (exists) return;
        sessions.push({ ...session, institutionId });
      },
      async touch(institutionId, sessionId, updatedAt) {
        const session = sessions.find(
          (s) => s.institutionId === institutionId && s.id === sessionId,
        );
        if (session) session.updatedAt = updatedAt;
      },
    },
    messages: {
      async listBySession(institutionId, sessionId) {
        return messages
          .filter((m) => m.institutionId === institutionId && m.sessionId === sessionId)
          .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
      },
      async append(institutionId, message) {
        const existing = messages.find(
          (m) => m.institutionId === institutionId && m.id === message.id,
        );
        if (existing) return existing;

        const sequenceNumber =
          1 +
          messages
            .filter((m) => m.institutionId === institutionId && m.sessionId === message.sessionId)
            .reduce((max, m) => Math.max(max, m.sequenceNumber), 0);

        const stored: StoredMessage = {
          ...message,
          institutionId,
          sequenceNumber,
          createdAt: new Date().toISOString(),
        };
        messages.push(stored);
        return stored;
      },
    },
  };
}
