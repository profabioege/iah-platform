/**
 * SEED INSTITUCIONAL — Colégio Beryon (Sprint M15, pedido explícito da
 * Sprint; revê a reserva de D-024 sobre usar o nome da escola real).
 *
 * Contas e senha são SIMULADAS, apenas para demonstração — nenhum dado
 * real de aluno ou funcionário; nomes de alunos são rotulados como
 * fictícios (D-015). Nada aqui é persistido em banco (regra de
 * docs/PERSISTENCE.md): o Workspace roda em memória até a autenticação
 * real entrar pelo contrato `WorkspaceAuthProvider`.
 *
 * ARQUIVO EDGE-SAFE: só dados e funções puras — é importado pelo
 * middleware (mesma restrição de `lib/auth-flags.ts`).
 */

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

export const BERYON_INSTITUTION: Institution = {
  id: "inst-beryon",
  name: "Colégio Beryon",
  status: "active",
  createdAt: "2026-01-15T00:00:00-03:00",
};

export const BERYON_SCHOOL_YEAR: SchoolYear = {
  id: "year-beryon-2026",
  institutionId: BERYON_INSTITUTION.id,
  label: "2026",
  startsOn: "2026-02-02",
  endsOn: "2026-12-11",
  status: "active",
};

export const BERYON_SUBJECT: Subject = {
  id: "subject-iah",
  institutionId: BERYON_INSTITUTION.id,
  name: "Inteligência Artificial & Humanidades",
};

export const BERYON_TEACHER: Teacher = {
  id: "teacher-fabio",
  institutionId: BERYON_INSTITUTION.id,
  name: "Professor Fábio",
  email: "fabio@beryon.edu.br",
};

const CLASSROOM_LABELS = [
  ["class-1em-a", "1º EM A", "1º ano E.M."],
  ["class-1em-b", "1º EM B", "1º ano E.M."],
  ["class-2em-a", "2º EM A", "2º ano E.M."],
  ["class-2em-b", "2º EM B", "2º ano E.M."],
  ["class-3em-a", "3º EM A", "3º ano E.M."],
] as const;

export const BERYON_CLASSROOMS: Classroom[] = CLASSROOM_LABELS.map(
  ([id, name, grade]) => ({
    id,
    institutionId: BERYON_INSTITUTION.id,
    academicYearId: BERYON_SCHOOL_YEAR.id,
    name,
    grade,
    teacherIds: [BERYON_TEACHER.id],
  }),
);

/** 10 alunos fictícios (2 por turma), rotulados como demonstração. */
export const BERYON_STUDENTS: Student[] = Array.from({ length: 10 }, (_, i) => {
  const number = String(i + 1).padStart(2, "0");
  return {
    id: `student-beryon-${number}`,
    institutionId: BERYON_INSTITUTION.id,
    name: `Aluno(a) de demonstração ${number}`,
    email: `aluno${number}@beryon.edu.br`,
  };
});

export const BERYON_ENROLLMENTS: Enrollment[] = BERYON_STUDENTS.map(
  (student, i) => ({
    id: `enroll-beryon-${String(i + 1).padStart(2, "0")}`,
    institutionId: BERYON_INSTITUTION.id,
    classroomId: BERYON_CLASSROOMS[Math.floor(i / 2)].id,
    studentId: student.id,
    status: "active",
    enrolledAt: "2026-02-02T08:00:00-03:00",
  }),
);

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
