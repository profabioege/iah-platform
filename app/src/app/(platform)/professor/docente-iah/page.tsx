import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { getWorkspaceContext } from "@/modules/workspace";
import { Card, CardContent } from "@/components/ui/card";

import { ContinueSection } from "./continue-section";
import { RelatedClassrooms } from "./related-classrooms";
import { TaskGrid } from "./task-grid";

export const metadata: Metadata = {
  title: "DocentIAH",
  description: "Inteligência pedagógica para planejar, criar e acompanhar.",
};

/**
 * Home do DocentIAH — o núcleo futuro da experiência docente. Nesta
 * etapa é só interface e arquitetura de navegação (D-044): sem
 * provedor de IA conectado, sem chamada externa. Tarefas claras, não
 * um chat genérico — o professor sempre sabe o que está pedindo.
 */
export default async function DocentIahPage() {
  const workspace = await getWorkspaceContext();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">DocentIAH</p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
          <Sparkles className="size-6 text-primary" aria-hidden />
          O que você quer fazer?
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Inteligência pedagógica para planejar, criar e acompanhar — sem
          substituir o professor. Escolha uma tarefa abaixo.
        </p>
      </header>

      <TaskGrid />

      <ContinueSection />

      <RelatedClassrooms classrooms={workspace?.classrooms ?? []} />

      <Card className="border-dashed opacity-70">
        <CardContent className="flex flex-col gap-1 py-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Sugestões inteligentes — em breve
          </p>
          <p className="text-sm text-muted-foreground">
            Espaço reservado para o DocentIAH sugerir o próximo passo com base na
            sua turma e no seu planejamento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
