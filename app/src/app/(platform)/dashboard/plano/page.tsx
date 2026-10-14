import type { Metadata } from "next";

import { PlanBoard } from "@/components/study/plan-board";
import { ProvisionalPlanBanner } from "@/components/study/study-banners";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { cn } from "@/lib/utils";
import { buildWeeklyPlanProposal, mondayOf, PLAN_RULE_VERSION, todayIso, WEEKDAY_LABEL } from "@/modules/study";
import { getStudyContext } from "@/modules/study/infrastructure/request-context";
import { getWorkspaceContext } from "@/modules/workspace";

import { generatePlanAction, planItemAction } from "./actions";

export const metadata: Metadata = {
  title: "Plano da semana",
  description: "Plano de estudos semanal com base no diagnóstico, no planejamento da escola e na sua disponibilidade.",
};

const MINUTE_OPTIONS = [10, 15, 20, 30, 45, 60, 90, 120];

const RULES = [
  ["R1", "Etapas pendentes do diagnóstico (sem elas, o plano não tem evidência)."],
  ["R2", "Listas publicadas pelo professor e ainda não entregues."],
  ["R3", "Missões da Trilha IA & Humanidades atribuídas e não entregues."],
  ["R4", "Revisão das devolutivas em habilidades marcadas como prioridade de estudo."],
  ["R5", "Revisão das devolutivas em habilidades em desenvolvimento."],
  ["R6", "Prática com questões novas no circuito, um dia depois da revisão da mesma habilidade."],
] as const;

export default async function StudentPlanPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  if (requirePlatformDataMode() !== "supabase") {
    return (
      <p className="mx-auto w-full max-w-4xl text-sm text-muted-foreground">
        O plano está disponível apenas na instalação com banco real.
      </p>
    );
  }
  const ctx = await getStudyContext();
  if (ctx.actor.role !== "aluno") return null;
  const workspace = await getWorkspaceContext();
  const classroomId = workspace?.classrooms[0]?.id;
  const { aviso } = await searchParams;
  const today = todayIso();

  if (!classroomId) {
    return <p className="mx-auto w-full max-w-4xl text-sm text-muted-foreground">Você ainda não está numa turma.</p>;
  }

  const [current, planContext] = await Promise.all([ctx.plan.mine(classroomId, today), ctx.planContextFor(classroomId)]);
  const days = current?.plan.availableDays ?? [1, 2, 3, 4, 5];
  const minutes = current?.plan.minutesPerDay ?? 30;
  // O que a regra ainda proporia e não cabe — mesmas entradas da geração.
  const leftover = current
    ? buildWeeklyPlanProposal({
        ...planContext,
        weekStart: mondayOf(today),
        today,
        availability: { days: current.plan.availableDays, minutesPerDay: current.plan.minutesPerDay },
        existing: current.items
          .filter((i) => i.status !== "removida")
          .map((i) => ({ day: i.day, minutes: i.minutes, status: i.status, kind: i.kind, refId: i.refId, skillId: i.skillId })),
      })
    : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Minha aprendizagem</p>
        <h1 className="text-2xl font-semibold tracking-tight">Plano da semana</h1>
        <p className="text-sm text-muted-foreground">
          Diga quando e quanto tempo você tem. O plano propõe atividades e explica por quê; você ajusta.
        </p>
      </header>

      {aviso ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {aviso}
        </p>
      ) : null}

      <ProvisionalPlanBanner provisional={planContext.planProvisional} />

      <Card>
        <CardContent className="py-2">
          <form action={generatePlanAction} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-semibold">Dias disponíveis nesta semana</legend>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <label
                    key={d}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input type="checkbox" name="dias" value={d} defaultChecked={days.includes(d)} className="accent-primary" />
                    {WEEKDAY_LABEL[d]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex flex-col gap-1 text-sm font-semibold sm:w-64">
              Minutos por dia
              <select
                name="minutos"
                defaultValue={String(minutes)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm font-normal"
              >
                {MINUTE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} minutos
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1">
              <button type="submit" className={cn(buttonVariants(), "w-fit")}>
                {current ? "Refazer o plano com esta disponibilidade" : "Gerar meu plano"}
              </button>
              <p className="text-xs text-muted-foreground">
                {current
                  ? "Refazer troca só as atividades propostas pela regra que ainda estão em aberto; concluídas e orientações do professor ficam."
                  : "Nada é gravado até você gerar o plano."}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {current ? (
        <PlanBoard
          plan={current.plan}
          items={current.items}
          events={current.events}
          usedByDay={current.usedByDay}
          itemAction={planItemAction}
          returnTo="/dashboard/plano"
          viewer="aluno"
        />
      ) : null}

      {leftover && (leftover.unscheduled.length > 0 || leftover.notes.length > 0) ? (
        <section aria-labelledby="nao-coube" className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-4">
          <h2 id="nao-coube" className="text-sm font-semibold">
            O que ficou de fora e observações
          </h2>
          <ul className="flex flex-col gap-1 text-xs text-foreground/80">
            {leftover.unscheduled.map((u) => (
              <li key={`${u.kind}:${u.refId}:${u.skillId}`}>
                <strong>{u.title}</strong> ({u.minutes} min) — {u.why}
              </li>
            ))}
            {leftover.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="rounded-xl border border-border bg-card p-3 text-sm">
        <summary className="cursor-pointer font-semibold">Como o plano escolhe as atividades ({PLAN_RULE_VERSION})</summary>
        <ol className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
          {RULES.map(([code, text]) => (
            <li key={code}>
              <strong>{code}</strong> — {text}
            </li>
          ))}
          <li>
            Cada atividade vai para o primeiro dia disponível com minutos livres; nunca passa dos minutos que você
            informou. Revisão é reler resolução e devolutivas — não refazer as mesmas questões.
          </li>
        </ol>
      </details>
    </div>
  );
}
