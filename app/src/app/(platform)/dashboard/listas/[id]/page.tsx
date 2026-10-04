import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuestionContent } from "@/components/question-bank/question-content";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { cn } from "@/lib/utils";
import { getQuestionBankContext } from "@/modules/question-bank/infrastructure/request-context";

import { saveAnswersAction } from "../actions";

export const metadata: Metadata = {
  title: "Responder lista",
  description: "Responda às questões e veja a devolutiva depois de entregar.",
};

export default async function StudentListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  if (requirePlatformDataMode() !== "supabase") {
    return (
      <p className="mx-auto w-full max-w-3xl text-sm text-muted-foreground">
        As listas estão disponíveis apenas na instalação com banco real.
      </p>
    );
  }
  const { actor, service } = await getQuestionBankContext();
  if (actor.role !== "aluno") return null;

  const { id } = await params;
  const { aviso } = await searchParams;
  const view = await service.openList(decodeURIComponent(id)).catch(() => null);
  if (!view) notFound();
  const { list, items, answers, report, feedback, skills } = view;
  const skillCode = new Map(skills.map((s) => [s.id, s.code]));
  const open = list.status === "publicada" && view.attempt?.status !== "entregue";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        {list.kind === "circuito" ? (
          <Link href="/dashboard/circuito" className="text-xs text-primary hover:underline">← Circuito</Link>
        ) : (
          <Link href="/dashboard/listas" className="text-xs text-primary hover:underline">← Listas</Link>
        )}
        <h1 className="text-2xl font-semibold">{list.title}</h1>
        {report ? (
          <p className="text-sm">
            Você acertou <strong>{report.correct} de {report.total}</strong>.{" "}
            {report.bySkill.map((s) => `${s.skillCode}: ${s.correct}/${s.total}`).join(" · ")}
          </p>
        ) : null}
      </header>

      {aviso ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {aviso}
        </p>
      ) : null}

      {feedback ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Devolutiva do professor</CardTitle>
            <CardDescription>{feedback.comment}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {report ? (
        <section aria-label="Devolutiva por questão" className="flex flex-col gap-3">
          {report.items.map((item) => (
            <Card key={item.itemId}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">Questão {item.position}</span>
                  <Badge variant="secondary" className="font-mono">{skillCode.get(item.skillId)}</Badge>
                  <Badge variant={item.isCorrect ? "default" : "destructive"}>
                    {item.isCorrect ? "Correta" : "Incorreta"}
                  </Badge>
                </div>
                <CardTitle className="text-base font-normal leading-snug">
                  <QuestionContent text={item.stem} format={item.contentFormat} versionId={item.versionId} />
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <ol className="flex flex-col gap-1">
                  {item.options.map((o) => (
                    <li
                      key={o.key}
                      className={cn(
                        o.key === item.answerKey && "font-semibold text-emerald-700 dark:text-emerald-400",
                        o.key === item.selectedKey && o.key !== item.answerKey && "text-destructive line-through",
                      )}
                    >
                      {o.key}){" "}
                      <QuestionContent text={o.text} format={item.contentFormat} versionId={item.versionId} inline />
                      {o.key === item.selectedKey ? " — sua resposta" : ""}
                      {o.key === item.answerKey ? " — gabarito" : ""}
                    </li>
                  ))}
                </ol>
                {item.selectedFeedback && !item.isCorrect ? (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    <strong>Sobre a alternativa {item.selectedKey}:</strong> {item.selectedFeedback}
                  </p>
                ) : null}
                <p className="whitespace-pre-line text-muted-foreground"><strong>Resolução:</strong> {item.resolution}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : (
        <form action={saveAnswersAction} className="flex flex-col gap-4">
          <input type="hidden" name="listId" value={list.id} />
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Questão {item.position}</span>
                  <Badge variant="secondary" className="font-mono">{skillCode.get(item.skillId)}</Badge>
                </div>
                <CardTitle className="text-base font-normal leading-snug">
                  <QuestionContent text={item.stem} format={item.contentFormat} versionId={item.versionId} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <fieldset className="flex flex-col gap-2" disabled={!open}>
                  <legend className="sr-only">Alternativas da questão {item.position}</legend>
                  {item.options.map((o) => (
                    <label key={o.key} className="flex cursor-pointer items-start gap-3 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <input
                        type="radio"
                        name={`item:${item.id}`}
                        value={o.key}
                        defaultChecked={answers[item.id] === o.key}
                        className="mt-0.5 accent-primary"
                      />
                      <span>
                        {o.key}){" "}
                        <QuestionContent text={o.text} format={item.contentFormat} versionId={item.versionId} inline />
                      </span>
                    </label>
                  ))}
                </fieldset>
              </CardContent>
            </Card>
          ))}
          {open ? (
            <div className="flex flex-wrap gap-2">
              <button type="submit" name="intent" value="salvar" className={cn(buttonVariants({ variant: "outline" }))}>
                Salvar respostas
              </button>
              <button type="submit" name="intent" value="entregar" className={cn(buttonVariants())}>
                Entregar lista
              </button>
              <p className="w-full text-xs text-muted-foreground">
                Depois de entregar, as respostas não mudam e você vê gabarito e resolução.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Esta lista foi encerrada.</p>
          )}
        </form>
      )}
    </div>
  );
}
