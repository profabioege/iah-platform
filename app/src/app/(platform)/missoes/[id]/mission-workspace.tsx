"use client";

import * as React from "react";
import {
  CheckCircle2,
  NotebookPen,
  PartyPopper,
  PenLine,
  Undo2,
} from "lucide-react";

import {
  isMissionCompleted,
  isProductionDelivered,
  isReflectionRecorded,
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
 * Área de trabalho do aluno na Missão. Dona única do registro StudentWork
 * (produção + reflexão), evitando que painéis independentes se sobrescrevam.
 * Fluxo: entregar a produção → registrar a reflexão → aula concluída.
 */
export function MissionWorkspace({
  missionId,
  reflectionPrompt,
}: {
  missionId: string;
  reflectionPrompt: string;
}) {
  const [work, setWork] = React.useState<StudentWork | null>(null);

  React.useEffect(() => {
    setWork(loadStudentWork(missionId));
  }, [missionId]);

  if (!work) return null;

  function update(partial: Partial<StudentWork>) {
    setWork((current) =>
      current ? saveStudentWork({ ...current, ...partial }) : current,
    );
  }

  const delivered = isProductionDelivered(work);
  const recorded = isReflectionRecorded(work);
  const completed = isMissionCompleted(work);

  return (
    <div className="flex flex-col gap-4">
      {completed ? (
        <div className="flex items-center gap-3 rounded-xl border border-chart-2/50 bg-chart-2/10 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-2/20 text-chart-2">
            <PartyPopper className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Aula concluída
            </p>
            <p className="text-sm text-muted-foreground">
              Você entregou sua produção e registrou sua reflexão. Missão
              auditada.
            </p>
          </div>
        </div>
      ) : null}

      {/* Produção do Aluno */}
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
                Entregue em {formatDate(work.productionDeliveredAt)}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => update({ productionDeliveredAt: null })}
              >
                <Undo2 className="size-4" />
                Reabrir para editar
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() =>
                  update({ productionDeliveredAt: new Date().toISOString() })
                }
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

      {/* Reflexão no Diário do Auditor */}
      <Card id="reflexao" className={recorded ? "border-chart-3/50" : undefined}>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-7 items-center justify-center rounded-md bg-chart-3/15 text-chart-3">
                <NotebookPen className="size-4" />
              </span>
              Reflexão no Diário do Auditor
            </CardTitle>
            {recorded ? (
              <Badge className="bg-chart-3/15 text-chart-3">
                <CheckCircle2 className="size-3" />
                Registrada em {formatDate(work.reflectionRecordedAt)}
              </Badge>
            ) : null}
          </div>
          <CardDescription>{reflectionPrompt}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <textarea
            value={work.reflection}
            onChange={(e) => update({ reflection: e.target.value })}
            readOnly={recorded}
            rows={5}
            placeholder="Registre aqui a sua reflexão pessoal sobre esta investigação…"
            className="w-full resize-y rounded-lg border border-input bg-background/60 p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30 read-only:opacity-80"
            aria-label="Texto da reflexão no Diário do Auditor"
          />
          <div className="flex flex-wrap items-center gap-3">
            {recorded ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => update({ reflectionRecordedAt: null })}
              >
                <Undo2 className="size-4" />
                Reabrir para editar
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  update({ reflectionRecordedAt: new Date().toISOString() })
                }
                disabled={!delivered || work.reflection.trim().length === 0}
              >
                <CheckCircle2 className="size-4" />
                Registrar reflexão
              </Button>
            )}
            <span className="text-xs text-muted-foreground">
              {recorded
                ? "Sua reflexão fica guardada no Diário do Auditor."
                : delivered
                  ? "O texto é salvo automaticamente enquanto você escreve."
                  : "Entregue sua produção antes de registrar a reflexão."}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR");
}
