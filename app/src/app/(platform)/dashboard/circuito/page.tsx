import type { Metadata } from "next";
import Link from "next/link";

import { MasteryBadge } from "@/components/question-bank/mastery-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { cn } from "@/lib/utils";
import type { MyCircuit } from "@/modules/question-bank";
import { getQuestionBankContext } from "@/modules/question-bank/infrastructure/request-context";

import { startRoundAction } from "./actions";

export const metadata: Metadata = {
  title: "Circuito",
  description: "Rodadas curtas por habilidade, com reforço e avanço acompanhados pelo professor.",
};

export default async function StudentCircuitPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  if (requirePlatformDataMode() !== "supabase") {
    return (
      <p className="mx-auto w-full max-w-3xl text-sm text-muted-foreground">
        O circuito está disponível apenas na instalação com banco real.
      </p>
    );
  }
  const { actor, circuit } = await getQuestionBankContext();
  if (actor.role !== "aluno") return null;
  const { aviso } = await searchParams;
  const mine = await circuit.mine();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Minha aprendizagem</p>
        <h1 className="text-2xl font-semibold">Circuito</h1>
        <p className="text-sm text-muted-foreground">
          Rodadas de 3 questões na habilidade em que você está. Errou? Vem reforço. Consolidou? Seu professor
          libera a próxima.
        </p>
      </header>

      {aviso ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {aviso}
        </p>
      ) : null}

      {!mine ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Seu professor ainda não ligou o circuito da turma.
          </CardContent>
        </Card>
      ) : (
        <>
          <CurrentStep mine={mine} />

          <section aria-labelledby="sequencia" className="flex flex-col gap-2">
            <h2 id="sequencia" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Habilidades do circuito
            </h2>
            <ol className="flex flex-col gap-2">
              {mine.sequence.map((skill) => {
                const m = mine.mastery[skill.id];
                const unlocked = mine.unlocked.includes(skill.id);
                const current = mine.position.currentSkillId === skill.id;
                return (
                  <li
                    key={skill.id}
                    className={cn(
                      "flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm",
                      current ? "border-primary" : "border-border",
                      !unlocked && "opacity-60",
                    )}
                  >
                    <span className="font-mono font-semibold">{skill.code}</span>
                    {unlocked ? <MasteryBadge mastery={m} /> : <Badge variant="outline">Bloqueada</Badge>}
                    {current ? <Badge>Agora</Badge> : null}
                    <span className="w-full text-muted-foreground line-clamp-2">{skill.description}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          {mine.rounds.length > 0 ? (
            <section aria-labelledby="rodadas" className="flex flex-col gap-2">
              <h2 id="rodadas" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Suas rodadas
              </h2>
              <ul className="flex flex-col gap-2">
                {mine.rounds.map(({ list, attempt }) => (
                  <li key={list.id}>
                    <Link
                      href={`/dashboard/listas/${encodeURIComponent(list.id)}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm hover:bg-muted/60"
                    >
                      <span>{list.title}</span>
                      <Badge variant={attempt?.status === "entregue" ? "secondary" : "default"}>
                        {attempt?.status === "entregue"
                          ? `${attempt.scoreCorrect} de ${attempt.scoreTotal}`
                          : attempt
                            ? "Em andamento"
                            : "Nova"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function CurrentStep({ mine }: { mine: MyCircuit }) {
  const { position, openRound, circuit } = mine;
  const current = mine.sequence.find((s) => s.id === position.currentSkillId) ?? null;
  const next = mine.sequence.find((s) => s.id === position.nextSkillId) ?? null;

  if (circuit.status === "pausado") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Circuito pausado pelo professor</CardTitle>
          <CardDescription>Suas rodadas entregues continuam aqui; novas rodadas voltam quando ele retomar.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  if (!current) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aguardando o professor</CardTitle>
          <CardDescription>A primeira habilidade ainda não foi liberada para você.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  const m = mine.mastery[current.id];
  return (
    <Card className="border-primary/50">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold">{current.code}</span>
          <MasteryBadge mastery={m} />
        </div>
        <CardDescription className="line-clamp-3">{current.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {position.status === "pronto_para_avancar" && next ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            Você consolidou esta habilidade. Seu professor vai liberar <strong>{next.code}</strong>; enquanto isso, pode
            seguir praticando.
          </p>
        ) : null}
        {position.status === "concluiu_sequencia" ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            Você consolidou a última habilidade do circuito.
          </p>
        ) : null}
        <form action={startRoundAction}>
          <button type="submit" className={cn(buttonVariants())}>
            {openRound ? "Continuar rodada" : position.status === "praticando" ? "Começar rodada" : "Praticar mais"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
