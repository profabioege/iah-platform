import { NextResponse, type NextRequest } from "next/server";
import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";
import { isAuthConfigured } from "@/lib/auth-flags";
// Import direto do arquivo edge-safe — o barrel do módulo puxa
// next/headers (session.ts), que não roda no middleware.
import {
  resolveSessionRole,
  WORKSPACE_SESSION_COOKIE,
} from "@/modules/workspace/infrastructure/session-cookie";

/**
 * Middleware de rotas privadas da Plataforma.
 *
 * Com autenticação real configurada (Auth.js + Google), vale o fluxo de
 * sempre — o gate isAuthConfigured() vem ANTES de invocar o Auth.js
 * (sem AUTH_SECRET ele lança MissingSecret na entrada). Sem ela, vale o
 * Institutional Workspace (M15): toda rota da Plataforma exige a sessão
 * local simulada, e o papel do usuário limita o alcance — aluno não
 * acessa /professor nem /gestor; /gestor é exclusivo do Administrador
 * Institucional. Landing, /demonstracao e /entrar seguem públicas.
 */
const nextAuthMiddleware = NextAuth(authConfig).auth as unknown as (
  request: NextRequest,
) => Response | Promise<Response>;

export default function middleware(request: NextRequest) {
  if (isAuthConfigured()) return nextAuthMiddleware(request);

  const { pathname } = request.nextUrl;
  const userId = request.cookies.get(WORKSPACE_SESSION_COOKIE)?.value;
  const role = resolveSessionRole(userId);

  if (!role) {
    const login = new URL("/entrar", request.url);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith("/gestor") && role !== "admin") {
    return NextResponse.redirect(
      new URL(role === "teacher" ? "/professor" : "/dashboard", request.url),
    );
  }

  if (pathname.startsWith("/professor") && role === "student") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/missoes/:path*",
    "/diario/:path*",
    "/avaliacoes/:path*",
    "/professor/:path*",
    "/gestor/:path*",
  ],
};
