import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { isDocentiahConversationalPlannerEnabled } from "@/lib/feature-flags";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { getWorkspaceContext } from "@/modules/workspace";
import { Card, CardContent } from "@/components/ui/card";

import { ConversationalPlanner } from "./planejador/conversational-planner";

export const metadata: Metadata = {
  title: "DocentIAH",
  description: "Inteligência pedagógica para planejar, criar e acompanhar.",
};

/**
 * Home do DocentIAH. Atrás de `NEXT_PUBLIC_FEATURE_DOCENTIAH_CONVERSATIONAL_PLANNER`:
 * `true` abre o Planejador Conversacional.
 *
 * Candidata de apresentação: só o planejador foi transportado (regras
 * locais, sem IA externa, sem banco, sem salvar). Por isso ele existe
 * apenas no modo `demo`; fora dele — ou com a flag desligada — a tela
 * diz que a funcionalidade não está disponível, em vez de oferecer a
 * grade de tarefas cujas telas não fazem parte desta candidata.
 */
export default async function DocentIahPage() {
  const mode = requirePlatformDataMode();
  const workspace = await getWorkspaceContext();

  if (mode === "demo" && isDocentiahConversationalPlannerEnabled() && workspace?.user.teacherId) {
    return <ConversationalPlanner institutionId={workspace.institution.id} teacherId={workspace.user.teacherId} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">DocentIAH</p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
          <Sparkles className="size-6 text-primary" aria-hidden />
          Planejador de aula
        </h1>
      </header>
      <Card className="border-dashed">
        <CardContent className="py-2 text-sm text-muted-foreground">
          O DocentIAH não está disponível neste ambiente.
        </CardContent>
      </Card>
    </div>
  );
}
