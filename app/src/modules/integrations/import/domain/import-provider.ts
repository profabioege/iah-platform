/**
 * Porta de importação de Turmas/Alunos de qualquer origem externa
 * (docs/IMPORT_ARCHITECTURE.md). A plataforma nunca depende da origem:
 * toda implementação devolve os mesmos tipos de fronteira, e quem grava
 * no modelo interno é o ImportService (modules/platform) — o provider é
 * estritamente só-leitura.
 */

/** Provedores de importação reconhecidos (mesma união de IntegrationProviderId). */
export type ImportProviderId =
  | "manual"
  | "csv"
  | "google"
  | "microsoft"
  | "moodle"
  | "api";

/** Turma candidata encontrada na origem — dado cru, ainda não confirmado. */
export interface ImportedClassroom {
  externalId: string;
  name: string;
}

/** Aluno candidato encontrado na origem — dado cru, ainda não confirmado. */
export interface ImportedStudent {
  externalId: string;
  name: string;
  /** Chave de reconciliação entre origens; null quando a origem não fornece. */
  email: string | null;
}

/** Contrato de leitura de uma origem externa de turmas/alunos. */
export interface ImportProvider {
  readonly id: ImportProviderId;
  /** Falso enquanto a origem não tem credencial/fonte configurada. */
  readonly isConfigured: boolean;
  listClassrooms(): Promise<ImportedClassroom[]>;
  listStudents(externalClassroomId: string): Promise<ImportedStudent[]>;
}
