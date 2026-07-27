/**
 * Persistência da conversa do Mentor IAH — primeira fatia (sessão +
 * mensagens; sem síntese pedagógica, sugestão de nota, validação
 * docente ou intervenção — ver `docs/product/mentor-iah-persistencia-sintese-mvp.md`
 * para o que vem depois, ainda não implementado).
 *
 * Uma `MentorSession` liga a conversa a instituição, Missão, atribuição
 * da Missão (`MissionAssignment`, `modules/platform`) e aluno — a mesma
 * chave que o resto da plataforma usa para isolar dados por tenant
 * (D-023). Uma sessão por aluno×atribuição (reabrir a Missão reutiliza
 * a mesma sessão); fechá-la fica para uma fatia futura.
 */

import type { MentorMessageRole } from "./mentor-provider.ts";

/** Versão do motor/prompt do Mentor que produziu as mensagens da sessão. */
export const CURRENT_MENTOR_VERSION = "mentor-iah-v1";

export type MentorSessionStatus = "active" | "completed";

export interface MentorSession {
  id: string;
  institutionId: string;
  missionId: string;
  assignmentId: string;
  studentId: string;
  mentorVersion: string;
  status: MentorSessionStatus;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  /** Maior nível de apoio já usado na sessão (leve/intermediário/estruturado), quando conhecido. */
  maximumSupportLevel: string | null;
  requiresTeacherIntervention: boolean;
  createdAt: string;
}

/**
 * Uma mensagem persistida da sessão. Guarda só o texto trocado — nunca
 * raciocínio interno do modelo, segredo, token ou payload técnico.
 * `pedagogicalStage`/`supportLevel` são metadados opcionais para leitura
 * futura (painel docente, síntese); nenhuma lógica desta fatia depende
 * deles.
 */
export interface MentorMessageRecord {
  id: string;
  sessionId: string;
  role: MentorMessageRole;
  content: string;
  pedagogicalStage: string | null;
  supportLevel: string | null;
  createdAt: string;
  sequenceNumber: number;
}

/** Cria a sessão inicial (sempre `active`) para uma nova sessão do Mentor. */
export function createMentorSession(params: {
  id: string;
  institutionId: string;
  missionId: string;
  assignmentId: string;
  studentId: string;
  now: string;
}): MentorSession {
  return {
    id: params.id,
    institutionId: params.institutionId,
    missionId: params.missionId,
    assignmentId: params.assignmentId,
    studentId: params.studentId,
    mentorVersion: CURRENT_MENTOR_VERSION,
    status: "active",
    startedAt: params.now,
    updatedAt: params.now,
    completedAt: null,
    maximumSupportLevel: null,
    requiresTeacherIntervention: false,
    createdAt: params.now,
  };
}
