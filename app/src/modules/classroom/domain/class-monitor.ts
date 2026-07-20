/**
 * Acompanhamento da turma durante uma Missão (visão do Professor).
 *
 * O painel (`ClassPanel`) consome apenas o contrato
 * {@link ClassMonitorReader}. Desde a M17, a implementação em uso é
 * `createInstitutionalClassMonitor` (`modules/platform`), sobre a
 * arquitetura institucional real — a troca para banco fica só na
 * implementação dos repositórios de `modules/platform`, sem alterar
 * este contrato nem `ClassPanel`.
 */

/** Estados possíveis de um aluno dentro de uma Missão, em ordem de avanço. */
export type StudentMissionStatus =
  | "nao_acessou"
  | "visualizou"
  | "investigando"
  | "produzindo"
  | "rascunho"
  | "entregue"
  | "reflexao"
  | "concluiu"
  | "avaliado";

/** Ordem pedagógica dos estados (usada em contadores e filtros). */
export const STUDENT_MISSION_STATUSES: StudentMissionStatus[] = [
  "nao_acessou",
  "visualizou",
  "investigando",
  "produzindo",
  "rascunho",
  "entregue",
  "reflexao",
  "concluiu",
  "avaliado",
];

/** Fotografia do trabalho de um aluno em uma Missão. */
export interface StudentMissionSnapshot {
  studentId: string;
  studentName: string;
  status: StudentMissionStatus;
  /** Último acesso à Missão (ISO); null se nunca acessou. */
  lastAccessAt: string | null;
  /** Texto da produção, quando existente (rascunho em diante). */
  production: string | null;
  /** Texto da reflexão, quando registrada. */
  reflection: string | null;
  /** Avaliação humana, quando concluída pelo Professor. */
  review?: import("./student-work").StudentWorkReview | null;
}

/** Contrato de leitura do acompanhamento de turma (porta do domínio). */
export interface ClassMonitorReader {
  /** Fotografias de todos os alunos da turma em uma Missão. */
  listByMission(missionId: string): Promise<StudentMissionSnapshot[]>;
}
