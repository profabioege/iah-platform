import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { localMissionRepository } from "@/modules/library";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Lista de Missões da Plataforma. Lê do repositório local de conteúdo
 * (Fase 1). Cada nova Missão adicionada em content/missions aparece aqui
 * automaticamente, sem alterar esta tela.
 */
export default async function MissoesPage() {
  const missions = await localMissionRepository.list();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Laboratório do Auditor
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Missões
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Cada missão é uma investigação real. Escolha uma para começar a
          auditar a realidade.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {missions.map((mission) => (
          <Card key={mission.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <Badge className="bg-primary/15 text-primary">
                  Missão {String(mission.number).padStart(2, "0")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {mission.module}
                </span>
              </div>
              <CardTitle className="mt-2 text-lg">{mission.title}</CardTitle>
              <CardDescription className="text-base italic text-chart-2">
                &ldquo;{mission.guidingQuestion}&rdquo;
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button render={<Link href={`/missoes/${mission.id}`} />}>
                Abrir missão
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
