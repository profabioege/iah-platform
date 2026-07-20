/**
 * Módulo Workspace — Institutional Workspace (Sprint M15).
 *
 * Autenticação local simulada + autorização por papel + contexto
 * institucional/pedagógico (Instituição, Ano Letivo, perfil, Turmas,
 * Disciplinas, permissões) carregado automaticamente após o login.
 * Multi-instituição por arquitetura: nada aqui pressupõe uma única
 * escola — o Instituto Horizonte (D-039, instituição fictícia) é só o
 * seed desta fase (M18: nem os nomes dos símbolos dependem mais dela —
 * ver `seeds/institution-seed.ts`).
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
  WORKSPACE_CLASSROOMS,
  WORKSPACE_DEMO_PASSWORD,
  WORKSPACE_ENROLLMENTS,
  WORKSPACE_INSTITUTION,
  WORKSPACE_SCHOOL_YEAR,
  WORKSPACE_STUDENTS,
  WORKSPACE_SUBJECT,
  WORKSPACE_TEACHER,
  WORKSPACE_USERS,
} from "./seeds/institution-seed";

import { localWorkspaceAuthProvider } from "./infrastructure/local-auth-provider";
import type { WorkspaceAuthProvider } from "./domain/auth-provider";

/** Provedor de autenticação em uso — hoje sempre o local (simulado). */
export function getWorkspaceAuthProvider(): WorkspaceAuthProvider {
  return localWorkspaceAuthProvider;
}
