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
  Enrollment,
  Institution,
  MissionProgress,
  MissionRecord,
  Production,
  Reflection,
  Student,
  Teacher,
} from "./entities";

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
  save(institutionId: string, production: Production): Promise<void>;
}

export interface ReflectionRepository {
  listByStudent(
    institutionId: string,
    studentId: string,
  ): Promise<Reflection[]>;
  save(institutionId: string, reflection: Reflection): Promise<void>;
}

export interface ClassroomIntegrationRepository {
  listByInstitution(institutionId: string): Promise<ClassroomIntegration[]>;
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
}
