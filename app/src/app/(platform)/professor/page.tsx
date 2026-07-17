import type { Metadata } from "next";

import { simulatedClassMonitor } from "@/modules/classroom";
import { localMissionRepository } from "@/modules/library";
import { isGoogleWorkspaceConfigured } from "@/modules/integrations";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ClassPanel } from "./class-panel";

export const metadata: Metadata = {
  title: "Painel do Professor",
  description: "Acompanhe a turma durante a Missão.",
};

/**
 * Painel do Professor — acompanhamento da turma na Missão ativa.
 *
 * A fonte dos dados é o contrato ClassMonitorReader; hoje injeta-se a
 * implementação simulada (dados fictícios, autorizados para a fase de
 * demonstração). Ao trocar pela implementação com banco, apenas esta
 * injeção muda.
 */
export default async function ProfessorPage() {
  const missions = await localMissionRepository.list();
  const mission = missions[0];
  const students = mission
    ? await simulatedClassMonitor.listByMission(mission.id)
    : [];
  const googleConfigured = isGoogleWorkspaceConfigured();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Painel do Professor
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Acompanhamento da turma
        </h1>
        {mission ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/15 text-primary">
              Missão {String(mission.number).padStart(2, "0")}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {mission.title} · Turma de demonstração
            </span>
          </div>
        ) : null}
      </header>

      <ClassPanel students={students} />

      <Card>
        <CardHeader>
          <CardTitle>Integrações</CardTitle>
          <CardDescription>
            Provedores externos conectados a este Painel.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">
                {googleConfigured ? "✅" : "○"}
              </span>
              <span className="text-sm font-medium">Google Workspace</span>
            </div>
            <Badge variant="outline" className="text-muted-foreground">
              {googleConfigured ? "Conectado" : "Não configurado"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Infraestrutura preparada. Configure OAuth quando o projeto Google
            Cloud estiver disponível.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
