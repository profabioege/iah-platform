/**
 * Entidades institucionais da plataforma (contexto Instituição +
 * Aprendizagem & Entrega de docs/DOMAIN_MODEL.md, identificadores em
 * inglês conforme a tabela de equivalência).
 *
 * Multi-tenant: toda entidade operacional carrega `institutionId` —
 * a Instituição é a raiz e a fronteira de isolamento lógico. Não há
 * bancos separados por escola; o isolamento é por coluna + contrato.
 */

import type { StudentMissionStatus } from "@/modules/classroom";

/** Instituição de ensino — o tenant. Raiz de todo o modelo. */
export interface Institution {
  id: string;
  name: string;
  status: "active" | "suspended";
  createdAt: string;
}

/** Período letivo de uma Instituição (ex.: "2026"). */
export interface AcademicYear {
  id: string;
  institutionId: string;
  label: string;
  startsOn: string;
  endsOn: string;
  status: "planned" | "active" | "closed";
}

/** Professor — pertence a uma Instituição, leciona Turmas. */
export interface Teacher {
  id: string;
  institutionId: string;
  name: string;
  email: string;
}

/** Turma — pertence a um Ano Letivo (e, transitivamente, à Instituição). */
export interface Classroom {
  id: string;
  institutionId: string;
  academicYearId: string;
  name: string;
  grade: string | null;
  teacherIds: string[];
}

/** Aluno — o Auditor da Realidade. Vinculado a Turmas via Enrollment. */
export interface Student {
  id: string;
  institutionId: string;
  name: string;
  /** E-mail institucional — chave de reconciliação entre origens de importação. */
  email: string | null;
}

/** Matrícula — vínculo aluno↔turma com estado próprio (DOMAIN_MODEL.md). */
export interface Enrollment {
  id: string;
  institutionId: string;
  classroomId: string;
  studentId: string;
  status: "active" | "transferred" | "completed";
  enrolledAt: string;
}

/**
 * Registro de metadados de uma Missão para integridade referencial.
 * O conteúdo pedagógico continua vivendo em arquivo
 * (src/content/missions/*) — convenção "uma Missão = um arquivo".
 */
export interface MissionRecord {
  id: string;
  number: number;
  title: string;
  module: string;
  status: "draft" | "published" | "archived";
  version: number;
}

/** Estado de avanço de um Aluno numa Missão, dentro de uma Turma. */
export interface MissionProgress {
  id: string;
  institutionId: string;
  classroomId: string;
  studentId: string;
  missionId: string;
  status: StudentMissionStatus;
  lastAccessAt: string | null;
}

/** Produção do Aluno — o artefato entregue (Relatório de Auditoria etc.). */
export interface Production {
  id: string;
  institutionId: string;
  classroomId: string;
  studentId: string;
  missionId: string;
  content: string;
  status: "draft" | "delivered";
  deliveredAt: string | null;
  updatedAt: string;
}

/** Reflexão — entrada do Diário do Auditor, motivada por uma Missão. */
export interface Reflection {
  id: string;
  institutionId: string;
  classroomId: string;
  studentId: string;
  missionId: string;
  text: string;
  recordedAt: string;
  visibility: "private" | "shared_with_teacher";
}

/** Provedores de integração/importação reconhecidos pela plataforma. */
export type IntegrationProviderId =
  | "manual"
  | "csv"
  | "google"
  | "microsoft"
  | "moodle"
  | "api";

/** Integração de sala de aula configurada por uma Instituição. */
export interface ClassroomIntegration {
  id: string;
  institutionId: string;
  provider: IntegrationProviderId;
  status: "active" | "revoked";
  /** Mapeamento turma externa → turma interna (id externo → Classroom.id). */
  externalCourseMap: Record<string, string>;
  lastSyncAt: string | null;
}

/** Situação da última sincronização de uma Turma com uma origem externa. */
export type ClassroomSyncStatus =
  | "never_synced"
  | "synced"
  | "out_of_date"
  | "failed";

/**
 * Estado de sincronização de uma Turma com um provedor externo
 * (docs/GOOGLE_CLASSROOM_INTEGRATION.md). Vive ao lado da Turma, não
 * dentro dela: uma Turma criada manualmente simplesmente não tem este
 * registro.
 */
export interface ClassroomSyncState {
  id: string;
  institutionId: string;
  classroomId: string;
  provider: IntegrationProviderId;
  /** Id da turma na origem (ex.: courseId do Google Classroom). */
  externalCourseId: string;
  status: ClassroomSyncStatus;
  lastSyncAt: string | null;
  studentCount: number;
  assignmentCount: number;
  /** Mensagem do erro quando status === "failed". */
  lastError: string | null;
}

/**
 * Indicadores — projeção agregada de uma Turma numa Missão.
 * NUNCA persistido (DOMAIN_MODEL.md): é sempre recalculado a partir
 * de MissionProgress; não existe tabela correspondente.
 */
export interface ClassIndicators {
  institutionId: string;
  classroomId: string;
  missionId: string;
  totalStudents: number;
  /** Alunos que ao menos visualizaram a Missão. */
  startedCount: number;
  /** Alunos que concluíram (produção + reflexão). */
  completedCount: number;
  /** startedCount / totalStudents, em [0, 1]. 0 quando a turma está vazia. */
  adhesionRate: number;
  /** completedCount / totalStudents, em [0, 1]. 0 quando a turma está vazia. */
  completionRate: number;
  computedAt: string;
}
