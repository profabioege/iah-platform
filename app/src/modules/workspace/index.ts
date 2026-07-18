/**
 * Módulo Workspace — Institutional Workspace (Sprint M15).
 *
 * Autenticação local simulada + autorização por papel + contexto
 * institucional/pedagógico (Instituição, Ano Letivo, perfil, Turmas,
 * Disciplinas, permissões) carregado automaticamente após o login.
 * Multi-instituição por arquitetura: nada aqui pressupõe uma única
 * escola — o Colégio Beryon é só o seed desta fase.
 *
 * Troca futura por autenticação real (Google/Supabase/Microsoft/
 * Sophia): contrato `WorkspaceAuthProvider` + `session-cookie.ts` são
 * os dois únicos pontos de troca; nenhuma tela muda.
 */

export {
  ROLE_LABEL,
  type Classroom,
  type Enrollment,
  type Institution,
  type Permission,
  type Role,
  type SchoolYear,
  type Student,
  type Subject,
  type Teacher,
  type WorkspaceUser,
} from "./domain/entities";

export {
  hasPermission,
  ROLE_PERMISSIONS,
  roleHome,
  type WorkspaceContext,
} from "./domain/workspace-context";

export type { WorkspaceAuthProvider } from "./domain/auth-provider";

export { localWorkspaceAuthProvider } from "./infrastructure/local-auth-provider";

export {
  resolveSessionRole,
  WORKSPACE_SESSION_COOKIE,
} from "./infrastructure/session-cookie";

export { getWorkspaceContext, getWorkspaceUser } from "./infrastructure/session";

export {
  BERYON_CLASSROOMS,
  BERYON_ENROLLMENTS,
  BERYON_INSTITUTION,
  BERYON_SCHOOL_YEAR,
  BERYON_STUDENTS,
  BERYON_SUBJECT,
  BERYON_TEACHER,
  BERYON_USERS,
  WORKSPACE_DEMO_PASSWORD,
} from "./seeds/beryon-seed";

import { localWorkspaceAuthProvider } from "./infrastructure/local-auth-provider";
import type { WorkspaceAuthProvider } from "./domain/auth-provider";

/** Provedor de autenticação em uso — hoje sempre o local (simulado). */
export function getWorkspaceAuthProvider(): WorkspaceAuthProvider {
  return localWorkspaceAuthProvider;
}
