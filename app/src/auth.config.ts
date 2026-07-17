import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import { isAuthConfigured } from "@/lib/auth-flags";

/**
 * Configuração EDGE-SAFE do Auth.js — usada pelo middleware.
 *
 * Aqui não entra nada que dependa de Node/banco (o provisionamento vive
 * em src/auth.ts, que só roda no route handler). Ver docs/AUTHENTICATION.md.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/entrar" },
  providers: isAuthConfigured()
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : [],
  callbacks: {
    /**
     * Porta das rotas privadas: sem autenticação configurada, a
     * Plataforma segue aberta (modo demonstração); configurada, exige
     * sessão — o Auth.js redireciona para /entrar automaticamente.
     */
    authorized({ auth }) {
      if (!isAuthConfigured()) return true;
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
