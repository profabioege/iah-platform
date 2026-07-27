export type MentorMessageRole = "student" | "mentor";

export interface MentorHistoryMessage {
  role: MentorMessageRole;
  content: string;
}

export interface MentorMissionContext {
  missionId: string;
  missionTitle: string;
  guidingQuestion: string;
  objective: string;
  currentStep: {
    number: number;
    label: string;
  };
  /** Competências IAH desenvolvidas pela Missão (bloco 11), quando houver. */
  competencies?: string[];
  /** Produção do aluno em andamento (bloco 8), quando já houver algo escrito. */
  studentAttempt?: string | null;
}

export interface MentorRequest {
  message: string;
  history: readonly MentorHistoryMessage[];
  context: MentorMissionContext;
  signal?: AbortSignal;
}

export interface MentorResponse {
  content: string;
}

/**
 * Porta de conversa do Mentor IAH. Uma futura integração com o IAH AI
 * Gateway deve implementar este contrato sem acoplar a interface ao transporte.
 */
export interface MentorProvider {
  readonly id: string;
  sendMessage(request: MentorRequest): Promise<MentorResponse>;
}
