/**
 * SEED INSTITUCIONAL — Colégio Beryon, camada de IDENTIDADE (M15/M16).
 *
 * Desde a M16, a fonte institucional canônica (Instituição, Ano Letivo,
 * Professor, Turmas, Alunos, Matrículas) vive em
 * `modules/platform/seeds/demo-seed.ts` — este arquivo só ACRESCENTA o
 * que é do Workspace: contas de usuário, papéis, disciplina e a senha
 * de demonstração. Import DIRETO do arquivo de seed (nunca do barrel de
 * `modules/platform`, que puxa o cliente Supabase — este arquivo precisa
 * continuar EDGE-SAFE, é importado pelo middleware).
 *
 * Contas e senha são SIMULADAS, apenas para demonstração — nenhum dado
 * real de aluno ou funcionário (D-015).
 */

import {
  DEMO_ACADEMIC_YEAR,
  DEMO_CLASSROOMS,
  DEMO_ENROLLMENTS,
  DEMO_INSTITUTION,
  DEMO_STUDENTS,
  DEMO_TEACHER,
} from "@/modules/platform/seeds/demo-seed";

import type {
  Classroom,
  Enrollment,
  Institution,
  SchoolYear,
  Student,
  Subject,
  Teacher,
  WorkspaceUser,
} from "../domain/entities";

/** Senha única de demonstração — exibida na tela de login, nunca secreta. */
export const WORKSPACE_DEMO_PASSWORD = "beryon2026";

export const BERYON_INSTITUTION: Institution = DEMO_INSTITUTION;
export const BERYON_SCHOOL_YEAR: SchoolYear = DEMO_ACADEMIC_YEAR;
export const BERYON_TEACHER: Teacher = DEMO_TEACHER;
export const BERYON_CLASSROOMS: Classroom[] = DEMO_CLASSROOMS;
export const BERYON_STUDENTS: Student[] = DEMO_STUDENTS;
export const BERYON_ENROLLMENTS: Enrollment[] = DEMO_ENROLLMENTS;

export const BERYON_SUBJECT: Subject = {
  id: "subject-iah",
  institutionId: BERYON_INSTITUTION.id,
  name: "Inteligência Artificial & Humanidades",
};

export const BERYON_USERS: WorkspaceUser[] = [
  {
    id: "user-diretor",
    institutionId: BERYON_INSTITUTION.id,
    name: "Direção Colégio Beryon",
    email: "diretor@beryon.edu.br",
    role: "admin",
    teacherId: null,
    studentId: null,
  },
  {
    id: "user-fabio",
    institutionId: BERYON_INSTITUTION.id,
    name: BERYON_TEACHER.name,
    email: BERYON_TEACHER.email,
    role: "teacher",
    teacherId: BERYON_TEACHER.id,
    studentId: null,
  },
  ...BERYON_STUDENTS.map(
    (student): WorkspaceUser => ({
      id: `user-${student.id}`,
      institutionId: BERYON_INSTITUTION.id,
      name: student.name,
      email: student.email ?? "",
      role: "student",
      teacherId: null,
      studentId: student.id,
    }),
  ),
];

export function findWorkspaceUserByEmail(email: string): WorkspaceUser | null {
  const normalized = email.trim().toLowerCase();
  return BERYON_USERS.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export function findWorkspaceUserById(id: string): WorkspaceUser | null {
  return BERYON_USERS.find((u) => u.id === id) ?? null;
}
