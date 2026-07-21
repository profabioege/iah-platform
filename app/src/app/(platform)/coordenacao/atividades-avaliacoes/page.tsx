import type { Metadata } from "next";

import { getWorkspaceContext } from "@/modules/workspace";

import { AssessmentIndicators } from "../assessment-indicators";
import { loadPedagogicalOverview } from "../assessment-data";

export const metadata: Metadata = { title: "Coordenação · Atividades e avaliações" };

export default async function CoordenacaoAtividadesAvaliacoesPage() {
  const workspace = await getWorkspaceContext();
  if (!workspace) return null;

  const overview = await loadPedagogicalOverview(workspace);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Coordenação Pedagógica
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Atividades e avaliações
        </h1>
        <p className="text-sm text-muted-foreground">
          Indicadores reais das sondagens diagnósticas da unidade.
        </p>
      </header>

      <AssessmentIndicators indicators={overview.indicators} />
    </div>
  );
}
