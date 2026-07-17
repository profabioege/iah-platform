import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

/**
 * Middleware de rotas privadas da Plataforma.
 *
 * Com autenticação configurada, exige sessão nas rotas abaixo (o
 * callback `authorized` em src/auth.config.ts decide e redireciona para
 * /entrar). Sem configuração, deixa tudo passar — modo demonstração.
 * A Landing, /demonstracao e /entrar permanecem sempre públicas.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/missoes/:path*",
    "/diario/:path*",
    "/professor/:path*",
  ],
};
