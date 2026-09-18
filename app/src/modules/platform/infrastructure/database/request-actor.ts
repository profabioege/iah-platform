import { cache } from "react";

import type { DatabaseActor, DatabaseActorRole } from "./scoped-client";

/**
 * Quem é o ator DESTA requisição, conferido contra o banco.
 *
 * A sessão do Auth.js diz quem alega ser; aqui o servidor confirma, a
 * cada requisição protegida:
 *
 *  - a conta existe e está `active` (conta desativada perde acesso na
 *    hora, sem esperar a sessão expirar);
 *  - o perfil na instituição está `active`;
 *  - a versão da credencial da sessão ainda é a do banco (uma
 *    recuperação assistida invalida as sessões anteriores);
 *  - quais são os ids pedagógicos (professor/aluno) do ator.
 *
 * `cache` do React deduplica por requisição: várias telas e ações no
 * mesmo render compartilham a mesma conferência.
 */

const ROLES: DatabaseActorRole[] = [
  "aluno",
  "professor",
  "administrador",
  "admin_iah",
];

interface SessionClaims {
  platformUserId?: string;
  institutionId?: string;
  role?: string;
  credentialsVersion?: number;
}

export const getDatabaseActor = cache(async (): Promise<DatabaseActor | null> => {
  const { auth } = await import("@/auth");
  const session = await auth();
  const claims = session?.user as SessionClaims | undefined;
  if (!claims?.platformUserId || !claims.institutionId || !claims.role) {
    return null;
  }
  const role = ROLES.find((item) => item === claims.role);
  if (!role) return null;

  const { getSupabaseAdminClient } = await import("./admin-client");
  const db = getSupabaseAdminClient();

  const [{ data: user }, { data: profile }] = await Promise.all([
    db
      .from("users")
      .select("id, status, credentials_version")
      .eq("id", claims.platformUserId)
      .maybeSingle(),
    db
      .from("profiles")
      .select("role, status")
      .eq("user_id", claims.platformUserId)
      .eq("institution_id", claims.institutionId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (!user || user.status !== "active") return null;
  if (!profile || profile.role !== role) return null;

  // Sessão emitida antes de uma redefinição de credencial não vale mais.
  const sessionVersion = Number(claims.credentialsVersion ?? 0);
  const currentVersion = Number(user.credentials_version ?? 1);
  if (sessionVersion !== currentVersion) return null;

  const [{ data: teacher }, { data: student }] = await Promise.all([
    db
      .from("teachers")
      .select("id")
      .eq("user_id", claims.platformUserId)
      .eq("institution_id", claims.institutionId)
      .maybeSingle(),
    db
      .from("students")
      .select("id")
      .eq("user_id", claims.platformUserId)
      .eq("institution_id", claims.institutionId)
      .maybeSingle(),
  ]);

  return {
    institutionId: claims.institutionId,
    role,
    userId: claims.platformUserId,
    teacherId: (teacher?.id as string | undefined) ?? null,
    studentId: (student?.id as string | undefined) ?? null,
  };
});
