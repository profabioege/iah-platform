import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { isAuthConfigured, isGoogleAuthConfigured } from "@/lib/auth-flags";

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
      async authorize(credentials, request) {
        if (!isAuthConfigured()) return null;
        // A decisão de deixar entrar vive em `verify-credentials.ts` —
        // testável contra banco real, fora do runtime do Next.
        const { verifyCredentials } = await import(
          "@/modules/identity/authentication/verify-credentials"
        );
        return verifyCredentials(credentials?.email, credentials?.password, {
          origin:
            request?.headers?.get?.("x-forwarded-for")?.split(",")[0] ??
            request?.headers?.get?.("x-real-ip") ??
            null,
        });
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
