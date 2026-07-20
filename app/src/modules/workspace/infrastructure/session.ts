/**
 * Sessão do Workspace no servidor (server components / server actions —
 * usa `next/headers`, NÃO importar no middleware; lá vive
 * `session-cookie.ts`). Resolve o cookie para o usuário e monta o
 * contexto pedagógico completo que acompanha toda a navegação.
 */

import { cookies } from "next/headers";

import type { WorkspaceUser } from "../domain/entities";
import type { WorkspaceContext } from "../domain/workspace-context";
import { ROLE_PERMISSIONS } from "../domain/workspace-context";
import {
  findWorkspaceUserById,
  WORKSPACE_CLASSROOMS,
  WORKSPACE_ENROLLMENTS,
  WORKSPACE_INSTITUTION,
  WORKSPACE_SCHOOL_YEAR,
  WORKSPACE_SUBJECT,
} from "../seeds/institution-seed";
import { WORKSPACE_SESSION_COOKIE } from "./session-cookie";

export async function getWorkspaceUser(): Promise<WorkspaceUser | null> {
  const store = await cookies();
  const userId = store.get(WORKSPACE_SESSION_COOKIE)?.value;
  if (!userId) return null;
  return findWorkspaceUserById(userId);
}

/**
 * Contexto pedagógico do usuário autenticado: Instituição, Ano Letivo,
 * perfil, permissões, Disciplinas e as Turmas relevantes ao papel —
 * todas para admin/professor, só a turma matriculada para o aluno.
 */
export async function getWorkspaceContext(): Promise<WorkspaceContext | null> {
  const user = await getWorkspaceUser();
  if (!user) return null;

  const classrooms =
    user.role === "student"
      ? WORKSPACE_CLASSROOMS.filter((classroom) =>
          WORKSPACE_ENROLLMENTS.some(
            (enrollment) =>
              enrollment.classroomId === classroom.id &&
              enrollment.studentId === user.studentId,
          ),
        )
      : WORKSPACE_CLASSROOMS;

  return {
    user,
    role: user.role,
    permissions: ROLE_PERMISSIONS[user.role],
    institution: WORKSPACE_INSTITUTION,
    schoolYear: WORKSPACE_SCHOOL_YEAR,
    subjects: [WORKSPACE_SUBJECT],
    classrooms,
  };
}
