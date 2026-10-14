import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck } from "lucide-react";

import { EvidenceBadge } from "@/components/study/evidence-badge";
import { DemonstrativeBanner, ProvisionalPlanBanner } from "@/components/study/study-banners";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { cn } from "@/lib/utils";
import { BLOCK_STATUS_LABEL, DIAGNOSTIC_RULES } from "@/modules/study";
import { getStudyContext } from "@/modules/study/infrastructure/request-context";

export const metadata: Metadata = {
  title: "Diagnóstico",
  description: "Diagnóstico por etapas curtas, com progresso salvo e evidências iniciais para orientar o estudo.",
};

const STATUS_TEXT = {
  nao_iniciado: "Não iniciado",
  incompleto: "Incompleto",
  concluido: "Concluído",
} as const;

/**
 * Diagnóstico do aluno (D-054): etapas curtas por habilidade, retomada de
 * onde parou e, ao final de cada etapa, EVIDÊNCIA INICIAL — nunca nota,
 * nunca "domínio", nunca TRI.
 */
export default async function StudentDiagnosticPage() {
  if (requirePlatformDataMode() !== "supabase") {
    return (
      <p className="mx-auto w-full max-w-3xl text-sm text-muted-foreground">
        O diagnóstico está disponível apenas na instalação com banco real.
      </p>
    );
  }
  const { actor, diagnostic } = await getStudyContext();
  if (actor.role !== "aluno") return null;
  const mine = await diagnostic.mine();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Minha aprendizagem</p>
        <h1 className="text-2xl font-semibold tracking-tight">Diagnóstico</h1>
        <p className="text-sm text-muted-foreground">
          Etapas curtas, uma por habilidade. Você pode sair e voltar: o que respondeu fica salvo. O resultado é um
          ponto de partida para o seu plano de estudos, não uma nota.
        </p>
      </header>

      {!mine ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Seu professor ainda não publicou um diagnóstico para a turma.
          </CardContent>
        </Card>
      ) : (
        <>
          <DemonstrativeBanner demonstrative={mine.diagnostic.demonstrative} />
          <ProvisionalPlanBanner provisional={mine.diagnostic.curriculumProvisional} />

          <section aria-labelledby="progresso" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 id="progresso" className="text-lg font-semibold">
                  {mine.diagnostic.title}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {mine.evidence.blocksSubmitted} de {mine.evidence.blocksTotal} etapa(s) entregue(s)
                </p>
              </div>
              <Badge variant="outline" className="font-normal">
                {STATUS_TEXT[mine.evidence.status]}
              </Badge>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={mine.evidence.blocksTotal}
              aria-valuenow={mine.evidence.blocksSubmitted}
              aria-label={`${mine.evidence.blocksSubmitted} de ${mine.evidence.blocksTotal} etapas entregues`}
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${mine.evidence.blocksTotal ? (mine.evidence.blocksSubmitted / mine.evidence.blocksTotal) * 100 : 0}%`,
                }}
              />
            </div>
            {mine.evidence.nextBlock ? (
              <Link
                href={`/dashboard/listas/${encodeURIComponent(mine.evidence.nextBlock.listId)}`}
                className={cn(buttonVariants(), "h-auto w-full justify-between whitespace-normal py-2 text-left sm:w-fit")}
              >
                {mine.evidence.nextBlock.blockStatus === "em_andamento" ? "Continuar" : "Começar"} a etapa{" "}
                {mine.evidence.nextBlock.position} ({mine.evidence.nextBlock.skillCode})
                <ArrowRight className="size-4 shrink-0" />
              </Link>
            ) : (
              <p className="text-sm">Você entregou todas as etapas.</p>
            )}
            {mine.evidence.status === "incompleto" ? (
              <p className="text-xs text-muted-foreground">
                Diagnóstico incompleto: as evidências abaixo valem só para as etapas entregues.
              </p>
            ) : null}
          </section>

          <section aria-labelledby="evidencias" className="flex flex-col gap-3">
            <div>
              <h2 id="evidencias" className="text-lg font-semibold">
                Evidências iniciais por habilidade
              </h2>
              <p className="text-xs text-muted-foreground">
                Com menos de {DIAGNOSTIC_RULES.minAnswered} respostas a habilidade fica com evidência insuficiente.
                Questão em branco é “não respondida”, não erro. Regra {mine.evidence.ruleVersion}.
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {mine.evidence.skills.map((s) => (
                <li key={s.blockId} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      Etapa {s.position} · <span className="font-mono">{s.skillCode}</span>
                    </p>
                    <EvidenceBadge level={s.level} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {BLOCK_STATUS_LABEL[s.blockStatus]} · {s.total} questão(ões)
                    {s.blockStatus === "entregue"
                      ? ` · ${s.correct} correta(s) · ${s.incorrect} incorreta(s) · ${s.unanswered} não respondida(s)`
                      : ""}
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/90">{s.message}</p>
                  <Link
                    href={`/dashboard/listas/${encodeURIComponent(s.listId)}`}
                    className="w-fit text-xs font-medium text-primary hover:underline"
                  >
                    {s.blockStatus === "entregue"
                      ? "Ver resolução e devolutivas"
                      : s.blockStatus === "em_andamento"
                        ? "Continuar a etapa"
                        : "Começar a etapa"}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <Link
            href="/dashboard/plano"
            className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
          >
            <CalendarCheck className="size-4" />
            Montar meu plano da semana
          </Link>
        </>
      )}
    </div>
  );
}
