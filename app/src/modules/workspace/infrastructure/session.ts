/**
 * Sessão do Workspace no servidor (server components / server actions —
 * usa `next/headers`/`auth()`, NÃO importar no middleware; lá vive
 * `session-cookie.ts`). PONTO ÚNICO que resolve usuário, papel,
 * instituição, permissões e turmas relevantes (M22):
 *
 *  - modo REAL: sessão Auth.js (JWT) → banco (users/profiles/teachers/
 *    students/classrooms/enrollments) via repositórios institucionais;
 *  - modo DEMONSTRAÇÃO: cookie local → seed do Institutional Workspace.
 *
 * As telas consomem só `getWorkspaceContext()`/`getWorkspaceUser()` e não
 * sabem (nem devem saber) qual modo está ativo.
 */

import { cookies } from "next/headers";

import { isAuthConfigured } from "@/lib/auth-flags";

import type { Role, WorkspaceUser } from "../domain/entities";
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

/** Papel persistido (profiles, migration 0003) → papel do Workspace. */
function toWorkspaceRole(dbRole: string): Role | null {
  if (dbRole === "administrador" || dbRole === "admin_iah") return "admin";
  if (dbRole === "professor") return "teacher";
  if (dbRole === "aluno") return "student";
  return null;
}

interface RealSessionIdentity {
  userId: string;
  institutionId: string;
  role: Role;
  name: string;
  email: string;
}

/** Identidade da sessão Auth.js — `null` sem sessão válida/completa. */
async function getRealSessionIdentity(): Promise<RealSessionIdentity | null> {
  const { auth } = await import("@/auth");
  const session = await auth();
  const user = session?.user as
    | {
        name?: string | null;
        email?: string | null;
        platformUserId?: string;
        institutionId?: string;
        role?: string;
      }
    | undefined;
  if (!user?.platformUserId || !user.institutionId || !user.role) return null;
  const role = toWorkspaceRole(user.role);
  if (!role) return null;
  return {
    userId: user.platformUserId,
    institutionId: user.institutionId,
    role,
    name: user.name ?? user.email ?? "Usuário",
    email: user.email ?? "",
  };
}

async function getRealWorkspaceUser(): Promise<WorkspaceUser | null> {
  const identity = await getRealSessionIdentity();
  if (!identity) return null;
  const { getSupabaseAdminClient } = await import(
    "@/modules/platform/infrastructure/database/admin-client"
  );
  const db = getSupabaseAdminClient();

  // Vínculos papel↔dados pedagógicos (P1: identidade ≠ papel).
  const [{ data: teacher }, { data: student }] = await Promise.all([
    db
      .from("teachers")
      .select("id")
      .eq("user_id", identity.userId)
      .eq("institution_id", identity.institutionId)
      .maybeSingle(),
    db
      .from("students")
      .select("id")
      .eq("user_id", identity.userId)
      .eq("institution_id", identity.institutionId)
      .maybeSingle(),
  ]);

  return {
    id: identity.userId,
    institutionId: identity.institutionId,
    name: identity.name,
    email: identity.email,
    role: identity.role,
    teacherId: (teacher?.id as string | undefined) ?? null,
    studentId: (student?.id as string | undefined) ?? null,
  };
}

async function getRealWorkspaceContext(): Promise<WorkspaceContext | null> {
  const user = await getRealWorkspaceUser();
  if (!user) return null;

  const { getDefaultRepositories } = await import(
    "@/modules/platform/infrastructure/repository-factory"
  );
  const { getSupabaseAdminClient } = await import(
    "@/modules/platform/infrastructure/database/admin-client"
  );
  const repositories = getDefaultRepositories();
  const db = getSupabaseAdminClient();

  const [institution, academicYears, allClassrooms, { data: subjectRows }] =
    await Promise.all([
      repositories.institutions.getById(user.institutionId),
      repositories.academicYears.listByInstitution(user.institutionId),
      repositories.classrooms.listByInstitution(user.institutionId),
      db
        .from("subjects")
        .select("id, institution_id, name")
        .eq("institution_id", user.institutionId),
    ]);
  if (!institution) return null;

  const schoolYear =
    academicYears.find((year) => year.status === "active") ??
    academicYears[0] ??
    null;
  if (!schoolYear) return null;

  // Turmas relevantes ao papel — escopo aplicado NO SERVIDOR:
  // aluno vê só as turmas em que está matriculado; professor, as que
  // leciona; admin, todas as da instituição.
  let classrooms = allClassrooms;
  if (user.role === "student" && user.studentId) {
    const { data: enrollmentRows } = await db
      .from("enrollments")
      .select("classroom_id")
      .eq("institution_id", user.institutionId)
      .eq("student_id", user.studentId)
      .eq("status", "active");
    const enrolledIds = new Set(
      (enrollmentRows ?? []).map((row) => row.classroom_id as string),
    );
    classrooms = allClassrooms.filter((c) => enrolledIds.has(c.id));
  } else if (user.role === "teacher" && user.teacherId) {
    classrooms = allClassrooms.filter((c) =>
      c.teacherIds.includes(user.teacherId!),
    );
  }

  return {
    user,
    role: user.role,
    permissions: ROLE_PERMISSIONS[user.role],
    institution,
    schoolYear,
    subjects: (subjectRows ?? []).map((row) => ({
      id: row.id as string,
      institutionId: row.institution_id as string,
      name: row.name as string,
    })),
    classrooms,
  };
}

export async function getWorkspaceUser(): Promise<WorkspaceUser | null> {
  if (isAuthConfigured()) return getRealWorkspaceUser();
  const store = await cookies();
  const userId = store.get(WORKSPACE_SESSION_COOKIE)?.value;
  if (!userId) return null;
  return findWorkspaceUserById(userId);
}

/**
 * Contexto pedagógico do usuário autenticado: Instituição, Ano Letivo,
 * perfil, permissões, Disciplinas e as Turmas relevantes ao papel.
 */
export async function getWorkspaceContext(): Promise<WorkspaceContext | null> {
  if (isAuthConfigured()) return getRealWorkspaceContext();

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
