/**
 * DADOS SIMULADOS do Google Classroom — fictícios, autorizados e sempre
 * rotulados na interface (`isSimulated: true`, padrão D-015: nunca dado
 * fictício silencioso).
 *
 * Servem para exercitar a arquitetura (Import Wizard, sync) enquanto não
 * há credenciais OAuth. NÃO representam nenhuma escola, turma, professor
 * ou aluno real — nomes de instituição/pessoas aqui são inventados de
 * propósito, e nada daqui é persistido (docs/PERSISTENCE.md).
 */

import type { ClassroomService } from "../contracts";
import type {
  GoogleAssignment,
  GoogleCourse,
  GoogleStudent,
  GoogleTeacher,
} from "../types";

const COURSES: GoogleCourse[] = [
  {
    id: "gc-course-1",
    name: "Inteligência Artificial & Humanidades",
    section: "3º Ano A",
    state: "ACTIVE",
    ownerId: "gc-teacher-1",
  },
  {
    id: "gc-course-2",
    name: "Inteligência Artificial & Humanidades",
    section: "3º Ano B",
    state: "ACTIVE",
    ownerId: "gc-teacher-1",
  },
];

const STUDENT_NAMES: Record<string, string[]> = {
  "gc-course-1": [
    "Alice Ramos Teixeira",
    "Caio Nogueira Braga",
    "Helena Vasconcelos Pinto",
    "Murilo Tavares Cordeiro",
    "Sofia Rezende Aguiar",
  ],
  "gc-course-2": [
    "Bento Almeida Xavier",
    "Laura Siqueira Monteiro",
    "Otávio Bastos Cunha",
  ],
};

function emailFor(fullName: string): string {
  const parts = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(" ")
    .filter(Boolean);
  return `${parts[0]}.${parts[parts.length - 1]}@escola-simulada.exemplo`;
}

const STUDENTS: GoogleStudent[] = Object.entries(STUDENT_NAMES).flatMap(
  ([courseId, names]) =>
    names.map((fullName, index) => ({
      id: `gc-student-${courseId}-${index + 1}`,
      courseId,
      fullName,
      email: emailFor(fullName),
    })),
);

const TEACHERS: GoogleTeacher[] = COURSES.map((course) => ({
  id: "gc-teacher-1",
  courseId: course.id,
  fullName: "Professor(a) de demonstração",
  email: "professor@escola-simulada.exemplo",
}));

const ASSIGNMENTS: GoogleAssignment[] = [
  {
    id: "gc-work-1",
    courseId: "gc-course-1",
    title: "Leitura prévia — Como uma IA escreve uma notícia",
    state: "PUBLISHED",
    dueAt: "2026-08-10T23:59:00.000Z",
  },
  {
    id: "gc-work-2",
    courseId: "gc-course-2",
    title: "Leitura prévia — Como uma IA escreve uma notícia",
    state: "DRAFT",
    dueAt: null,
  },
];

/** Implementação simulada do ClassroomService — sem nenhuma chamada de rede. */
export const mockClassroomService: ClassroomService = {
  id: "google",
  isConfigured: true,
  isSimulated: true,
  async listCourses() {
    return COURSES;
  },
  async listStudents(courseId) {
    return STUDENTS.filter((s) => s.courseId === courseId);
  },
  async listTeachers(courseId) {
    return TEACHERS.filter((t) => t.courseId === courseId);
  },
  async listAssignments(courseId) {
    return ASSIGNMENTS.filter((a) => a.courseId === courseId);
  },
  async fetchClassroom(courseId) {
    const course = COURSES.find((c) => c.id === courseId);
    if (!course) {
      throw new Error(`Turma simulada "${courseId}" não existe.`);
    }
    return {
      course,
      students: await this.listStudents(courseId),
      teachers: await this.listTeachers(courseId),
      assignments: await this.listAssignments(courseId),
    };
  },
};
