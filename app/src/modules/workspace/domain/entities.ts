/**
 * Institutional Workspace — entidades de identidade e contexto
 * institucional (Sprint M15).
 *
 * As entidades institucionais que já existem em `modules/platform`
 * (Institution, AcademicYear, Teacher, Student, Classroom, Enrollment —
 * D-023) NÃO são duplicadas: são re-exportadas/apelidadas aqui para o
 * Workspace falar a língua da Sprint (`SchoolYear` = `AcademicYear`)
 * sem criar um segundo modelo institucional (D-001: um contexto por
 * módulo, nunca dois módulos donos da mesma entidade).
 *
 * Novas nesta Sprint: User, Role, Permission, Subject.
 */

import type { AcademicYear } from "@/modules/platform";

export type {
  Classroom,
  Enrollment,
  Institution,
  Student,
  Teacher,
} from "@/modules/platform";

/** Ano Letivo — mesmo dado de `AcademicYear` (`modules/platform`), nome da Sprint M15. */
export type SchoolYear = AcademicYear;

/** Papéis do Workspace. O sistema identifica o papel — nunca é escolhido na tela de login. */
export type Role = "admin" | "teacher" | "student";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador(a) Institucional",
  teacher: "Professor(a)",
  student: "Aluno(a)",
};

/**
 * Permissões nomeadas — a autorização fala em capacidade, não em rota,
 * para que uma futura autenticação real (Google/Supabase/Microsoft)
 * troque só a identidade, nunca o vocabulário de autorização.
 */
export type Permission =
  | "institution:view"
  | "institution:manage-users"
  | "institution:settings"
  | "teaching:plan"
  | "teaching:monitor"
  | "learning:participate";

/** Usuário do Workspace — a identidade que a autenticação resolve. */
export interface WorkspaceUser {
  id: string;
  institutionId: string;
  name: string;
  email: string;
  role: Role;
  /** Presente quando o usuário é um Professor (-> `Teacher.id`). */
  teacherId: string | null;
  /** Presente quando o usuário é um Aluno (-> `Student.id`). */
  studentId: string | null;
}

/** Disciplina ofertada pela Instituição (ex.: Inteligência Artificial & Humanidades). */
export interface Subject {
  id: string;
  institutionId: string;
  name: string;
}
