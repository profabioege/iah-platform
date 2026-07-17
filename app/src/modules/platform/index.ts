/**
 * Módulo Platform — núcleo institucional multi-tenant do IAH.
 *
 * Camadas: domain (entidades + contratos), services (regras puras),
 * infrastructure (seed em memória + database stub + factory), seeds
 * (dados de demonstração, nunca persistidos). Schema SQL correspondente:
 * app/db/migrations/. Documentação: docs/PERSISTENCE.md.
 *
 * NENHUMA página consome este módulo ainda — a UI segue nos stores
 * atuais (localStorage + turma simulada) até a troca documentada em
 * docs/PERSISTENCE.md.
 */

export type {
  AcademicYear,
  ClassIndicators,
  Classroom,
  ClassroomIntegration,
  ClassroomSyncState,
  ClassroomSyncStatus,
  Enrollment,
  Institution,
  IntegrationProviderId,
  MissionProgress,
  MissionRecord,
  Production,
  Reflection,
  Student,
  Teacher,
} from "./domain/entities";

export type {
  AssistedEvaluationService,
  AssistedEvaluationSuggestion,
  MissionAssignment,
  MissionPublishingService,
} from "./domain/mission-delivery";

export type {
  AcademicYearRepository,
  ClassroomIntegrationRepository,
  ClassroomRepository,
  ClassroomSyncStateRepository,
  EnrollmentRepository,
  InstitutionRepository,
  MissionProgressRepository,
  MissionRecordRepository,
  PlatformRepositories,
  ProductionRepository,
  ReflectionRepository,
  StudentRepository,
  TeacherRepository,
} from "./domain/repositories";

export { computeClassIndicators } from "./services/indicator-service";
export {
  createImportService,
  type ImportPreview,
  type ImportResult,
} from "./services/import-service";
export {
  createClassroomSyncService,
  type SyncResult,
} from "./services/classroom-sync-service";

export {
  createRepositories,
  getDefaultRepositories,
  type RepositorySource,
} from "./infrastructure/repository-factory";
export { isDatabaseConfigured } from "./infrastructure/database/supabase-client";
