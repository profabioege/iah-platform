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

import { findPlanningLevel } from "../levels";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ nivel: string }>;
}): Promise<Metadata> {
  const level = findPlanningLevel((await params).nivel);
  return { title: level ? `DocentIAH · Planejar · ${level.title}` : "DocentIAH · Planejar" };
}

/**
 * Placeholder honesto (D-016) de um nível da hierarquia de Planejamento.
 * "Planejamento anual" é o único nível com motor real hoje (Currículo
 * Vivo) — os demais ainda não têm tela própria.
 */
export default async function PlanningLevelPage({
  params,
}: {
  params: Promise<{ nivel: string }>;
}) {
  const level = findPlanningLevel((await params).nivel);
  if (!level) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link
        href="/professor/docente-iah/planejar"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Planejar
      </Link>

      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          DocentIAH · Planejar
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{level.title}</h1>
        <p className="text-sm text-muted-foreground">{level.description}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Em construção</CardTitle>
          <CardDescription>
            Este nível de planejamento ainda não tem uma tela própria no DocentIAH.
          </CardDescription>
        </CardHeader>
        {level.bridgeHref ? (
          <CardContent>
            <Link
              href={level.bridgeHref}
              className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
            >
              {level.bridgeLabel}
            </Link>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
