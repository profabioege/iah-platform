import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import { isAuthConfigured, isGoogleAuthConfigured } from "@/lib/auth-flags";

/** Rota inicial pelo papel cru do banco (D-046) — espelha `roleHome()` do Workspace, mas em cima da string do banco, não do `Role` do app (evita importar `modules/workspace/infrastructure/session.ts`, que puxa `next/headers`, fora do edge). */
function dbRoleHome(role: string): string {
  if (role === "professor") return "/professor";
  if (role === "aluno") return "/dashboard";
  if (role === "mantenedor") return "/mantenedor";
  if (role === "coordenador_pedagogico") return "/coordenacao";
  if (["administrador", "admin_iah", "diretor"].includes(role)) return "/direcao";
  return "/dashboard";
}

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
     * exige sessão E aplica o gate por papel — /mantenedor, /direcao e
     * /coordenacao são cada um exclusivo do seu papel (D-046: sucessores
     * do antigo "/gestor" único; "administrador"/"admin_iah" continuam
     * valendo como Direção até a migration `split_admin_role` introduzir
     * "diretor"/"mantenedor"/"coordenador_pedagogico" no banco), /professor
     * é vedado ao aluno. O papel vem do vínculo persistido (token), nunca
     * do cliente.
     */
    authorized({ auth, request }) {
      if (!isAuthConfigured()) return true;
      const user = auth?.user as
        | { role?: string }
        | undefined;
      if (!user) return false;

      const role = user.role ?? "";
      const { pathname } = request.nextUrl;
      const isDirector = ["administrador", "admin_iah", "diretor"].includes(role);
      const home = dbRoleHome(role);

      if (pathname.startsWith("/mantenedor") && role !== "mantenedor") {
        return Response.redirect(new URL(home, request.nextUrl));
      }
      if (pathname.startsWith("/direcao") && !isDirector) {
        return Response.redirect(new URL(home, request.nextUrl));
      }
      if (pathname.startsWith("/coordenacao") && role !== "coordenador_pedagogico") {
        return Response.redirect(new URL(home, request.nextUrl));
      }
      if (pathname.startsWith("/professor") && role === "aluno") {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
