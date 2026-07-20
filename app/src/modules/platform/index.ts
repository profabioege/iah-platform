/**
 * Módulo Platform — núcleo institucional multi-tenant do IAH.
 *
 * Camadas: domain (entidades + contratos), services (regras puras),
 * infrastructure (seed em memória + database stub + factory), seeds
 * (dados de demonstração, nunca persistidos). Schema SQL correspondente:
 * app/db/migrations/. Documentação: docs/PERSISTENCE.md.
 *
 * Desde a M17, este módulo é a fonte real do acompanhamento de turma
 * (`institutional-class-monitor.ts`) e da publicação de Missão
 * (`mission-publishing-service.ts`) — o Painel do Professor não depende
 * mais de `modules/classroom/infrastructure/simulated-class-monitor`.
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
  MissionReview,
  Production,
  Reflection,
  Student,
  Teacher,
} from "./domain/entities";

export type {
  AssistedEvaluationService,
  AssistedEvaluationSuggestion,
  MissionAssignment,
  MissionAssignmentStatus,
  MissionPublishingService,
} from "./domain/mission-delivery";
export { canTransitionMissionAssignment } from "./domain/mission-delivery";

export type {
  AcademicYearRepository,
  ClassroomIntegrationRepository,
  ClassroomRepository,
  ClassroomSyncStateRepository,
  EnrollmentRepository,
  InstitutionRepository,
  MissionAssignmentRepository,
  MissionProgressRepository,
  MissionRecordRepository,
  MissionReviewRepository,
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
export { createMissionPublishingService } from "./services/mission-publishing-service";
export { createInstitutionalClassMonitor } from "./services/institutional-class-monitor";
export {
  createLearningCycleService,
  type LearningCycleScope,
  type LearningCycleService,
} from "./services/learning-cycle-service";

export {
  createRepositories,
  getDefaultRepositories,
  type RepositorySource,
} from "./infrastructure/repository-factory";
export { isDatabaseConfigured } from "./infrastructure/database/supabase-client";
export {
  listLocalMissionAssignments,
  saveLocalMissionAssignment,
  MISSION_ASSIGNMENTS_UPDATED_EVENT,
} from "./infrastructure/local/local-mission-assignment-store";
export {
  getSupabaseAdminClient,
  isAdminDatabaseConfigured,
} from "./infrastructure/database/admin-client";
