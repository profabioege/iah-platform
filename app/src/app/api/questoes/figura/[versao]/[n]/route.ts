import { NextResponse } from "next/server";

import { getAuthMode } from "@/lib/auth-flags";

export const dynamic = "force-dynamic";

/**
 * Figura N de uma versão de questão (formato híbrido, D-050).
 *
 * Sem atalho de permissão aqui: a leitura passa pelo cliente `iah_app`
 * do ator conferido, e a RLS de `question_assets` (0018) decide — a
 * mesma visibilidade da versão (equipe da escola; catálogo só aprovado;
 * aluno só depois de a questão estar numa lista publicada da turma).
 * Qualquer recusa ou ausência responde 404: a rota não confirma a
 * existência de questões fora do alcance.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versao: string; n: string }> },
) {
  if (getAuthMode() !== "supabase") return new NextResponse(null, { status: 404 });
  const { versao, n } = await params;
  const number = Number(n);
  try {
    const { getQuestionBankContext } = await import(
      "@/modules/question-bank/infrastructure/request-context"
    );
    const { service } = await getQuestionBankContext();
    const content = await service.figure(decodeURIComponent(versao), number);
    if (!content) return new NextResponse(null, { status: 404 });
    return new NextResponse(Buffer.from(content), {
      headers: {
        "content-type": "image/png",
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
