"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

const STAGES = [
  "Analisando suas escolhas",
  "Consultando fontes",
  "Organizando a apresentação",
  "Preparando os slides",
] as const;

/** Progresso nomeado da geração — nunca um spinner genérico sem explicação. */
export function GenerationProgress() {
  const [stageIndex, setStageIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, STAGES.length - 1));
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-3 py-4" role="status" aria-live="polite">
      {STAGES.map((stage, index) => (
        <div key={stage} className="flex items-center gap-3 text-sm">
          {index < stageIndex ? (
            <CheckCircle2 className="size-4 shrink-0 text-chart-2" aria-hidden />
          ) : index === stageIndex ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
          ) : (
            <span className="size-4 shrink-0 rounded-full border border-border" aria-hidden />
          )}
          <span className={index <= stageIndex ? "text-foreground" : "text-muted-foreground"}>{stage}</span>
        </div>
      ))}
    </div>
  );
}
