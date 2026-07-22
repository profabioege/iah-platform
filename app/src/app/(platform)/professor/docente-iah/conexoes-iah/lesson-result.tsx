"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Save } from "lucide-react";

import type { CorrelatedLessonContent } from "@/modules/conexoes-iah";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { saveLessonDraftAction } from "./actions";
import { ReferenceList } from "./reference-list";

const textareaClassName =
  "w-full resize-y rounded-lg border border-input bg-background/60 p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30";

export const AI_DISCLAIMER =
  "Esta aula foi produzida com apoio de Inteligência Artificial. Revise conceitos, referências e adequação à sua turma antes de utilizá-la.";

/** Resultado editável da Aula de laboratório correlacionada — título e pergunta norteadora editáveis, demais campos revisáveis. */
export function LessonResult({
  connectionId,
  materialId,
  initialLesson,
}: {
  connectionId: string;
  materialId: string;
  initialLesson: CorrelatedLessonContent;
}) {
  const [lesson, setLesson] = React.useState(initialLesson);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = React.useState<string | null>(null);

  async function handleSave() {
    setSaveState("saving");
    setSaveError(null);
    const result = await saveLessonDraftAction(connectionId, materialId, {
      title: lesson.title,
      guidingQuestion: lesson.guidingQuestion,
      lesson,
    });
    if ("error" in result) {
      setSaveState("error");
      setSaveError(result.error);
      return;
    }
    setSaveState("saved");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-chart-4/40 bg-chart-4/10 p-3 text-sm text-foreground/90">{AI_DISCLAIMER}</div>

      {lesson.warnings.length > 0 ? (
        <ul className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          {lesson.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Título da aula</span>
        <Input value={lesson.title} onChange={(e) => setLesson((c) => ({ ...c, title: e.target.value }))} />
      </label>

      <Card>
        <CardContent className="flex flex-col gap-3 py-2 text-sm">
          <InfoRow label="Disciplina e conteúdo de origem" value={lesson.sourceDisciplineAndTopic} />
          <InfoRow label="Conexão com IA & Humanidades" value={lesson.connectionWithIah} />
          <InfoRow label="Justificativa pedagógica" value={lesson.pedagogicalRationale} />
        </CardContent>
      </Card>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pergunta norteadora</span>
        <textarea
          value={lesson.guidingQuestion}
          onChange={(e) => setLesson((c) => ({ ...c, guidingQuestion: e.target.value }))}
          rows={2}
          className={textareaClassName}
        />
      </label>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Objetivos e conceitos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 py-0 text-sm">
          <ListSection title="Objetivos de aprendizagem" items={lesson.learningObjectives} />
          <TagSection title="Conceitos essenciais" items={lesson.essentialConcepts} />
          <ListSection title="Conhecimentos prévios" items={lesson.priorKnowledge} />
          <InfoRow label="Duração" value={`${lesson.durationMinutes} minutos`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Estrutura da aula</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 py-0 text-sm">
          <InfoRow label="Mobilização inicial" value={lesson.initialMobilization} />
          <InfoRow label="Contextualização" value={lesson.contextualization} />
          <InfoRow label="Investigação ou experimento" value={lesson.investigationOrExperiment} />
          <InfoRow label="Produção dos alunos" value={lesson.studentProduction} />
          <InfoRow label="Socialização" value={lesson.socialization} />
          <InfoRow label="Síntese" value={lesson.synthesis} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Avaliação e apoio ao professor</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 py-0 text-sm">
          <ListSection title="Critérios de avaliação" items={lesson.assessmentCriteria} />
          <TagSection title="Materiais necessários" items={lesson.requiredMaterials} />
          <InfoRow label="Orientações ao professor" value={lesson.teacherGuidance} />
          <ListSection title="Possíveis dificuldades" items={lesson.possibleDifficulties} />
          {lesson.interdisciplinaryExtensions.length > 0 ? (
            <ListSection title="Possibilidades de extensão interdisciplinar" items={lesson.interdisciplinaryExtensions} />
          ) : null}
        </CardContent>
      </Card>

      {lesson.references.length > 0 ? (
        <details className="rounded-lg border border-border px-3 py-2 text-sm">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Ver referências utilizadas</summary>
          <ReferenceList references={lesson.references} />
        </details>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {saveState === "saved" ? (
          <>
            <span className="flex items-center gap-1.5 text-sm font-medium text-chart-2">
              <CheckCircle2 className="size-4" aria-hidden />
              Salvo como rascunho em Meus materiais
            </span>
            <Link href="/professor/docente-iah/materiais" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
              Ver Meus materiais
            </Link>
          </>
        ) : (
          <Button type="button" onClick={handleSave} disabled={saveState === "saving"}>
            <Save className="size-4" aria-hidden />
            {saveState === "saving" ? "Salvando…" : "Salvar como rascunho"}
          </Button>
        )}
      </div>
      {saveState === "error" && saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p className="text-foreground/90">{value}</p>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-foreground/90">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function TagSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="outline" className="font-normal">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}
