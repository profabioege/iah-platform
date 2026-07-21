"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Save } from "lucide-react";

import type { DocentiahSlidesGenerationOutput } from "@/lib/ai/prompts/docentiah/slides";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { saveMaterialAction } from "./actions";

const textareaClassName =
  "w-full resize-y rounded-lg border border-input bg-background/60 p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30";

export const AI_DISCLAIMER =
  "Este material foi produzido com apoio de Inteligência Artificial. Revise conceitos, referências, linguagem e adequação à sua turma antes de utilizá-lo.";

/** Resultado editável — navegação entre slides, edição, aviso obrigatório e salvar em "Meus materiais". */
export function SlidesResult({
  materialId,
  initialOutput,
}: {
  materialId: string;
  initialOutput: DocentiahSlidesGenerationOutput;
}) {
  const [output, setOutput] = React.useState(initialOutput);
  const [activeSlideIndex, setActiveSlideIndex] = React.useState(0);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const slide = output.slides[activeSlideIndex];

  function updateSlide(partial: Partial<DocentiahSlidesGenerationOutput["slides"][number]>) {
    setOutput((current) => ({
      ...current,
      slides: current.slides.map((item, index) => (index === activeSlideIndex ? { ...item, ...partial } : item)),
    }));
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveError(null);
    const result = await saveMaterialAction(materialId, { title: output.title, outputData: output });
    if ("error" in result) {
      setSaveState("error");
      setSaveError(result.error);
      return;
    }
    setSaveState("saved");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-chart-4/40 bg-chart-4/10 p-3 text-sm text-foreground/90">
        {AI_DISCLAIMER}
      </div>

      {output.warnings.length > 0 ? (
        <ul className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          {output.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {warning}
            </li>
          ))}
        </ul>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Título da apresentação</span>
        <Input
          value={output.title}
          onChange={(event) => setOutput((current) => ({ ...current, title: event.target.value }))}
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={activeSlideIndex === 0}
          onClick={() => setActiveSlideIndex((index) => index - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden />
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Slide {activeSlideIndex + 1} de {output.slides.length}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={activeSlideIndex === output.slides.length - 1}
          onClick={() => setActiveSlideIndex((index) => index + 1)}
        >
          Próximo
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 py-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Título do slide</span>
            <Input value={slide.title} onChange={(event) => updateSlide({ title: event.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Conteúdo (um tópico por linha)</span>
            <textarea
              value={slide.studentContent.join("\n")}
              onChange={(event) =>
                updateSlide({ studentContent: event.target.value.split("\n").filter((line) => line.trim() !== "") })
              }
              rows={5}
              className={textareaClassName}
            />
          </label>
          {slide.example ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Exemplo: </span>
              {slide.example}
            </p>
          ) : null}
          {slide.teacherNotes ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Notas do professor
              </span>
              <textarea
                value={slide.teacherNotes}
                onChange={(event) => updateSlide({ teacherNotes: event.target.value })}
                rows={2}
                className={textareaClassName}
              />
            </label>
          ) : null}
        </CardContent>
      </Card>

      {output.closingActivity ? (
        <Card>
          <CardHeader>
            <CardTitle>Atividade de fechamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/90">{output.closingActivity}</p>
          </CardContent>
        </Card>
      ) : null}

      {output.references.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Referências</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {output.references.map((reference) => (
              <Badge key={reference.id} variant="outline" className="font-normal">
                {reference.title}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {saveState === "saved" ? (
          <>
            <span className="flex items-center gap-1.5 text-sm font-medium text-chart-2">
              <CheckCircle2 className="size-4" aria-hidden />
              Salvo em Meus materiais
            </span>
            <Link href="/professor/docente-iah/materiais" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
              Ver Meus materiais
            </Link>
          </>
        ) : (
          <Button type="button" onClick={handleSave} disabled={saveState === "saving"}>
            <Save className="size-4" aria-hidden />
            {saveState === "saving" ? "Salvando…" : "Salvar em Meus materiais"}
          </Button>
        )}
      </div>
      {saveState === "error" && saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
    </div>
  );
}
