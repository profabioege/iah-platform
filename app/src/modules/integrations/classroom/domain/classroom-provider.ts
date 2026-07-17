/**
 * Abstração de integração com um provedor externo de sala de aula (Google
 * Classroom hoje; Microsoft Teams é um provedor futuro possível sob o
 * mesmo contrato). A UI depende apenas desta interface, nunca de um
 * provedor específico.
 */

export interface ExternalCourse {
  id: string;
  name: string;
}

export interface ExternalStudent {
  id: string;
  name: string;
  email: string;
}

/** Porta de integração de sala de aula (domínio). Implementações em `infrastructure/`. */
export interface ClassroomProvider {
  readonly id: "mock" | "google";
  /** Falso enquanto as credenciais reais do provedor não existem. */
  readonly isConfigured: boolean;
  listCourses(): Promise<ExternalCourse[]>;
  listStudents(courseId: string): Promise<ExternalStudent[]>;
  /** Prepara a publicação de uma Missão numa turma — nesta fase, não publica de fato. */
  publishMission(courseId: string, missionId: string): Promise<void>;
}
