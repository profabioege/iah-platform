/**
 * Provisionamento automático do primeiro login (docs/AUTHENTICATION.md):
 *
 *   criar Usuário → criar Professor → criar Perfil professor →
 *   associar à Instituição → (Auth.js redireciona ao Dashboard)
 *
 * Idempotente: logins seguintes só atualizam last_login_at. Roda no
 * servidor com o client administrativo (service role) — o RLS não vale
 * para ele, por isso todo filtro de tenant é explícito aqui.
 *
 * A Instituição NUNCA é criada automaticamente: ela é inserida pelo
 * responsável real (ver docs/SUPABASE.md) e localizada pelo slug em
 * AUTH_DEFAULT_INSTITUTION_SLUG — sem ela, o login é negado com erro
 * claro, em vez de criar um tenant fantasma.
 */

import { getSupabaseAdminClient } from "@/modules/platform";
import type { ProvisionedTeacher } from "../domain/entities";

export interface ProvisionInput {
  email: string;
  name: string;
  avatarUrl: string | null;
  googleId: string;
}

export async function ensureTeacherProvisioned(
  input: ProvisionInput,
): Promise<ProvisionedTeacher> {
  const db = getSupabaseAdminClient();
  const email = input.email.trim().toLowerCase();
  const now = new Date().toISOString();

  // 1. Instituição de destino (inserida manualmente — nunca criada aqui).
  const slug = process.env.AUTH_DEFAULT_INSTITUTION_SLUG;
  if (!slug) {
    throw new Error(
      "AUTH_DEFAULT_INSTITUTION_SLUG não definida — ver docs/SUPABASE.md.",
    );
  }
  const { data: institution, error: institutionError } = await db
    .from("institutions")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (institutionError) throw institutionError;
  if (!institution) {
    throw new Error(
      `Instituição com slug "${slug}" não existe no banco — insira a linha ` +
        "da sua escola antes do primeiro login (docs/SUPABASE.md).",
    );
  }

  // 2. Usuário (cria no primeiro login; depois só marca o acesso).
  const { data: existingUser, error: userError } = await db
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (userError) throw userError;

  let userId: string;
  const firstLogin = !existingUser;
  if (existingUser) {
    userId = existingUser.id;
    const { error } = await db
      .from("users")
      .update({
        last_login_at: now,
        avatar_url: input.avatarUrl,
        google_id: input.googleId,
      })
      .eq("id", userId);
    if (error) throw error;
  } else {
    userId = crypto.randomUUID();
    const { error } = await db.from("users").insert({
      id: userId,
      institution_id: institution.id,
      name: input.name,
      email,
      avatar_url: input.avatarUrl,
      google_id: input.googleId,
      created_at: now,
      last_login_at: now,
    });
    if (error) throw error;
  }

  // 3. Professor (tabela teachers já existia — 0001; agora ligada ao usuário).
  const { data: existingTeacher, error: teacherError } = await db
    .from("teachers")
    .select("id")
    .eq("institution_id", institution.id)
    .eq("email", email)
    .maybeSingle();
  if (teacherError) throw teacherError;

  let teacherId: string;
  if (existingTeacher) {
    teacherId = existingTeacher.id;
    const { error } = await db
      .from("teachers")
      .update({ user_id: userId })
      .eq("id", teacherId);
    if (error) throw error;
  } else {
    teacherId = crypto.randomUUID();
    const { error } = await db.from("teachers").insert({
      id: teacherId,
      institution_id: institution.id,
      user_id: userId,
      name: input.name,
      email,
    });
    if (error) throw error;
  }

  // 4. Perfil professor (papel × escopo — P1 do DOMAIN_MODEL).
  const { data: existingProfile, error: profileError } = await db
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("institution_id", institution.id)
    .eq("role", "professor")
    .maybeSingle();
  if (profileError) throw profileError;

  let profileId: string;
  if (existingProfile) {
    profileId = existingProfile.id;
  } else {
    profileId = crypto.randomUUID();
    const { error } = await db.from("profiles").insert({
      id: profileId,
      user_id: userId,
      institution_id: institution.id,
      role: "professor",
      status: "active",
      created_at: now,
    });
    if (error) throw error;
  }

  return {
    userId,
    teacherId,
    profileId,
    institutionId: institution.id,
    role: "professor",
    firstLogin,
  };
}
