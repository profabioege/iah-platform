/**
 * Contratos de persistência da conversa do Mentor IAH (portas do
 * domínio) — mesma regra multi-tenant do resto da plataforma:
 * `institutionId` é sempre o primeiro parâmetro (D-023).
 *
 * Implementações: infrastructure/seed (em memória, modo demonstração)
 * e infrastructure/database (Supabase/PostgreSQL, modo real) — a
 * mesma dupla usada em `modules/platform` e `modules/assessment`.
 */

import type { MentorMessageRecord, MentorSession } from "./mentor-session.ts";

export interface MentorSessionRepository {
  /** Sessão ativa do aluno para esta atribuição, se existir. */
  findActiveByAssignment(
    institutionId: string,
    assignmentId: string,
    studentId: string,
  ): Promise<MentorSession | null>;
  /**
   * Cria a sessão. Idempotente por `id` — chamar de novo com o mesmo
   * `id` não duplica nem sobrescreve uma sessão já existente.
   */
  create(institutionId: string, session: MentorSession): Promise<void>;
  /** Atualiza só `updatedAt` (ping de atividade da sessão). */
  touch(institutionId: string, sessionId: string, updatedAt: string): Promise<void>;
}

export interface MentorMessageRepository {
  /** Mensagens da sessão, em ordem determinística (`sequenceNumber`). */
  listBySession(
    institutionId: string,
    sessionId: string,
  ): Promise<MentorMessageRecord[]>;
  /**
   * Acrescenta uma mensagem. Idempotente por `id`: reenviar a mesma
   * mensagem (retry após falha) não cria duplicata nem novo
   * `sequenceNumber` — devolve a linha já persistida.
   */
  append(
    institutionId: string,
    message: Omit<MentorMessageRecord, "sequenceNumber" | "createdAt">,
  ): Promise<MentorMessageRecord>;
}

export interface MentorRepositories {
  sessions: MentorSessionRepository;
  messages: MentorMessageRepository;
}
