import { NextResponse, type NextRequest } from "next/server";
import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";
import { getAuthMode } from "@/lib/auth-flags";
// Import direto do arquivo edge-safe — o barrel do módulo puxa
// next/headers (session.ts), que não roda no middleware.
import {
  resolveSessionRole,
  WORKSPACE_SESSION_COOKIE,
} from "@/modules/workspace/infrastructure/session-cookie";
import { roleHome } from "@/modules/workspace/domain/workspace-context";
import type { Role } from "@/modules/workspace/domain/entities";

/**
 * Middleware de rotas privadas da Plataforma.
 *
 * Um caminho por modo declarado (`IAH_AUTH_MODE`, ver lib/auth-flags):
 *
 *  - `supabase`: fluxo do Auth.js. O gate vem ANTES de invocá-lo, pois
 *    sem AUTH_SECRET ele lança MissingSecret na entrada.
 *  - `demo`: Institutional Workspace (M15) — toda rota da Plataforma
 *    exige a sessão local simulada, e o papel limita o alcance.
 *  - indisponível: nenhuma rota privada é liberada. Um cookie de
 *    demonstração remanescente NÃO vale aqui — é justamente o fallback
 *    silencioso que este gate existe para impedir.
 *
 * Landing, /demonstracao e /entrar seguem públicas.
 */

/**
 * Espelho da allowlist de `auth.config.ts` nos papéis do Workspace —
 * mesma separação estrita (M23): cada papel alcança apenas a própria
 * área, sem herança administrativa. Papel que não resolve a partir do
 * cookie já cai antes, no redirecionamento para /entrar.
 */
const AREA_ROLES: Record<string, readonly Role[]> = {
  "/gestor": ["admin"],
  "/professor": ["teacher"],
  "/dashboard": ["student"],
  "/missoes": ["student"],
  "/diario": ["student"],
};

const PRIVATE_AREAS = Object.keys(AREA_ROLES);

const nextAuthMiddleware = NextAuth(authConfig).auth as unknown as (
  request: NextRequest,
) => Response | Promise<Response>;

export default function middleware(request: NextRequest) {
  const mode = getAuthMode();
  if (mode === "supabase") return nextAuthMiddleware(request);
  if (mode !== "demo") {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }

  const { pathname } = request.nextUrl;
  const userId = request.cookies.get(WORKSPACE_SESSION_COOKIE)?.value;
  const role = resolveSessionRole(userId);

  if (!role) {
    const login = new URL("/entrar", request.url);
    return NextResponse.redirect(login);
  }

  const area = PRIVATE_AREAS.find((prefix) => pathname.startsWith(prefix));
  if (area && !AREA_ROLES[area].includes(role)) {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/missoes/:path*",
    "/diario/:path*",
    "/professor/:path*",
    "/gestor/:path*",
  ],
};
