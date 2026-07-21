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
import { roleHome } from "@/modules/workspace/domain/workspace-context";

/**
 * Middleware de rotas privadas da Plataforma.
 *
 * Com autenticação real configurada (Auth.js + Google), vale o fluxo de
 * sempre — o gate isAuthConfigured() vem ANTES de invocar o Auth.js
 * (sem AUTH_SECRET ele lança MissingSecret na entrada). Sem ela, vale o
 * Institutional Workspace (M15): toda rota da Plataforma exige a sessão
 * local simulada, e o papel do usuário limita o alcance — aluno não
 * acessa /professor nem as áreas institucionais; /mantenedor, /direcao
 * e /coordenacao são cada um exclusivo do seu próprio papel (D-046:
 * sucessores do antigo "/gestor" único). Landing, /demonstracao e
 * /entrar seguem públicas.
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

  if (pathname.startsWith("/mantenedor") && role !== "maintainer") {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  if (pathname.startsWith("/direcao") && role !== "director") {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  if (pathname.startsWith("/coordenacao") && role !== "pedagogical_coordinator") {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
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
    "/mantenedor/:path*",
    "/direcao/:path*",
    "/coordenacao/:path*",
  ],
};
