import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { isAuthConfigured, isGoogleAuthConfigured } from "@/lib/auth-flags";
import { verifyPassword } from "@/lib/password";

/**
 * Auth.js completo (Node) — M22: provider Credentials (e-mail + senha
 * verificados contra a tabela `users` do banco, hash scrypt) somado ao
 * Google (D-025, opcional — exige projeto Google Cloud). Uma única
 * sessão JWT para os dois: papel e instituição viajam no token e vêm
 * SEMPRE do vínculo persistido (profiles) — nunca do cliente.
 *
 * Contas de demonstração autenticam por este MESMO fluxo real (criadas
 * pelo seed app/db/seed/seed-demo.mjs) — nenhum bypass, nenhuma senha
 * no código.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!isAuthConfigured()) return null;
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        // Import dinâmico: mantém o supabase-js fora do bundle edge.
        const { getSupabaseAdminClient } = await import(
          "@/modules/platform/infrastructure/database/admin-client"
        );
        const db = getSupabaseAdminClient();

        const { data: user, error } = await db
          .from("users")
          .select("id, institution_id, name, email, password_hash, status")
          .eq("email", email)
          .eq("status", "active")
          .maybeSingle();
        if (error) {
          console.error("[auth] Falha ao consultar usuário.", error.message);
          return null;
        }
        if (!user?.password_hash) return null;
        if (!verifyPassword(password, user.password_hash as string)) {
          return null;
        }

        const { data: profile } = await db
          .from("profiles")
          .select("role, institution_id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        // Sem vínculo ativo com uma instituição, não há acesso (P1:
        // permissões derivam do Perfil, nunca da identidade sozinha).
        if (!profile) return null;

        await db
          .from("users")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", user.id);

        return {
          id: user.id as string,
          name: user.name as string,
          email: user.email as string,
          platformUserId: user.id as string,
          institutionId: (profile.institution_id ?? user.institution_id) as string,
          role: profile.role as string,
        };
      },
    }),
    ...authConfig.providers,
  ],
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account }) {
      if (!isAuthConfigured()) return false;
      // Credentials: o authorize acima já validou senha e vínculo.
      if (account?.provider === "credentials") return true;

      if (account?.provider !== "google" || !user.email) return false;
      if (!isGoogleAuthConfigured()) return false;
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
  },
});

/** Allowlist do login Google — fechada por padrão (D-025). */
function isEmailAllowed(email: string): boolean {
  const allowed = (process.env.AUTH_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
