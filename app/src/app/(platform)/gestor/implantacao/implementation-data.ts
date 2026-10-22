/**
 * Dados da Implantação Institucional no modo real (REGISTRO 14, G1):
 * turmas, alunos e professores lidos dos repositórios da instituição —
 * nunca as constantes do seed de demonstração. Função pura, para que
 * contagens, vínculos e escopo sejam testáveis sem montar a página.
 */

import { buildTeacherLinks, type TeacherLink } from "../teacher-links.ts";

interface ClassroomInput {
  id: string;
  name: string;
  grade: string | null;
  teacherIds: readonly string[];
}

interface TeacherInput {
  id: string;
  name: string;
  email: string;
}

interface StudentInput {
  email: string | null;
}

export interface ImplementationClassroom {
  id: string;
  name: string;
  grade: string | null;
  studentCount: number;
  teacherNames: string[];
}

export interface ImplementationData {
  classrooms: ImplementationClassroom[];
  teachers: TeacherLink[];
  totalStudents: number;
  /** Turmas com pelo menos um aluno matriculado. */
  classroomsWithStudents: number;
  /** % de alunos com e-mail no domínio da instituição; null sem alunos. */
  institutionalEmailShare: number | null;
}

export function buildImplementationData(input: {
  classrooms: readonly ClassroomInput[];
  /** Alunos matriculados por turma (chave: id da turma). */
  studentsByClassroom: ReadonlyMap<string, readonly StudentInput[]>;
  teachers: readonly TeacherInput[];
  institutionDomain: string;
}): ImplementationData {
  const teachers = buildTeacherLinks(input.teachers, input.classrooms);
  const classrooms = input.classrooms.map((classroom) => ({
    id: classroom.id,
    name: classroom.name,
    grade: classroom.grade,
    studentCount: input.studentsByClassroom.get(classroom.id)?.length ?? 0,
    teacherNames: teachers
      .filter((teacher) => teacher.classrooms.some((c) => c.id === classroom.id))
      .map((teacher) => teacher.name),
  }));

  const students = input.classrooms.flatMap(
    (classroom) => input.studentsByClassroom.get(classroom.id) ?? [],
  );
  const suffix = `@${input.institutionDomain.toLowerCase()}`;
  const institutional = students.filter((student) =>
    (student.email ?? "").toLowerCase().endsWith(suffix),
  ).length;

  return {
    classrooms,
    teachers,
    totalStudents: students.length,
    classroomsWithStudents: classrooms.filter((c) => c.studentCount > 0).length,
    institutionalEmailShare:
      students.length > 0 ? Math.round((institutional / students.length) * 100) : null,
  };
}
