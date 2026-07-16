"use client";

import * as React from "react";
import { CheckCircle2, PenLine, Undo2 } from "lucide-react";

import {
  isProductionDelivered,
  loadStudentWork,
  saveStudentWork,
  type StudentWork,
} from "@/modules/classroom";
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
 * Painel de Produção do Aluno na tela da Missão.
 * Rascunho salvo automaticamente no dispositivo (localStorage);
 * "Entregar" marca a produção como entregue (critério do bloco 10).
 */
export function ProductionPanel({ missionId }: { missionId: string }) {
  const [work, setWork] = React.useState<StudentWork | null>(null);

  // Carrega no cliente (localStorage não existe no servidor).
  React.useEffect(() => {
    setWork(loadStudentWork(missionId));
  }, [missionId]);

  if (!work) return null;

  const delivered = isProductionDelivered(work);

  function update(partial: Partial<StudentWork>) {
    setWork((current) =>
      current ? saveStudentWork({ ...current, ...partial }) : current,
    );
  }

  function deliver() {
    update({ productionDeliveredAt: new Date().toISOString() });
  }

  function reopen() {
    update({ productionDeliveredAt: null });
  }

  return (
    <Card id="producao" className={delivered ? "border-chart-2/50" : undefined}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex size-7 items-center justify-center rounded-md bg-chart-2/15 text-chart-2">
              <PenLine className="size-4" />
            </span>
            Seu Relatório de Auditoria
          </CardTitle>
          {delivered ? (
            <Badge className="bg-chart-2/15 text-chart-2">
              <CheckCircle2 className="size-3" />
              Entregue em{" "}
              {new Date(work.productionDeliveredAt as string).toLocaleDateString(
                "pt-BR",
              )}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Rascunho · salvo neste dispositivo
            </Badge>
          )}
        </div>
        <CardDescription>
          Escreva aqui os seus vereditos, a manchete que você criou e a sua
          análise — em primeira pessoa de auditor.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <textarea
          value={work.production}
          onChange={(e) => update({ production: e.target.value })}
          readOnly={delivered}
          rows={10}
          placeholder={
            "a) Vereditos das 4 manchetes, com evidências…\n" +
            "b) A manchete falsa que você gerou…\n" +
            "c) Por que ela engana — e o que a denuncia…"
          }
          className="w-full resize-y rounded-lg border border-input bg-background/60 p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30 read-only:opacity-80"
          aria-label="Texto do Relatório de Auditoria"
        />
        <div className="flex flex-wrap items-center gap-3">
          {delivered ? (
            <Button variant="outline" size="sm" onClick={reopen}>
              <Undo2 className="size-4" />
              Reabrir para editar
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={deliver}
              disabled={work.production.trim().length === 0}
            >
              <CheckCircle2 className="size-4" />
              Entregar relatório
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {delivered
              ? "Reabrir remove a marca de entrega até você entregar de novo."
              : "O rascunho é salvo automaticamente enquanto você escreve."}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
