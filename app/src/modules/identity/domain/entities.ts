/**
 * Contexto Identidade & Acesso (docs/DOMAIN_MODEL.md, P1: identidade
 * separada de papel). `PlatformUser` é a identidade que faz login;
 * `Profile` é o papel que ela assume numa Instituição.
 */

export type ProfileRole = "aluno" | "professor" | "administrador" | "admin_iah";

export interface PlatformUser {
  id: string;
  /** Instituição "casa" do usuário; null para admin IAH global. */
  institutionId: string | null;
  name: string;
  email: string;
  avatarUrl: string | null;
  /** providerAccountId do Google (estável entre logins). */
  googleId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Profile {
  id: string;
  userId: string;
  institutionId: string | null;
  role: ProfileRole;
  status: "active" | "inactive";
  createdAt: string;
}

/** Resultado do provisionamento de primeiro login. */
export interface ProvisionedTeacher {
  userId: string;
  teacherId: string;
  profileId: string;
  institutionId: string;
  role: "professor";
  firstLogin: boolean;
}
