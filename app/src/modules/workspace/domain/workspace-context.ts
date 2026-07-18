/**
 * Contexto pedagógico do Workspace — o que toda navegação autenticada
 * carrega automaticamente após o login (Sprint M15): Instituição, Ano
 * Letivo, perfil, permissões, Turmas e Disciplinas do usuário. O
 * Currículo em si continua vindo de `modules/curriculum` (M14) — o
 * contexto não o duplica, aponta para ele pela Disciplina.
 */

import type {
  Classroom,
  Institution,
  Permission,
  Role,
  SchoolYear,
  Subject,
  WorkspaceUser,
} from "./entities";

/** Autorização por papel — capacidade, não rota (ver `Permission`). */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "institution:view",
    "institution:manage-users",
    "institution:settings",
    "teaching:monitor",
  ],
  teacher: ["teaching:plan", "teaching:monitor"],
  student: ["learning:participate"],
};

/** Rota inicial de cada papel após o login. */
export function roleHome(role: Role): string {
  if (role === "admin") return "/gestor";
  if (role === "teacher") return "/professor";
  return "/dashboard";
}

export interface WorkspaceContext {
  user: WorkspaceUser;
  role: Role;
  permissions: Permission[];
  institution: Institution;
  schoolYear: SchoolYear;
  subjects: Subject[];
  /** Turmas relevantes ao papel: todas (admin/professor) ou a turma matriculada (aluno). */
  classrooms: Classroom[];
}

export function hasPermission(
  context: WorkspaceContext,
  permission: Permission,
): boolean {
  return context.permissions.includes(permission);
}
