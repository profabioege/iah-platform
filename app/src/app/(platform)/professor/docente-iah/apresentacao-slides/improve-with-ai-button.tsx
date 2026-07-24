"use client";

import * as React from "react";
import { Check, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DocentiahSlidesGenerationInput } from "@/lib/ai/prompts/docentiah/slides";

import { improveContextAction, prepareImproveContextAction } from "./actions";

type Status = "idle" | "preparing" | "needs_review" | "loading" | "result" | "error" | "blocked";

/**
 * "Melhorar com IA" do campo "Detalhes adicionais" — capacidade
 * separada da geração dos slides (`docentiah.improve_context`). Reescreve
 * só o texto informado, nunca inventa fato novo, e exige confirmação
 * explícita do professor antes de substituir o texto original.
 *
 * Antes de qualquer chamada de IA, o texto passa pela política de
 * anonimização em camadas no servidor (Camadas 1–4,
 * docs/AI_PROVIDER_GATEWAY.md §8): se dado pessoal não resolvido for
 * encontrado, o envio é bloqueado (nenhuma chamada acontece); se algum
 * nome cadastrado foi mascarado automaticamente, uma prévia aparece
 * antes do envio. O nome do provedor nunca aparece nesta interface.
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
  const [reviewPreviewText, setReviewPreviewText] = React.useState<string | null>(null);
  const [suggestion, setSuggestion] = React.useState<{
    improvedText: string;
    changesSummary: string[];
    usedFallback: boolean;
  } | null>(null);
  const [undoState, setUndoState] = React.useState<{ previousText: string } | null>(null);

  const params = {
    text,
    subject: subject || undefined,
    educationLevel: educationLevel || undefined,
    grade: grade || undefined,
  };

  async function runImprovement() {
    setStatus("loading");
    const result = await improveContextAction(params);
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

  async function handleImprove() {
    setStatus("preparing");
    setErrorMessage(null);
    setReviewPreviewText(null);
    setUndoState(null);
    const prepared = await prepareImproveContextAction(params);
    if ("error" in prepared) {
      setStatus("error");
      setErrorMessage(prepared.error);
      return;
    }
    if (prepared.status === "blocked") {
      setStatus("blocked");
      setErrorMessage(prepared.message);
      return;
    }
    if (prepared.status === "needs_review") {
      setReviewPreviewText(prepared.sanitizedTextPreview);
      setStatus("needs_review");
      return;
    }
    // "ready" — nada para anonimizar, segue direto, sem etapa extra.
    await runImprovement();
  }

  function handleAccept() {
    if (!suggestion) return;
    setUndoState({ previousText: text });
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

  if (status === "needs_review" && reviewPreviewText) {
    return (
      <Card className="border-primary/40">
        <CardContent className="flex flex-col gap-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            <ShieldCheck className="size-3.5" aria-hidden />
            Proteção de dados
          </p>
          <p className="text-sm text-foreground/90">
            Algumas informações pessoais foram substituídas antes do envio à Inteligência Artificial.
          </p>
          <div>
            <p className="text-[11px] font-medium uppercase text-muted-foreground">Texto que será enviado</p>
            <p className="text-sm text-foreground/70">{reviewPreviewText}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={runImprovement}>
              Continuar com texto protegido
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setStatus("idle")}>
              Voltar e revisar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setStatus("idle")}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
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
        disabled={!text.trim() || status === "loading" || status === "preparing"}
        onClick={handleImprove}
      >
        <Sparkles className="size-3.5" aria-hidden />
        {status === "preparing"
          ? "Preparando…"
          : status === "loading"
            ? "Melhorando…"
            : status === "error" || status === "blocked"
              ? "Tentar novamente"
              : "Melhorar com IA"}
      </Button>
      {status === "blocked" && errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
      {status === "error" && errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
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
