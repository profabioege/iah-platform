import Link from "next/link";
import { ArrowRight, BookOpenText, Bot, CheckCircle2, CircleDashed, Compass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MISSION_STATUS_LABEL,
  PATHWAY_STATUS_LABEL,
  type AreaPathway,
  type NextActivity,
  type PathwayStatus,
  type StudentPathways,
} from "@/modules/pathways";

/**
 * "Meus percursos" (D-053): o aluno vê, na entrada da plataforma, os dois
 * eixos do IAH — a Trilha IA & Humanidades e as trilhas de estudo de cada
 * área — cada um com a próxima atividade e o progresso.
 *
 * Progresso = atividades entregues ÷ publicadas. Não é nota, não é TRI.
 * Mesma convenção de cor do resto do incremento: IA = chart-2.
 */
export function StudentPathwaysSection({
  pathways,
  disciplineUnavailable,
}: {
  pathways: StudentPathways;
  disciplineUnavailable: string | null;
}) {
  const { ai, areas } = pathways;
  return (
    <section aria-labelledby="meus-percursos" className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Minha aprendizagem</p>
        <h1 id="meus-percursos" className="text-2xl font-semibold tracking-tight">
          Meus percursos
        </h1>
        <p className="text-sm text-muted-foreground">
          A trilha de IA &amp; Humanidades e as trilhas de estudo das disciplinas, com a próxima atividade de cada uma.
        </p>
      </header>

      {/* Eixo 1 — Trilha IA & Humanidades */}
      <article
        aria-label="Trilha IA & Humanidades"
        className="flex flex-col gap-4 rounded-xl border border-chart-2/40 bg-gradient-to-br from-chart-2/10 via-card to-card p-4 md:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-chart-2/15 text-chart-2">
              <Bot className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Trilha IA &amp; Humanidades</h2>
              <p className="text-xs text-muted-foreground">
                Aprender a usar, compreender, avaliar e criar com IA — investigando temas de Ciências Humanas.
              </p>
            </div>
          </div>
          <StatusBadge status={ai.status} />
        </div>

        <Progress done={ai.done} total={ai.total} unit="missões entregues" tone="chart-2" />
        <NextButton
          next={ai.next}
          tone="chart-2"
          emptyText={
            ai.status === "em_dia"
              ? "Missões entregues. A próxima aparece aqui quando o professor publicar."
              : "Aguardando o professor publicar uma missão de IA."
          }
        />

        {ai.missions.length > 0 ? (
          <ul className="grid gap-2 md:grid-cols-2">
            {ai.missions.map((m) => (
              <li key={m.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/missoes/${encodeURIComponent(m.id)}`}
                    className="text-sm font-medium hover:underline"
                  >
                    Missão {m.number} · {m.title}
                  </Link>
                  <Badge variant="outline" className="shrink-0 font-normal">
                    {MISSION_STATUS_LABEL[m.status]}
                  </Badge>
                </div>
                {m.discipline ? (
                  <p className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      {m.discipline.component} · {m.discipline.skillCode}
                    </span>
                    <span className="rounded-full bg-chart-2/10 px-2 py-0.5 text-chart-2">
                      {m.aiCompetencies} competência(s) de IA
                    </span>
                  </p>
                ) : null}
                {m.linkedLists.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px] font-medium text-muted-foreground">Exercícios ligados ao tema</p>
                    {m.linkedLists.map((l) => (
                      <Link
                        key={l.listId}
                        href={l.href}
                        className="flex items-center gap-1.5 text-xs text-foreground/80 hover:text-foreground"
                      >
                        {l.done ? (
                          <CheckCircle2 className="size-3.5 text-chart-2" />
                        ) : (
                          <CircleDashed className="size-3.5 text-muted-foreground" />
                        )}
                        {l.title}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </article>

      {/* Eixo 2 — Trilhas de estudo por área */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BookOpenText className="size-5 text-primary" />
            Trilhas de estudo
          </h2>
          <nav aria-label="Diagnóstico e plano" className="flex flex-wrap gap-2">
            <Link href="/dashboard/diagnostico" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Diagnóstico
            </Link>
            <Link href="/dashboard/plano" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Plano da semana
            </Link>
          </nav>
        </div>
        {disciplineUnavailable ? (
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            As trilhas das disciplinas não puderam ser carregadas agora ({disciplineUnavailable}). A trilha de IA
            continua disponível.
          </p>
        ) : null}
        {!pathways.gradeKnown && !disciplineUnavailable ? (
          <p className="text-xs text-muted-foreground">
            A escola ainda não informou a série desta turma: o planejamento mostrado é o do ano inteiro.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {areas.map((area) => (
            <AreaCard key={area.code} area={area} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AreaCard({ area }: { area: AreaPathway }) {
  return (
    <article aria-label={`Trilha de ${area.label}`} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{area.label}</h3>
          <p className="text-[11px] text-muted-foreground">
            {area.components.length > 0 ? area.components.join(" · ") : "Sem componente planejado"}
          </p>
        </div>
        <Compass className="size-4 shrink-0 text-muted-foreground" />
      </div>
      <StatusBadge status={area.status} />
      {area.listsTotal > 0 ? <Progress done={area.listsDone} total={area.listsTotal} unit="listas entregues" tone="primary" /> : null}
      {area.circuit ? (
        <p className="text-[11px] text-muted-foreground">
          Circuito: {area.circuit.skillCode} · {area.circuit.masteryLabel}
        </p>
      ) : null}
      <NextButton next={area.next} tone="primary" emptyText={emptyTextFor(area)} small />
    </article>
  );
}

function emptyTextFor(area: AreaPathway): string {
  if (area.status === "sem_conteudo") return "Ainda sem conteúdo nesta área para a sua turma.";
  if (area.status === "em_dia") return "Tudo entregue por aqui.";
  return `${area.plannedSkills} habilidade(s) planejada(s); aguardando atividade do professor.`;
}

function StatusBadge({ status }: { status: PathwayStatus }) {
  const tone =
    status === "em_andamento"
      ? "bg-primary/15 text-primary"
      : status === "em_dia"
        ? "bg-chart-2/15 text-chart-2"
        : "bg-muted text-muted-foreground";
  return <Badge className={cn("w-fit font-normal", tone)}>{PATHWAY_STATUS_LABEL[status]}</Badge>;
}

function Progress({
  done,
  total,
  unit,
  tone,
}: {
  done: number;
  total: number;
  unit: string;
  tone: "primary" | "chart-2";
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={`${done} de ${total} ${unit}`}
      >
        <div className={cn("h-full rounded-full", tone === "primary" ? "bg-primary" : "bg-chart-2")} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {done} de {total} {unit}
      </p>
    </div>
  );
}

function NextButton({
  next,
  tone,
  emptyText,
  small = false,
}: {
  next: NextActivity | null;
  tone: "primary" | "chart-2";
  emptyText: string;
  small?: boolean;
}) {
  if (!next) return <p className="text-xs text-muted-foreground">{emptyText}</p>;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Próxima atividade</p>
      <Link
        href={next.href}
        className={cn(
          buttonVariants({ size: small ? "sm" : "default", variant: tone === "primary" ? "default" : "outline" }),
          "h-auto w-full justify-between whitespace-normal py-2 text-left",
          tone === "chart-2" && "border-chart-2/50 text-foreground",
        )}
      >
        <span>{next.label}</span>
        <ArrowRight className="size-4 shrink-0" />
      </Link>
    </div>
  );
}
