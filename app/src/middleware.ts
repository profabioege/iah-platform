import { NextResponse, type NextRequest } from "next/server";
import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";
import { isAuthConfigured } from "@/lib/auth-flags";

/**
 * Middleware de rotas privadas da Plataforma.
 *
 * O gate isAuthConfigured() vem ANTES de invocar o Auth.js: sem
 * credenciais (modo demonstração), a request passa direto — o Auth.js
 * exigiria AUTH_SECRET já na entrada (MissingSecret), antes mesmo do
 * callback `authorized`. Configurado, o Auth.js exige sessão nas rotas
 * abaixo e redireciona para /entrar. Landing, /demonstracao e /entrar
 * permanecem sempre públicas. Ver docs/AUTHENTICATION.md.
 */
const nextAuthMiddleware = NextAuth(authConfig).auth as unknown as (
  request: NextRequest,
) => Response | Promise<Response>;

export default function middleware(request: NextRequest) {
  if (!isAuthConfigured()) return NextResponse.next();
  return nextAuthMiddleware(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/missoes/:path*",
    "/diario/:path*",
    "/professor/:path*",
  ],
};
