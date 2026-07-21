"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Sparkles } from "lucide-react";

import {
  DETAIL_LEVEL_LABEL,
  DETAIL_LEVELS,
  EDUCATION_LEVEL_LABEL,
  EDUCATION_LEVELS,
  METHODOLOGIES,
  METHODOLOGY_DESCRIPTION,
  METHODOLOGY_LABEL,
  type DocentiahSlidesGenerationInput,
  type DocentiahSlidesGenerationOutput,
} from "@/lib/ai/prompts/docentiah/slides";
import type { GeneratedMaterial } from "@/modules/docentiah";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// Reaproveita a moldura de etapa, o progresso e a navegação já
// construídos para o Montador de Aula/Mission Flow/Avaliação —
// mesmo padrão de wizard do produto, sem duplicar componente.
import { MissionNavigation } from "@/app/(platform)/missoes/[id]/mission-flow/mission-navigation";
import { ProgressIndicator } from "@/app/(platform)/missoes/[id]/mission-flow/progress-indicator";
import { LessonStep } from "../../aulas/[id]/lesson-step";

import { generateSlidesAction } from "./actions";
import { GenerationProgress } from "./generation-progress";
import { ImproveWithAiButton } from "./improve-with-ai-button";
import { PdfAttachment, type PdfAttachmentValue } from "./pdf-attachment";
import { SlidesResult } from "./slides-result";
import { ThemePicker } from "./theme-picker";
import { VoiceDictationButton } from "./voice-dictation-button";

const TOTAL_STEPS = 5;
const DURATION_OPTIONS = [45, 50, 90] as const;

interface SlidesDraft {
  subject: string;
  educationLevel: DocentiahSlidesGenerationInput["educationLevel"] | "";
  grade: string;
  topic: string;
  lessonDurationMinutes: number;
  customDuration: boolean;
  slideCount: number;
  learningObjectives: string;
  methodology: DocentiahSlidesGenerationInput["methodology"] | "";
  detailLevel: DocentiahSlidesGenerationInput["detailLevel"];
  studentProfile: string;
  additionalContext: string;
  webSearchEnabled: boolean;
  visualTheme: DocentiahSlidesGenerationInput["visualTheme"];
  includeClosingActivity: boolean;
  includeTeacherNotes: boolean;
  includeReferences: boolean;
}

function createEmptyDraft(defaultSubjectName: string | null): SlidesDraft {
  return {
    subject: defaultSubjectName ?? "",
    educationLevel: "",
    grade: "",
    topic: "",
    lessonDurationMinutes: 50,
    customDuration: false,
    slideCount: 10,
    learningObjectives: "",
    methodology: "",
    detailLevel: "equilibrado",
    studentProfile: "",
    additionalContext: "",
    webSearchEnabled: false,
    visualTheme: "essencial",
    includeClosingActivity: true,
    includeTeacherNotes: true,
    includeReferences: true,
  };
}

type WizardStatus = "form" | "generating" | "success" | "error";

/**
 * Wizard de Apresentação de slides do DocentIAH (D-047) — 5 etapas
 * curtas e progressivas. Mesmo padrão de `professor/docente-iah/avaliacao`:
 * `useState` local (sem repositório até a geração), `LessonStep`/
 * `MissionNavigation`/`ProgressIndicator` reaproveitados.
 */
export function SlidesWizard({ defaultSubjectName }: { defaultSubjectName: string | null }) {
  const [draft, setDraft] = React.useState<SlidesDraft>(() => createEmptyDraft(defaultSubjectName));
  const [step, setStep] = React.useState(1);
  const [pdfAttachment, setPdfAttachment] = React.useState<PdfAttachmentValue | null>(null);
  const [status, setStatus] = React.useState<WizardStatus>("form");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ material: GeneratedMaterial; output: DocentiahSlidesGenerationOutput } | null>(null);
  const cancelledRef = React.useRef(false);

  const goTo = (next: number) => setStep(Math.min(TOTAL_STEPS, Math.max(1, next)));

  function update(partial: Partial<SlidesDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  const step1Complete =
    draft.subject.trim() !== "" &&
    draft.educationLevel !== "" &&
    draft.grade.trim() !== "" &&
    draft.topic.trim() !== "" &&
    draft.lessonDurationMinutes > 0 &&
    draft.slideCount >= 5 &&
    draft.slideCount <= 30;

  async function handleGenerate() {
    if (!step1Complete || draft.educationLevel === "") return;
    cancelledRef.current = false;
    setStatus("generating");
    setErrorMessage(null);

    const input: DocentiahSlidesGenerationInput = {
      subject: draft.subject,
      educationLevel: draft.educationLevel,
      grade: draft.grade,
      topic: draft.topic,
      lessonDurationMinutes: draft.lessonDurationMinutes,
      slideCount: draft.slideCount,
      learningObjectives: draft.learningObjectives || undefined,
      methodology: draft.methodology || undefined,
      language: "pt-BR",
      detailLevel: draft.detailLevel,
      studentProfile: draft.studentProfile || undefined,
      additionalContext: draft.additionalContext || undefined,
      webSearchEnabled: draft.webSearchEnabled,
      visualTheme: draft.visualTheme,
      includeClosingActivity: draft.includeClosingActivity,
      includeTeacherNotes: draft.includeTeacherNotes,
      includeReferences: draft.includeReferences,
    };

    const response = await generateSlidesAction({
      input,
      webSearchEnabled: draft.webSearchEnabled,
      pdfContext: pdfAttachment
        ? { text: pdfAttachment.extraction.text, truncated: pdfAttachment.extraction.truncated, extraction: pdfAttachment.extraction }
        : null,
    });

    if (cancelledRef.current) return;

    if ("error" in response) {
      setStatus("error");
      setErrorMessage(response.error);
      return;
    }
    setResult(response);
    setStatus("success");
  }

  function handleCancelGeneration() {
    cancelledRef.current = true;
    setStatus("form");
  }

  function handleRetry() {
    setStatus("form");
    setErrorMessage(null);
  }

  if (status === "generating") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <WizardHeader step={TOTAL_STEPS} />
        <GenerationProgress />
        <Button type="button" variant="ghost" onClick={handleCancelGeneration} className="w-fit">
          Cancelar
        </Button>
      </div>
    );
  }

  if (status === "success" && result) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link
          href="/professor/docente-iah"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          DocentIAH
        </Link>
        <SlidesResult materialId={result.material.id} initialOutput={result.output} />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <WizardHeader step={TOTAL_STEPS} />
        <Card>
          <CardContent className="flex flex-col gap-3 py-2">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <div className="flex gap-2">
              <Button type="button" onClick={handleRetry}>
                <RotateCcw className="size-4" aria-hidden />
                Tentar novamente
              </Button>
              <Button type="button" variant="ghost" onClick={() => setStatus("form")}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <WizardHeader step={step} />

      {step === 1 && (
        <LessonStep
          eyebrow="Apresentação de slides"
          title="Contexto da aula"
          description="A base para a apresentação — disciplina, nível, tema e duração."
        >
          <div className="flex flex-col gap-4">
            <Field label="Disciplina">
              <Input value={draft.subject} onChange={(e) => update({ subject: e.target.value })} placeholder="ex.: Inteligência Artificial & Humanidades" />
            </Field>
            <Field label="Nível">
              <select
                value={draft.educationLevel}
                onChange={(e) => update({ educationLevel: e.target.value as SlidesDraft["educationLevel"] })}
                className={selectClassName}
              >
                <option value="">Selecione o nível</option>
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {EDUCATION_LEVEL_LABEL[level]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ano ou série">
              <Input value={draft.grade} onChange={(e) => update({ grade: e.target.value })} placeholder="ex.: 2º ano E.M." />
            </Field>
            <Field label="Tema ou assunto">
              <Input
                value={draft.topic}
                onChange={(e) => update({ topic: e.target.value.slice(0, 160) })}
                placeholder="ex.: Desinformação e verificação de fontes"
              />
              <span className="text-[11px] text-muted-foreground">{draft.topic.length}/160</span>
            </Field>
            <Field label="Duração da aula">
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((minutes) => (
                  <button key={minutes} type="button" onClick={() => update({ lessonDurationMinutes: minutes, customDuration: false })}>
                    <Badge
                      variant={!draft.customDuration && draft.lessonDurationMinutes === minutes ? undefined : "outline"}
                      className={
                        !draft.customDuration && draft.lessonDurationMinutes === minutes
                          ? "cursor-pointer bg-primary py-1.5 text-sm font-normal text-primary-foreground"
                          : "cursor-pointer py-1.5 text-sm font-normal"
                      }
                    >
                      {minutes} min
                    </Badge>
                  </button>
                ))}
                <button type="button" onClick={() => update({ customDuration: true })}>
                  <Badge
                    variant={draft.customDuration ? undefined : "outline"}
                    className={
                      draft.customDuration
                        ? "cursor-pointer bg-primary py-1.5 text-sm font-normal text-primary-foreground"
                        : "cursor-pointer py-1.5 text-sm font-normal"
                    }
                  >
                    Personalizado
                  </Badge>
                </button>
              </div>
              {draft.customDuration ? (
                <Input
                  type="number"
                  min={10}
                  max={240}
                  value={draft.lessonDurationMinutes}
                  onChange={(e) => update({ lessonDurationMinutes: Number(e.target.value) || 0 })}
                  className="mt-2 w-32"
                />
              ) : null}
            </Field>
            <Field label="Quantidade de slides (5 a 30)">
              <Input
                type="number"
                min={5}
                max={30}
                value={draft.slideCount}
                onChange={(e) => update({ slideCount: Number(e.target.value) || 0 })}
                className="w-32"
              />
            </Field>
          </div>
          <MissionNavigation onNext={() => goTo(2)} nextDisabled={!step1Complete} hideBack />
        </LessonStep>
      )}

      {step === 2 && (
        <LessonStep eyebrow="Apresentação de slides" title="Como ensinar" description="Opcional — ajuda a apresentação a soar como a sua aula.">
          <div className="flex flex-col gap-4">
            <Field label="Objetivos de aprendizagem (opcional)">
              <textarea
                value={draft.learningObjectives}
                onChange={(e) => update({ learningObjectives: e.target.value })}
                rows={3}
                placeholder="ex.: Reconhecer critérios de verificação de fontes"
                className={textareaClassName}
              />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Metodologia (opcional)</span>
              <select
                value={draft.methodology}
                onChange={(e) => update({ methodology: (e.target.value || "") as SlidesDraft["methodology"] })}
                className={selectClassName}
              >
                <option value="">Sem metodologia específica</option>
                {METHODOLOGIES.map((methodology) => (
                  <option key={methodology} value={methodology}>
                    {METHODOLOGY_LABEL[methodology]}
                  </option>
                ))}
              </select>
              {draft.methodology ? (
                <p className="text-xs text-muted-foreground">{METHODOLOGY_DESCRIPTION[draft.methodology]}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Nível de detalhamento</span>
              <div className="flex flex-wrap gap-2">
                {DETAIL_LEVELS.map((level) => (
                  <button key={level} type="button" onClick={() => update({ detailLevel: level })}>
                    <Badge
                      variant={draft.detailLevel === level ? undefined : "outline"}
                      className={
                        draft.detailLevel === level
                          ? "cursor-pointer bg-primary py-1.5 text-sm font-normal text-primary-foreground"
                          : "cursor-pointer py-1.5 text-sm font-normal"
                      }
                    >
                      {DETAIL_LEVEL_LABEL[level]}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
            <Field label="Contexto da turma (opcional)">
              <textarea
                value={draft.studentProfile}
                onChange={(e) => update({ studentProfile: e.target.value })}
                rows={2}
                placeholder="ex.: Turma heterogênea, primeiro contato com o tema"
                className={textareaClassName}
              />
            </Field>
          </div>
          <MissionNavigation onBack={() => goTo(1)} onNext={() => goTo(3)} />
        </LessonStep>
      )}

      {step === 3 && (
        <LessonStep eyebrow="Apresentação de slides" title="Fontes e contexto" description="Opcional — detalhes, ditado por voz, busca na web e um PDF de apoio.">
          <div className="flex flex-col gap-4">
            <Field label="Detalhes adicionais ou contexto (opcional)">
              <textarea
                value={draft.additionalContext}
                onChange={(e) => update({ additionalContext: e.target.value.slice(0, 4000) })}
                rows={4}
                placeholder="Qualquer detalhe que ajude a IA a entender melhor sua aula"
                className={textareaClassName}
              />
              <span className="text-[11px] text-muted-foreground">{draft.additionalContext.length}/4000</span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <VoiceDictationButton
                  onAppend={(text) =>
                    update({
                      additionalContext: (draft.additionalContext ? `${draft.additionalContext} ` : "") + text,
                    })
                  }
                />
                <ImproveWithAiButton text={draft.additionalContext} onAccept={(text) => update({ additionalContext: text })} />
              </div>
            </Field>

            <label
              className={
                draft.webSearchEnabled
                  ? "flex cursor-pointer items-start gap-3 rounded-lg border border-primary/60 bg-primary/10 px-4 py-3 text-sm transition-colors"
                  : "flex cursor-pointer items-start gap-3 rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
              }
            >
              <input
                type="checkbox"
                className="mt-0.5 accent-primary"
                checked={draft.webSearchEnabled}
                onChange={(e) => update({ webSearchEnabled: e.target.checked })}
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">Buscar na web</span>
                <span className="text-xs text-muted-foreground">
                  Use a busca na web para temas atuais, dados recentes ou acontecimentos em andamento.
                </span>
              </span>
            </label>

            <PdfAttachment value={pdfAttachment} onChange={setPdfAttachment} />
          </div>
          <MissionNavigation onBack={() => goTo(2)} onNext={() => goTo(4)} />
        </LessonStep>
      )}

      {step === 4 && (
        <LessonStep eyebrow="Apresentação de slides" title="Aparência" description="A escolha do tema muda a apresentação visual, nunca o rigor do conteúdo.">
          <ThemePicker value={draft.visualTheme} onChange={(themeId) => update({ visualTheme: themeId as SlidesDraft["visualTheme"] })} />
          <MissionNavigation onBack={() => goTo(3)} onNext={() => goTo(5)} />
        </LessonStep>
      )}

      {step === 5 && (
        <LessonStep eyebrow="Apresentação de slides" title="Revisar e gerar" description="Confira as escolhas antes de gerar a apresentação.">
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 py-2 text-sm sm:grid-cols-3">
                <SummaryField label="Disciplina" value={draft.subject} />
                <SummaryField label="Nível" value={draft.educationLevel ? EDUCATION_LEVEL_LABEL[draft.educationLevel] : "—"} />
                <SummaryField label="Série" value={draft.grade} />
                <SummaryField label="Tema" value={draft.topic} />
                <SummaryField label="Duração" value={`${draft.lessonDurationMinutes} min`} />
                <SummaryField label="Slides" value={String(draft.slideCount)} />
                <SummaryField label="Metodologia" value={draft.methodology ? METHODOLOGY_LABEL[draft.methodology] : "Não definida"} />
                <SummaryField label="Detalhamento" value={DETAIL_LEVEL_LABEL[draft.detailLevel]} />
                <SummaryField label="Tema visual" value={draft.visualTheme} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-2 py-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Contexto que será usado
                </p>
                <p className="text-muted-foreground">
                  {draft.additionalContext ? "Detalhes adicionais informados." : "Nenhum detalhe adicional."}
                  {" · "}
                  Busca na web: {draft.webSearchEnabled ? "ativada" : "desativada"}.
                  {" · "}
                  PDF anexado: {pdfAttachment ? pdfAttachment.fileName : "nenhum"}.
                </p>
              </CardContent>
            </Card>

            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Esta geração utilizará 1 geração do DocentIAH.
            </div>
            <div className="rounded-lg border border-chart-4/40 bg-chart-4/10 px-3 py-2 text-sm text-foreground/90">
              Este material será produzido com apoio de Inteligência Artificial. Revise conceitos, referências,
              linguagem e adequação à sua turma antes de utilizá-lo.
            </div>

            <Button type="button" size="lg" onClick={handleGenerate} disabled={!step1Complete} className="w-fit">
              <Sparkles className="size-4" aria-hidden />
              Gerar apresentação
            </Button>
          </div>
          <MissionNavigation onBack={() => goTo(4)} hideNext />
        </LessonStep>
      )}
    </div>
  );
}

function WizardHeader({ step }: { step: number }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/professor/docente-iah"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          DocentIAH
        </Link>
        <Badge className="bg-primary/15 text-primary">Apresentação de slides</Badge>
      </div>
      <ProgressIndicator current={step} total={TOTAL_STEPS} />
    </div>
  );
}

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const textareaClassName =
  "w-full resize-y rounded-lg border border-input bg-background/60 p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground/90">{value || "—"}</dd>
    </div>
  );
}
