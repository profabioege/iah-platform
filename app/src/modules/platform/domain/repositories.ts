/**
 * Contratos de persistência da plataforma (portas do domínio).
 *
 * Regra multi-tenant inegociável: todo método de leitura/escrita de
 * entidade operacional recebe `institutionId` como primeiro parâmetro —
 * o isolamento por tenant é imposto no contrato, não deixado a cargo
 * de cada implementação lembrar de filtrar.
 *
 * Implementações: infrastructure/seed (em memória, dados de demonstração)
 * e infrastructure/database (Supabase/PostgreSQL — stub até haver
 * credenciais; ver docs/PERSISTENCE.md).
 */

import type {
  AcademicYear,
  Classroom,
  ClassroomIntegration,
  ClassroomSyncState,
  Enrollment,
  Institution,
  MissionProgress,
  MissionRecord,
  MissionReview,
  Production,
  Reflection,
  Student,
  Teacher,
} from "./entities";
import type { MissionAssignment } from "./mission-delivery";

export interface InstitutionRepository {
  getById(id: string): Promise<Institution | null>;
  list(): Promise<Institution[]>;
}

export interface AcademicYearRepository {
  listByInstitution(institutionId: string): Promise<AcademicYear[]>;
}

export interface TeacherRepository {
  listByInstitution(institutionId: string): Promise<Teacher[]>;
}

export interface ClassroomRepository {
  listByInstitution(
    institutionId: string,
    academicYearId?: string,
  ): Promise<Classroom[]>;
  getById(institutionId: string, id: string): Promise<Classroom | null>;
  create(institutionId: string, classroom: Classroom): Promise<void>;
}

export interface StudentRepository {
  listByClassroom(
    institutionId: string,
    classroomId: string,
  ): Promise<Student[]>;
  /** Chave de reconciliação entre origens de importação (IMPORT_ARCHITECTURE.md). */
  findByEmail(institutionId: string, email: string): Promise<Student | null>;
  create(institutionId: string, student: Student): Promise<void>;
}

export interface EnrollmentRepository {
  listByClassroom(
    institutionId: string,
    classroomId: string,
  ): Promise<Enrollment[]>;
  create(institutionId: string, enrollment: Enrollment): Promise<void>;
}

export interface MissionRecordRepository {
  list(): Promise<MissionRecord[]>;
}

export interface MissionProgressRepository {
  listByClassroomMission(
    institutionId: string,
    classroomId: string,
    missionId: string,
  ): Promise<MissionProgress[]>;
  save(institutionId: string, progress: MissionProgress): Promise<void>;
}

export interface ProductionRepository {
  listByStudent(
    institutionId: string,
    studentId: string,
  ): Promise<Production[]>;
  /** Todas as produções de uma Turma numa Missão (M17 — acompanhamento institucional). */
  listByClassroomMission(
    institutionId: string,
    classroomId: string,
    missionId: string,
  ): Promise<Production[]>;
  save(institutionId: string, production: Production): Promise<void>;
}

export interface ReflectionRepository {
  listByStudent(
    institutionId: string,
    studentId: string,
  ): Promise<Reflection[]>;
  /** Todas as reflexões de uma Turma numa Missão (M17 — acompanhamento institucional). */
  listByClassroomMission(
    institutionId: string,
    classroomId: string,
    missionId: string,
  ): Promise<Reflection[]>;
  save(institutionId: string, reflection: Reflection): Promise<void>;
}

/**
 * Publicação de uma Missão numa Turma (M17) — mesma entidade
 * `MissionAssignment` de `domain/mission-delivery.ts`, agora com
 * persistência real (seed em memória): o contrato ficou "arquitetura
 * apenas" desde D-023 porque publicar exigia Atividade, persistência e
 * autenticação — as três já existem (Workspace, M15).
 */
export interface MissionAssignmentRepository {
  listByClassroom(
    institutionId: string,
    classroomId: string,
  ): Promise<MissionAssignment[]>;
  getById(institutionId: string, id: string): Promise<MissionAssignment | null>;
  save(institutionId: string, assignment: MissionAssignment): Promise<void>;
}

/** Avaliação + devolutiva do Professor (M21/M22) — um registro por aluno×missão×turma. */
export interface MissionReviewRepository {
  listByClassroomMission(
    institutionId: string,
    classroomId: string,
    missionId: string,
  ): Promise<MissionReview[]>;
  listByStudent(
    institutionId: string,
    studentId: string,
  ): Promise<MissionReview[]>;
  save(institutionId: string, review: MissionReview): Promise<void>;
}

export interface ClassroomIntegrationRepository {
  listByInstitution(institutionId: string): Promise<ClassroomIntegration[]>;
}

export interface ClassroomSyncStateRepository {
  listByInstitution(institutionId: string): Promise<ClassroomSyncState[]>;
  getByClassroom(
    institutionId: string,
    classroomId: string,
  ): Promise<ClassroomSyncState | null>;
  save(institutionId: string, state: ClassroomSyncState): Promise<void>;
}

/** Conjunto completo de repositórios — o que a factory entrega. */
export interface PlatformRepositories {
  institutions: InstitutionRepository;
  academicYears: AcademicYearRepository;
  teachers: TeacherRepository;
  classrooms: ClassroomRepository;
  students: StudentRepository;
  enrollments: EnrollmentRepository;
  missions: MissionRecordRepository;
  missionProgress: MissionProgressRepository;
  productions: ProductionRepository;
  reflections: ReflectionRepository;
  classroomIntegrations: ClassroomIntegrationRepository;
  classroomSyncStates: ClassroomSyncStateRepository;
  missionAssignments: MissionAssignmentRepository;
  missionReviews: MissionReviewRepository;
}
