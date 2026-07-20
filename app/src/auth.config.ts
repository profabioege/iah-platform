import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import { isAuthConfigured, isGoogleAuthConfigured } from "@/lib/auth-flags";

/**
 * Configuração EDGE-SAFE do Auth.js — usada pelo middleware.
 *
 * Aqui não entra nada que dependa de Node/banco: o provider Credentials
 * (que consulta o banco) vive só em src/auth.ts; os callbacks jwt/session
 * ficam AQUI porque só copiam campos do token — e o middleware precisa
 * deles para enxergar papel/instituição na sessão (gate por papel, M22).
 * Ver docs/AUTHENTICATION.md.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/entrar" },
  providers: isGoogleAuthConfigured()
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : [],
  callbacks: {
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

    /**
     * Porta das rotas privadas. Sem o modo real configurado, a barreira
     * do Institutional Workspace (middleware) cuida do acesso; com ele,
     * exige sessão E aplica o gate por papel — /gestor é exclusivo do
     * administrador, /professor é vedado ao aluno. O papel vem do vínculo
     * persistido (token), nunca do cliente.
     */
    authorized({ auth, request }) {
      if (!isAuthConfigured()) return true;
      const user = auth?.user as
        | { role?: string }
        | undefined;
      if (!user) return false;

      const role = user.role ?? "";
      const { pathname } = request.nextUrl;

      if (
        pathname.startsWith("/gestor") &&
        !["administrador", "admin_iah"].includes(role)
      ) {
        return Response.redirect(
          new URL(role === "professor" ? "/professor" : "/dashboard", request.nextUrl),
        );
      }
      if (pathname.startsWith("/professor") && role === "aluno") {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
