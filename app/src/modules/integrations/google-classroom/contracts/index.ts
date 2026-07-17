/**
 * Contratos do módulo Google Classroom.
 *
 * `ClassroomService` é a porta que o resto do módulo consome; tanto a
 * implementação real (services/, sobre a API do Google) quanto a
 * simulada (mock/) a cumprem. É estritamente só-leitura: quem grava no
 * modelo interno é o ImportService/ClassroomSyncService da plataforma
 * (mesma regra de docs/IMPORT_ARCHITECTURE.md).
 */

import type {
  GoogleAssignment,
  GoogleClassroom,
  GoogleCourse,
  GoogleStudent,
  GoogleTeacher,
} from "../types";

export interface ClassroomService {
  readonly id: "google";
  /** Falso enquanto não houver credenciais OAuth (docs/GOOGLE_WORKSPACE.md). */
  readonly isConfigured: boolean;
  /** Indica se os dados vêm de simulação — a interface DEVE rotular quando true. */
  readonly isSimulated: boolean;

  listCourses(): Promise<GoogleCourse[]>;
  listStudents(courseId: string): Promise<GoogleStudent[]>;
  listTeachers(courseId: string): Promise<GoogleTeacher[]>;
  listAssignments(courseId: string): Promise<GoogleAssignment[]>;
  /** Fotografia completa de uma turma (curso + alunos + professores + atividades). */
  fetchClassroom(courseId: string): Promise<GoogleClassroom>;
}

/**
 * Acesso à fonte de dados do Google (camada de dados do módulo).
 * A implementação real encapsula as chamadas HTTP à Classroom API; o
 * ClassroomService orquestra por cima dela.
 */
export interface GoogleClassroomRepository {
  readonly isConfigured: boolean;
  fetchCourses(): Promise<import("../dto").GoogleCourseDto[]>;
  fetchStudents(courseId: string): Promise<import("../dto").GoogleStudentDto[]>;
  fetchTeachers(courseId: string): Promise<import("../dto").GoogleTeacherDto[]>;
  fetchAssignments(
    courseId: string,
  ): Promise<import("../dto").GoogleAssignmentDto[]>;
}
