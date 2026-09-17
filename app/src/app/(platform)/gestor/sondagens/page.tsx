import type { Metadata } from "next";

import { DemoStateNotice } from "@/components/demo/demo-state-notice";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { getWorkspaceContext } from "@/modules/workspace";

import { AssessmentIndicators } from "./assessment-indicators";
import { loadPedagogicalOverview } from "./assessment-data";

export const metadata: Metadata = { title: "Sondagem diagnóstica · Painel do Gestor" };

/**
 * Indicadores agregados da sondagem diagnóstica para o gestor — adaptado de
 * `coordenacao/atividades-avaliacoes` (3246b7f) para o papel técnico único
 * `admin` da área `/gestor`, sem criar papel nem regra de autorização nova.
 */
export default async function GestorSondagensPage() {
  if (requirePlatformDataMode() !== "demo") {
    return (
      <p className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">
        A sondagem diagnóstica não está disponível neste ambiente.
      </p>
    );
  }
  const workspace = await getWorkspaceContext();
  if (!workspace || workspace.role !== "admin") return null;

  const overview = await loadPedagogicalOverview(workspace);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Painel do Gestor</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Sondagem diagnóstica</h1>
        <p className="text-sm text-muted-foreground">
          Indicadores agregados das sondagens da unidade, sem exposição individual de alunos.
        </p>
      </header>

      <DemoStateNotice />

      <AssessmentIndicators indicators={overview.indicators} />
    </div>
  );
}
