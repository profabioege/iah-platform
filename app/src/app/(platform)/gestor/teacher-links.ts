/**
 * Professores da instituição com as turmas que de fato conduzem
 * (`classroom_teachers`, já lido em `Classroom.teacherIds`).
 *
 * Substitui a leitura do "primeiro professor" com contagem fixa: cada
 * professor aparece com os próprios vínculos. Só entram professores da
 * lista recebida (já filtrada pela instituição no repositório) e turmas
 * da lista recebida (o escopo do contexto) — um vínculo apontando para
 * fora de uma das duas listas é ignorado, não inventado.
 */

interface TeacherInput {
  id: string;
  name: string;
  email: string;
}

interface ClassroomInput {
  id: string;
  name: string;
  teacherIds: readonly string[];
}

export interface TeacherLink {
  id: string;
  name: string;
  email: string;
  classrooms: Array<{ id: string; name: string }>;
}

export function buildTeacherLinks(
  teachers: readonly TeacherInput[],
  classrooms: readonly ClassroomInput[],
): TeacherLink[] {
  return teachers.map((teacher) => ({
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    classrooms: classrooms
      .filter((classroom) => classroom.teacherIds.includes(teacher.id))
      .map((classroom) => ({ id: classroom.id, name: classroom.name })),
  }));
}

/** Turmas com pelo menos um professor vinculado (sem contar duas vezes). */
export function countLinkedClassrooms(links: readonly TeacherLink[]): number {
  return new Set(links.flatMap((link) => link.classrooms.map((c) => c.id))).size;
}
