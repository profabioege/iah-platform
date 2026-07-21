"use client";

import * as React from "react";
import { Check, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { improveContextAction } from "./actions";

/**
 * "Melhorar com IA" do campo "Detalhes adicionais" — capacidade
 * separada da geração dos slides (`docentiah.improve_text`). Reescreve
 * só o texto informado, nunca inventa fato novo, e exige confirmação
 * explícita do professor antes de substituir o texto original.
 */
export function ImproveWithAiButton({
  text,
  onAccept,
}: {
  text: string;
  onAccept: (improvedText: string) => void;
}) {
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [suggestion, setSuggestion] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function handleImprove() {
    setStatus("loading");
    setErrorMessage(null);
    const result = await improveContextAction(text);
    if ("error" in result) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }
    setSuggestion(result.improvedText);
    setStatus("idle");
  }

  if (suggestion) {
    return (
      <Card className="border-primary/40">
        <CardContent className="flex flex-col gap-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Sugestão de melhoria
          </p>
          <p className="text-sm text-foreground/90">{suggestion}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onAccept(suggestion);
                setSuggestion(null);
              }}
            >
              <Check className="size-3.5" aria-hidden />
              Usar este texto
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setSuggestion(null)}>
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
        {status === "loading" ? "Melhorando…" : "Melhorar com IA"}
      </Button>
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
    </div>
  );
}
