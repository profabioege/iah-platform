/**
 * SEED INSTITUCIONAL — camada de IDENTIDADE do Workspace (M15/M16/M18).
 *
 * Desde a M16, a fonte institucional canônica (Instituição, Ano Letivo,
 * Professor, Turmas, Alunos, Matrículas) vive em
 * `modules/platform/seeds/demo-seed.ts` — este arquivo só ACRESCENTA o
 * que é do Workspace: contas de usuário, papéis, disciplina e a senha
 * de demonstração. Import DIRETO do arquivo de seed (nunca do barrel de
 * `modules/platform`, que puxa o cliente Supabase — este arquivo precisa
 * continuar EDGE-SAFE, é importado pelo middleware).
 *
 * M18 — nomes neutros (`WORKSPACE_*`, antes `BERYON_*`): nada aqui pode
 * depender do nome de uma escola específica — a instituição real é
 * dado (`Institution`), nunca símbolo de código. O Instituto Horizonte
 * (D-039 — instituição fictícia, ambiente de demonstração neutro)
 * continua sendo o único seed populado nesta fase; outra escola só
 * precisaria de outro arquivo de seed com o mesmo formato.
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
export const WORKSPACE_DEMO_PASSWORD = "horizonte2026";

export const WORKSPACE_INSTITUTION: Institution = DEMO_INSTITUTION;
export const WORKSPACE_SCHOOL_YEAR: SchoolYear = DEMO_ACADEMIC_YEAR;
export const WORKSPACE_TEACHER: Teacher = DEMO_TEACHER;
export const WORKSPACE_CLASSROOMS: Classroom[] = DEMO_CLASSROOMS;
export const WORKSPACE_STUDENTS: Student[] = DEMO_STUDENTS;
export const WORKSPACE_ENROLLMENTS: Enrollment[] = DEMO_ENROLLMENTS;

export const WORKSPACE_SUBJECT: Subject = {
  id: "subject-iah",
  institutionId: WORKSPACE_INSTITUTION.id,
  name: "Inteligência Artificial & Humanidades",
};

export const WORKSPACE_USERS: WorkspaceUser[] = [
  {
    id: "user-diretor",
    institutionId: WORKSPACE_INSTITUTION.id,
    name: "Fabiana Ege",
    email: `diretor@${WORKSPACE_INSTITUTION.domain}`,
    role: "admin",
    teacherId: null,
    studentId: null,
  },
  {
    id: "user-fabio",
    institutionId: WORKSPACE_INSTITUTION.id,
    name: WORKSPACE_TEACHER.name,
    email: WORKSPACE_TEACHER.email,
    role: "teacher",
    teacherId: WORKSPACE_TEACHER.id,
    studentId: null,
  },
  ...WORKSPACE_STUDENTS.map(
    (student): WorkspaceUser => ({
      id: `user-${student.id}`,
      institutionId: WORKSPACE_INSTITUTION.id,
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
  return WORKSPACE_USERS.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export function findWorkspaceUserById(id: string): WorkspaceUser | null {
  return WORKSPACE_USERS.find((u) => u.id === id) ?? null;
}
