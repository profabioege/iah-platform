/**
 * Entidades do Google Classroom — a forma como o IAH representa os dados
 * do Google DEPOIS de traduzidos (mappers/) das respostas cruas da API
 * (dto/). Ninguém fora deste módulo deve consumir estes tipos: a
 * plataforma conhece apenas Turma/Aluno internos (docs/DOMAIN_MODEL.md)
 * e o contrato genérico ImportProvider (docs/IMPORT_ARCHITECTURE.md).
 */

/** Situação de um curso no Google Classroom. */
export type GoogleCourseState = "ACTIVE" | "ARCHIVED" | "PROVISIONED" | "DECLINED";

/** Turma/curso do Google Classroom. */
export interface GoogleCourse {
  id: string;
  name: string;
  /** Seção da turma (ex.: "3º Ano A") — opcional na API do Google. */
  section: string | null;
  state: GoogleCourseState;
  ownerId: string;
}

/** Aluno matriculado num curso do Google Classroom. */
export interface GoogleStudent {
  /** userId do Google (estável). */
  id: string;
  courseId: string;
  fullName: string;
  /** E-mail — chave de reconciliação (docs/IMPORT_ARCHITECTURE.md). */
  email: string | null;
}

/** Professor de um curso do Google Classroom. */
export interface GoogleTeacher {
  id: string;
  courseId: string;
  fullName: string;
  email: string | null;
}

/** Atividade (courseWork) de um curso do Google Classroom. */
export interface GoogleAssignment {
  id: string;
  courseId: string;
  title: string;
  state: "PUBLISHED" | "DRAFT";
  dueAt: string | null;
}

/**
 * Fotografia completa de uma turma do Google — o agregado que o
 * ClassroomService devolve e que os mappers traduzem para o modelo
 * interno.
 */
export interface GoogleClassroom {
  course: GoogleCourse;
  students: GoogleStudent[];
  teachers: GoogleTeacher[];
  assignments: GoogleAssignment[];
}
