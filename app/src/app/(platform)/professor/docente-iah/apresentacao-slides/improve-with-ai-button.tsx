"use client";

import * as React from "react";
import { Check, RotateCcw, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DocentiahSlidesGenerationInput } from "@/lib/ai/prompts/docentiah/slides";

import { improveContextAction } from "./actions";

type Status = "idle" | "loading" | "result" | "error";

/**
 * "Melhorar com IA" do campo "Detalhes adicionais" — capacidade
 * separada da geração dos slides (`docentiah.improve_context`). Reescreve
 * só o texto informado, nunca inventa fato novo, e exige confirmação
 * explícita do professor antes de substituir o texto original. Pode
 * rodar num provedor real (DeepSeek) atrás de feature flag — a UI nunca
 * mostra o nome do provedor, só um aviso neutro quando o modo
 * demonstrativo foi usado (flag desligada ou fallback por indisponibilidade).
 */
export function ImproveWithAiButton({
  text,
  subject,
  educationLevel,
  grade,
  onAccept,
}: {
  text: string;
  subject?: string;
  educationLevel?: DocentiahSlidesGenerationInput["educationLevel"] | "";
  grade?: string;
  onAccept: (improvedText: string) => void;
}) {
  const [status, setStatus] = React.useState<Status>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [suggestion, setSuggestion] = React.useState<{
    improvedText: string;
    changesSummary: string[];
    usedFallback: boolean;
  } | null>(null);
  const [undoState, setUndoState] = React.useState<{ previousText: string; acceptedText: string } | null>(null);

  async function handleImprove() {
    setStatus("loading");
    setErrorMessage(null);
    setUndoState(null);
    const result = await improveContextAction({
      text,
      subject: subject || undefined,
      educationLevel: educationLevel || undefined,
      grade: grade || undefined,
    });
    if ("error" in result) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }
    setSuggestion({
      improvedText: result.improvedText,
      changesSummary: result.changesSummary,
      usedFallback: result.usedFallback,
    });
    setStatus("result");
  }

  function handleAccept() {
    if (!suggestion) return;
    setUndoState({ previousText: text, acceptedText: suggestion.improvedText });
    onAccept(suggestion.improvedText);
    setSuggestion(null);
    setStatus("idle");
  }

  function handleCancel() {
    setSuggestion(null);
    setStatus("idle");
  }

  function handleUndo() {
    if (!undoState) return;
    onAccept(undoState.previousText);
    setUndoState(null);
  }

  if (status === "result" && suggestion) {
    return (
      <Card className="border-primary/40">
        <CardContent className="flex flex-col gap-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Sugestão de melhoria</p>
          <div className="flex flex-col gap-2 text-sm">
            <div>
              <p className="text-[11px] font-medium uppercase text-muted-foreground">Seu texto original</p>
              <p className="text-foreground/70">{text}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase text-muted-foreground">Proposta</p>
              <p className="text-foreground/90">{suggestion.improvedText}</p>
            </div>
          </div>
          {suggestion.changesSummary.length > 0 ? (
            <ul className="list-inside list-disc text-xs text-muted-foreground">
              {suggestion.changesSummary.map((change, index) => (
                <li key={index}>{change}</li>
              ))}
            </ul>
          ) : null}
          {suggestion.usedFallback ? (
            <p className="text-xs text-muted-foreground">Sugestão gerada em modo demonstrativo.</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={handleAccept}>
              <Check className="size-3.5" aria-hidden />
              Usar este texto
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
              <X className="size-3.5" aria-hidden />
              Manter o meu texto
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!text.trim() || status === "loading"}
        onClick={handleImprove}
      >
        <Sparkles className="size-3.5" aria-hidden />
        {status === "loading" ? "Melhorando…" : status === "error" ? "Tentar novamente" : "Melhorar com IA"}
      </Button>
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
      {undoState ? (
        <button
          type="button"
          onClick={handleUndo}
          className="flex w-fit items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          <RotateCcw className="size-3" aria-hidden />
          Desfazer última melhoria
        </button>
      ) : null}
    </div>
  );
}
