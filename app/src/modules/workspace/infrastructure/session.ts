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
  BERYON_CLASSROOMS,
  BERYON_ENROLLMENTS,
  BERYON_INSTITUTION,
  BERYON_SCHOOL_YEAR,
  BERYON_SUBJECT,
  findWorkspaceUserById,
} from "../seeds/beryon-seed";
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
      ? BERYON_CLASSROOMS.filter((classroom) =>
          BERYON_ENROLLMENTS.some(
            (enrollment) =>
              enrollment.classroomId === classroom.id &&
              enrollment.studentId === user.studentId,
          ),
        )
      : BERYON_CLASSROOMS;

  return {
    user,
    role: user.role,
    permissions: ROLE_PERMISSIONS[user.role],
    institution: BERYON_INSTITUTION,
    schoolYear: BERYON_SCHOOL_YEAR,
    subjects: [BERYON_SUBJECT],
    classrooms,
  };
}
