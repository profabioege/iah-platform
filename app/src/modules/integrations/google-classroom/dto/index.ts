/**
 * DTOs — a forma CRUA das respostas da Google Classroom API, exatamente
 * como o Google as devolve (camelCase aninhado, campos opcionais).
 *
 * Existem separados dos types/ de propósito: se o Google mudar o formato
 * da API, só estes DTOs e os mappers mudam — as entidades e o resto da
 * plataforma não sabem que o Google existe.
 *
 * Referência: developers.google.com/classroom/reference/rest
 */

/** Resposta de `courses.list`. */
export interface GoogleCourseDto {
  id: string;
  name: string;
  section?: string;
  courseState?: string;
  ownerId?: string;
}

/** Nome de uma pessoa, como o Google devolve (aninhado). */
export interface GoogleUserProfileDto {
  id: string;
  name?: { fullName?: string };
  emailAddress?: string;
}

/** Item de `courses.students.list`. */
export interface GoogleStudentDto {
  courseId: string;
  userId: string;
  profile?: GoogleUserProfileDto;
}

/** Item de `courses.teachers.list`. */
export interface GoogleTeacherDto {
  courseId: string;
  userId: string;
  profile?: GoogleUserProfileDto;
}

/** Item de `courses.courseWork.list`. */
export interface GoogleAssignmentDto {
  id: string;
  courseId: string;
  title?: string;
  state?: string;
  dueDate?: { year?: number; month?: number; day?: number };
  dueTime?: { hours?: number; minutes?: number };
}
