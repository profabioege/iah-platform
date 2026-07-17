import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";
import { isAuthConfigured } from "@/lib/auth-flags";

/**
 * Auth.js completo (Node) — login Google + provisionamento automático.
 *
 * Fluxo do primeiro login (docs/AUTHENTICATION.md):
 *   entrar com Google → allowlist (AUTH_ALLOWED_EMAILS) → criar Usuário
 *   → criar Perfil Professor → associar Instituição → Dashboard
 *
 * A sessão é JWT (persistente entre visitas via cookie assinado); papel e
 * instituição viajam no token para não consultar o banco a cada request.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account }) {
      if (!isAuthConfigured()) return false;
      if (account?.provider !== "google" || !user.email) return false;
      if (!isEmailAllowed(user.email)) {
        console.warn(`[auth] Login negado (fora da allowlist): ${user.email}`);
        return false;
      }
      try {
        // Import dinâmico: mantém o supabase-js fora do bundle do middleware.
        const { ensureTeacherProvisioned } = await import(
          "@/modules/identity"
        );
        const provisioned = await ensureTeacherProvisioned({
          email: user.email,
          name: user.name ?? user.email,
          avatarUrl: user.image ?? null,
          googleId: account.providerAccountId,
        });
        // Anexa ao user para o callback jwt copiar para o token.
        Object.assign(user, {
          platformUserId: provisioned.userId,
          institutionId: provisioned.institutionId,
          role: provisioned.role,
        });
        return true;
      } catch (error) {
        console.error("[auth] Provisionamento falhou; login negado.", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & {
          platformUserId?: string;
          institutionId?: string;
          role?: string;
        };
        token.platformUserId = u.platformUserId;
        token.institutionId = u.institutionId;
        token.role = u.role;
      }
      return token;
    },

    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          platformUserId: token.platformUserId as string | undefined,
          institutionId: token.institutionId as string | undefined,
          role: token.role as string | undefined,
        },
      };
    },
  },
});

/** Allowlist fechada por padrão: sem AUTH_ALLOWED_EMAILS, ninguém entra. */
function isEmailAllowed(email: string): boolean {
  const allowed = (process.env.AUTH_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
