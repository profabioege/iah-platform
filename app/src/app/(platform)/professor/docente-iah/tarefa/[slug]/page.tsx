import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { findDocentTask } from "../../tasks";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const task = findDocentTask((await params).slug);
  return { title: task ? `DocentIAH · ${task.title}` : "DocentIAH" };
}

/**
 * Placeholder honesto (D-016) de uma tarefa do DocentIAH: reconhece a
 * tarefa, explica que a inteligência pedagógica ainda não está
 * conectada nesta etapa (só interface/arquitetura) e, quando existe
 * uma ferramenta real que já resolve parte do trabalho hoje, aponta
 * para ela — sem fingir uma IA que não existe.
 */
export default async function DocentTaskPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const task = findDocentTask((await params).slug);
  if (!task) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link
        href="/professor/docente-iah"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        DocentIAH
      </Link>

      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">DocentIAH</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{task.title}</h1>
        <p className="text-sm text-muted-foreground">{task.description}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Em construção</CardTitle>
          <CardDescription>
            A inteligência pedagógica do DocentIAH para esta tarefa ainda não está
            conectada — por enquanto, esta tela é só a porta de entrada.
          </CardDescription>
        </CardHeader>
        {task.bridgeHref ? (
          <CardContent className="flex flex-wrap gap-3">
            <Link
              href={task.bridgeHref}
              className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
            >
              {task.bridgeLabel}
            </Link>
            {task.secondaryHref ? (
              <Link
                href={task.secondaryHref}
                className={cn(buttonVariants({ variant: "ghost" }), "w-fit")}
              >
                {task.secondaryLabel}
              </Link>
            ) : null}
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
