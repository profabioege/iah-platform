import { NextResponse } from "next/server";

import { getAuthMode } from "@/lib/auth-flags";

export const dynamic = "force-dynamic";

/**
 * Identificação da instância — para saber, em campo, QUAL versão está no
 * ar e em que modo ela opera.
 *
 * Restrito: só responde para uma sessão de gestor autenticado. Para
 * qualquer outro (sem sessão, aluno, professor) devolve 404 — a
 * existência do endpoint não é informação pública.
 *
 * O que devolve é identificação, nunca configuração: commit, versão,
 * ambiente e modo. Nenhuma variável, URL de banco, chave ou segredo.
 */
export async function GET() {
  const mode = getAuthMode();

  if (mode === "unavailable") {
    return NextResponse.json({ erro: "indisponível" }, { status: 503 });
  }

  let papel: string | undefined;
  if (mode === "supabase") {
    const { auth } = await import("@/auth");
    const session = await auth();
    papel = (session?.user as { role?: string } | undefined)?.role;
  } else {
    const { getWorkspaceUser } = await import("@/modules/workspace");
    const user = await getWorkspaceUser();
    papel = user?.role === "admin" ? "administrador" : user?.role;
  }

  if (papel !== "administrador" && papel !== "admin_iah") {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json({
    aplicacao: "iah-platform",
    versao: process.env.npm_package_version ?? "0.1.0",
    commit:
      process.env.NEXT_PUBLIC_BUILD_COMMIT ??
      process.env.VERCEL_GIT_COMMIT_SHA ??
      "desconhecido",
    branch: process.env.NEXT_PUBLIC_BUILD_BRANCH ?? process.env.VERCEL_GIT_COMMIT_REF ?? "desconhecido",
    ambiente: process.env.NEXT_PUBLIC_BUILD_ENVIRONMENT ?? process.env.VERCEL_ENV ?? "local",
    modo: mode,
    construidoEm: process.env.NEXT_PUBLIC_BUILD_TIME ?? null,
  });
}
