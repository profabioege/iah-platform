import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { cn } from "@/lib/utils";
import { PRACTICE_LIST_KIND_LABEL } from "@/modules/question-bank";
import { getQuestionBankContext } from "@/modules/question-bank/infrastructure/request-context";

export const metadata: Metadata = {
  title: "Listas",
  description: "Listas de questões publicadas para a sua turma.",
};

export default async function StudentListsPage() {
  if (requirePlatformDataMode() !== "supabase") {
    return (
      <p className="mx-auto w-full max-w-4xl text-sm text-muted-foreground">
        As listas estão disponíveis apenas na instalação com banco real.
      </p>
    );
  }
  const { actor, service } = await getQuestionBankContext();
  if (actor.role !== "aluno") return null;
  const lists = await service.myLists();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Minha aprendizagem</p>
        <h1 className="text-2xl font-semibold">Listas</h1>
        <p className="text-sm text-muted-foreground">Listas curtas publicadas pelos seus professores.</p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2">
        {lists.map(({ list, attempt }) => {
          const done = attempt?.status === "entregue";
          return (
            <Card key={list.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>{list.title}</CardTitle>
                  <Badge variant={done ? "secondary" : "default"}>
                    {done ? "Entregue" : list.status === "encerrada" ? "Encerrada" : attempt ? "Em andamento" : "Nova"}
                  </Badge>
                </div>
                <CardDescription>
                  {PRACTICE_LIST_KIND_LABEL[list.kind]}
                  {done && attempt.scoreTotal ? ` · ${attempt.scoreCorrect} de ${attempt.scoreTotal} corretas` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/dashboard/listas/${encodeURIComponent(list.id)}`} className={cn(buttonVariants(), "w-full")}>
                  {done ? "Ver devolutiva" : "Responder"}
                </Link>
              </CardContent>
            </Card>
          );
        })}
        {lists.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma lista publicada para a sua turma.
            </CardContent>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
