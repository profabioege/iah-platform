"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, FlaskConical, RotateCcw, Sparkles } from "lucide-react";

import {
  CATALOG_DISCIPLINES,
  EDUCATION_LEVEL_LABEL,
  EDUCATION_LEVELS,
  GRADE_OPTIONS,
  IAH_AXES,
  getIahAxisById,
  type CorrelatedLessonContent,
  type CurriculumConnection,
  type EducationLevel,
  type IdentifiedContextSnapshot,
  type KnowledgeReference,
  type SelectedConnection,
} from "@/modules/conexoes-iah";
import type { GeneratedMaterial } from "@/modules/docentiah";
import type { Classroom } from "@/modules/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MissionNavigation } from "@/app/(platform)/missoes/[id]/mission-flow/mission-navigation";
import { ProgressIndicator } from "@/app/(platform)/missoes/[id]/mission-flow/progress-indicator";
import { LessonStep } from "../../aulas/[id]/lesson-step";

import { generateLessonAction, identifyContextAction, listTopicsAction, suggestConnectionsAction } from "./actions";
import { LessonResult } from "./lesson-result";
import { ReferenceList } from "./reference-list";

const TOTAL_STEPS = 5;
const INITIAL_CONNECTIONS_SHOWN = 3;
const MAX_CONNECTIONS_SHOWN = 7;
const MAX_SELECTED_CONNECTIONS = 2;

type AsyncPhase = "idle" | "loading" | "loaded" | "error";

interface ConexoesDraft {
  classroomId: string;
  disciplineSlug: string;
  educationLevel: EducationLevel | "";
  grade: string;
  academicPeriod: string;
  topicOption: string;
  showCustomTopic: boolean;
  customTopic: string;
  concept: string;
}

function createEmptyDraft(): ConexoesDraft {
  return {
    classroomId: "",
    disciplineSlug: "",
    educationLevel: "",
    grade: "",
    academicPeriod: "",
    topicOption: "",
    showCustomTopic: false,
    customTopic: "",
    concept: "",
  };
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.7) return "alta";
  if (confidence >= 0.4) return "média";
  return "baixa";
}

/**
 * Wizard de Conexões IAH — 5 etapas curtas, mesmo padrão de
 * `apresentacao-slides/slides-wizard.tsx`. Nada é persistido até a
 * Etapa 5 gerar a aula; a partir daí, `LessonResult` cuida da edição
 * e do "Salvar como rascunho".
 */
export function ConexoesWizard({ classrooms }: { classrooms: Classroom[] }) {
  const [draft, setDraft] = React.useState<ConexoesDraft>(createEmptyDraft);
  const [step, setStep] = React.useState(1);

  const [topics, setTopics] = React.useState<{ id: string; topic: string }[]>([]);
  const [topicsPhase, setTopicsPhase] = React.useState<AsyncPhase>("idle");

  const [contextPhase, setContextPhase] = React.useState<AsyncPhase>("idle");
  const [contextError, setContextError] = React.useState<string | null>(null);
  const [context, setContext] = React.useState<IdentifiedContextSnapshot | null>(null);
  const [contextReferences, setContextReferences] = React.useState<KnowledgeReference[]>([]);
  const [refineTerm, setRefineTerm] = React.useState("");

  const [connectionsPhase, setConnectionsPhase] = React.useState<AsyncPhase>("idle");
  const [connectionsError, setConnectionsError] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<SelectedConnection[]>([]);
  const [connectionReferences, setConnectionReferences] = React.useState<KnowledgeReference[]>([]);
  const [expandedConnections, setExpandedConnections] = React.useState(false);
  const [selectedConnections, setSelectedConnections] = React.useState<SelectedConnection[]>([]);
  const [writingCustom, setWritingCustom] = React.useState(false);

  const [lessonPhase, setLessonPhase] = React.useState<AsyncPhase>("idle");
  const [lessonError, setLessonError] = React.useState<string | null>(null);
  const [lessonResult, setLessonResult] = React.useState<{
    connection: CurriculumConnection;
    material: GeneratedMaterial;
    lesson: CorrelatedLessonContent;
  } | null>(null);

  function update(partial: Partial<ConexoesDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  const goTo = (next: number) => setStep(Math.min(TOTAL_STEPS, Math.max(1, next)));

  const catalogReady = draft.disciplineSlug !== "" && draft.educationLevel !== "" && draft.grade !== "";

  React.useEffect(() => {
    if (!catalogReady) {
      setTopics([]);
      return;
    }
    let cancelled = false;
    setTopicsPhase("loading");
    listTopicsAction(draft.disciplineSlug, draft.educationLevel as EducationLevel, draft.grade).then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setTopics([]);
        setTopicsPhase("error");
        return;
      }
      setTopics(result.topics);
      setTopicsPhase("loaded");
    });
    return () => {
      cancelled = true;
    };
  }, [catalogReady, draft.disciplineSlug, draft.educationLevel, draft.grade]);

  const step1Complete =
    catalogReady && (draft.topicOption !== "" || draft.customTopic.trim() !== "" || draft.concept.trim() !== "");

  function resolveTermAndTopic() {
    const term = draft.concept.trim() || draft.customTopic.trim() || draft.topicOption;
    const sourceTopic = draft.customTopic.trim() || draft.topicOption || draft.concept.trim();
    const sourceConcept = draft.concept.trim() || null;
    return { term, sourceTopic, sourceConcept };
  }

  async function runIdentify(term: string) {
    setContextPhase("loading");
    setContextError(null);
    const result = await identifyContextAction({
      term,
      disciplineSlug: draft.disciplineSlug,
      educationLevel: draft.educationLevel as EducationLevel,
      grade: draft.grade,
    });
    if ("error" in result) {
      setContextPhase("error");
      setContextError(result.error);
      return;
    }
    setContext(result.context);
    setContextReferences(result.references);
    setContextPhase("loaded");
  }

  async function handleContinueFromStep1() {
    if (!step1Complete || draft.educationLevel === "") return;
    const { term } = resolveTermAndTopic();
    setRefineTerm(term);
    goTo(2);
    await runIdentify(term);
  }

  async function handleContinueFromStep2() {
    if (!context) return;
    setConnectionsPhase("loading");
    setConnectionsError(null);
    setExpandedConnections(false);
    setSelectedConnections([]);
    goTo(3);
    const result = await suggestConnectionsAction(context, MAX_CONNECTIONS_SHOWN);
    if ("error" in result) {
      setConnectionsPhase("error");
      setConnectionsError(result.error);
      return;
    }
    setSuggestions(result.connections);
    setConnectionReferences(result.references);
    setConnectionsPhase("loaded");
  }

  function toggleSelect(connection: SelectedConnection) {
    setSelectedConnections((current) => {
      const already = current.some((c) => c.sourceConnectionEntryId === connection.sourceConnectionEntryId);
      if (already) return current.filter((c) => c.sourceConnectionEntryId !== connection.sourceConnectionEntryId);
      if (current.length >= MAX_SELECTED_CONNECTIONS) return current;
      return [...current, { ...connection }];
    });
  }

  function updateSelected(index: number, partial: Partial<SelectedConnection>) {
    setSelectedConnections((current) => current.map((item, i) => (i === index ? { ...item, ...partial } : item)));
  }

  function discardSelected(index: number) {
    setSelectedConnections((current) => current.filter((_, i) => i !== index));
  }

  function addCustomConnection(title: string, rationale: string, iahAxisId: string) {
    if (selectedConnections.length >= MAX_SELECTED_CONNECTIONS) return;
    setSelectedConnections((current) => [
      ...current,
      {
        sourceConnectionEntryId: null,
        title,
        rationale,
        investigativeQuestion: rationale,
        iahAxisId,
        pedagogicalApproach: "",
        referenceIds: [],
        confidence: 0.3,
        custom: true,
      },
    ]);
    setWritingCustom(false);
  }

  async function handleGenerateLesson() {
    if (!context || selectedConnections.length === 0) return;
    const { sourceTopic, sourceConcept } = resolveTermAndTopic();
    setLessonPhase("loading");
    setLessonError(null);
    const result = await generateLessonAction({
      classroomId: draft.classroomId || null,
      disciplineSlug: draft.disciplineSlug,
      educationLevel: draft.educationLevel as EducationLevel,
      grade: draft.grade,
      academicPeriod: draft.academicPeriod.trim() || null,
      sourceTopic,
      sourceConcept,
      context,
      selectedConnections,
      guidingQuestion: "",
    });
    if ("error" in result) {
      setLessonPhase("error");
      setLessonError(result.error);
      return;
    }
    setLessonResult(result);
    setLessonPhase("loaded");
  }

  React.useEffect(() => {
    if (step === 5 && lessonPhase === "idle") {
      void handleGenerateLesson();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <WizardHeader step={step} />

      {step === 1 && (
        <LessonStep eyebrow="Conexões IAH" title="O que sua turma está estudando?" description="Escolha a disciplina e a série para ver temas sugeridos, ou já digite um conceito específico.">
          <div className="flex flex-col gap-4">
            <Field label="Disciplina de origem">
              <select
                value={draft.disciplineSlug}
                onChange={(e) => update({ disciplineSlug: e.target.value, topicOption: "", showCustomTopic: false, customTopic: "" })}
                className={selectClassName}
              >
                <option value="">Selecione a disciplina</option>
                {CATALOG_DISCIPLINES.map((discipline) => (
                  <option key={discipline.slug} value={discipline.slug}>
                    {discipline.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Etapa de ensino">
              <select
                value={draft.educationLevel}
                onChange={(e) =>
                  update({ educationLevel: e.target.value as EducationLevel, grade: "", topicOption: "", showCustomTopic: false, customTopic: "" })
                }
                className={selectClassName}
              >
                <option value="">Selecione a etapa</option>
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {EDUCATION_LEVEL_LABEL[level]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ano ou série">
              <select
                value={draft.grade}
                onChange={(e) => update({ grade: e.target.value, topicOption: "", showCustomTopic: false, customTopic: "" })}
                className={selectClassName}
                disabled={draft.educationLevel === ""}
              >
                <option value="">Selecione a série</option>
                {(draft.educationLevel ? GRADE_OPTIONS[draft.educationLevel] : []).map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </Field>

            {catalogReady ? (
              <Field label="Temas relevantes">
                {topicsPhase === "loading" ? (
                  <p className="text-xs text-muted-foreground">Buscando temas…</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topic) => (
                      <button key={topic.id} type="button" onClick={() => update({ topicOption: topic.topic, showCustomTopic: false, customTopic: "" })}>
                        <Badge
                          variant={draft.topicOption === topic.topic ? undefined : "outline"}
                          className={
                            draft.topicOption === topic.topic
                              ? "cursor-pointer bg-primary py-1.5 text-sm font-normal text-primary-foreground"
                              : "cursor-pointer py-1.5 text-sm font-normal"
                          }
                        >
                          {topic.topic}
                        </Badge>
                      </button>
                    ))}
                    <button type="button" onClick={() => update({ showCustomTopic: true, topicOption: "" })}>
                      <Badge
                        variant={draft.showCustomTopic ? undefined : "outline"}
                        className={
                          draft.showCustomTopic
                            ? "cursor-pointer bg-primary py-1.5 text-sm font-normal text-primary-foreground"
                            : "cursor-pointer py-1.5 text-sm font-normal"
                        }
                      >
                        Outro tema
                      </Badge>
                    </button>
                  </div>
                )}
                {draft.showCustomTopic ? (
                  <Input
                    value={draft.customTopic}
                    onChange={(e) => update({ customTopic: e.target.value })}
                    placeholder="Digite o tema"
                    className="mt-2"
                  />
                ) : null}
              </Field>
            ) : null}

            <Field label="Ou já sabe o conceito específico? (opcional)">
              <Input
                value={draft.concept}
                onChange={(e) => update({ concept: e.target.value })}
                placeholder="ex.: mais-valia, seleção natural, fake news"
              />
            </Field>

            <details className="rounded-lg border border-border px-3 py-2 text-sm">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Detalhes opcionais</summary>
              <div className="mt-3 flex flex-col gap-3">
                <Field label="Turma (opcional)">
                  <select value={draft.classroomId} onChange={(e) => update({ classroomId: e.target.value })} className={selectClassName}>
                    <option value="">Nenhuma turma específica</option>
                    {classrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name}
                        {classroom.grade ? ` (${classroom.grade})` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Período letivo (opcional)">
                  <Input value={draft.academicPeriod} onChange={(e) => update({ academicPeriod: e.target.value })} placeholder="ex.: 1º bimestre" />
                </Field>
              </div>
            </details>
          </div>
          <MissionNavigation onNext={handleContinueFromStep1} nextDisabled={!step1Complete} hideBack />
        </LessonStep>
      )}

      {step === 2 && (
        <LessonStep eyebrow="Conexões IAH" title="Contexto identificado" description="Nunca inventado — revisado a partir do catálogo curricular e conceitual.">
          {contextPhase === "loading" ? <LoadingCard text="Identificando o contexto…" /> : null}
          {contextPhase === "error" ? (
            <ErrorCard message={contextError} onRetry={() => runIdentify(refineTerm)} onCancel={() => goTo(1)} />
          ) : null}
          {contextPhase === "loaded" && context ? (
            <div className="flex flex-col gap-4">
              <Card>
                <CardContent className="flex flex-col gap-2 py-3">
                  <h2 className="text-lg font-semibold">{context.term}</h2>
                  <p className="text-sm text-muted-foreground">
                    {[context.relatedAreas.join(" e "), context.curricularContext].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {context.associatedConcepts.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {context.associatedConcepts.map((concept) => (
                        <Badge key={concept} variant="outline" className="font-normal">
                          {concept}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  <span className="text-xs text-muted-foreground">Nível de confiança: {confidenceLabel(context.confidence)}</span>
                </CardContent>
              </Card>

              {context.ambiguousInterpretations.length > 0 ? (
                <Card>
                  <CardContent className="flex flex-col gap-2 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Isso pode se referir a:</p>
                    <div className="flex flex-wrap gap-2">
                      {context.ambiguousInterpretations.map((interpretation) => (
                        <button key={interpretation.label} type="button" onClick={() => runIdentify(interpretation.label)}>
                          <Badge variant="outline" className="cursor-pointer py-1.5 text-sm font-normal">
                            {interpretation.label} — {interpretation.description}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {!context.hasReliableMatch ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col gap-3 py-3">
                    <p className="text-sm text-muted-foreground">
                      Não encontramos uma correspondência curricular suficientemente segura. Você pode ajustar o termo ou acrescentar contexto.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input value={refineTerm} onChange={(e) => setRefineTerm(e.target.value)} className="max-w-xs" />
                      <Button type="button" size="sm" onClick={() => runIdentify(refineTerm)}>
                        Buscar novamente
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {contextReferences.length > 0 ? (
                <details className="rounded-lg border border-border px-3 py-2 text-sm">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Ver referências utilizadas</summary>
                  <ReferenceList references={contextReferences} />
                </details>
              ) : null}
            </div>
          ) : null}
          <MissionNavigation onBack={() => goTo(1)} onNext={handleContinueFromStep2} nextDisabled={contextPhase !== "loaded" || !context} />
        </LessonStep>
      )}

      {step === 3 && (
        <LessonStep eyebrow="Conexões IAH" title="Conexões com IA & Humanidades" description="Fundamentadas no catálogo — revise e escolha até duas.">
          {connectionsPhase === "loading" ? <LoadingCard text="Buscando conexões…" /> : null}
          {connectionsPhase === "error" ? (
            <ErrorCard message={connectionsError} onRetry={handleContinueFromStep2} onCancel={() => goTo(2)} />
          ) : null}
          {connectionsPhase === "loaded" ? (
            <div className="flex flex-col gap-4">
              {suggestions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-3 text-sm text-muted-foreground">
                    Não encontramos conexões curadas para este termo ainda. Escreva uma conexão própria abaixo.
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {suggestions.slice(0, expandedConnections ? MAX_CONNECTIONS_SHOWN : INITIAL_CONNECTIONS_SHOWN).map((connection) => {
                    const selected = selectedConnections.some((c) => c.sourceConnectionEntryId === connection.sourceConnectionEntryId);
                    const axis = getIahAxisById(connection.iahAxisId);
                    const refs = connectionReferences.filter((r) => connection.referenceIds.includes(r.id));
                    return (
                      <Card key={connection.sourceConnectionEntryId} className={selected ? "border-primary" : undefined}>
                        <CardContent className="flex flex-col gap-2 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-medium">{connection.title}</h3>
                            <Badge variant="outline" className="shrink-0 font-normal">
                              {axis?.name ?? connection.iahAxisId}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{connection.rationale}</p>
                          <p className="text-xs text-muted-foreground">
                            Abordagem sugerida: {connection.pedagogicalApproach}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">Confiança: {confidenceLabel(connection.confidence)}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant={selected ? "secondary" : "outline"}
                              disabled={!selected && selectedConnections.length >= MAX_SELECTED_CONNECTIONS}
                              onClick={() => toggleSelect(connection)}
                            >
                              {selected ? "Selecionada ✓" : "Selecionar"}
                            </Button>
                          </div>
                          {refs.length > 0 ? (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground">Ver referências utilizadas</summary>
                              <ReferenceList references={refs} />
                            </details>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                  {!expandedConnections && suggestions.length > INITIAL_CONNECTIONS_SHOWN ? (
                    <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setExpandedConnections(true)}>
                      Ver outras conexões
                    </Button>
                  ) : null}
                </div>
              )}

              {selectedConnections.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Conexões selecionadas</p>
                  {selectedConnections.map((connection, index) => (
                    <Card key={`${connection.sourceConnectionEntryId ?? "custom"}-${index}`}>
                      <CardContent className="flex flex-col gap-2 py-3">
                        <Input value={connection.title} onChange={(e) => updateSelected(index, { title: e.target.value })} />
                        <textarea
                          value={connection.rationale}
                          onChange={(e) => updateSelected(index, { rationale: e.target.value })}
                          rows={2}
                          className={textareaClassName}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <select
                            value={connection.iahAxisId}
                            onChange={(e) => updateSelected(index, { iahAxisId: e.target.value })}
                            className={selectClassName}
                          >
                            {IAH_AXES.map((axis) => (
                              <option key={axis.id} value={axis.id}>
                                {axis.name}
                              </option>
                            ))}
                          </select>
                          <Button type="button" variant="ghost" size="sm" onClick={() => discardSelected(index)}>
                            Descartar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : null}

              {selectedConnections.length < MAX_SELECTED_CONNECTIONS ? (
                writingCustom ? (
                  <CustomConnectionForm onCancel={() => setWritingCustom(false)} onSubmit={addCustomConnection} />
                ) : (
                  <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setWritingCustom(true)}>
                    Escrever uma conexão própria
                  </Button>
                )
              ) : null}
            </div>
          ) : null}
          <MissionNavigation onBack={() => goTo(2)} onNext={() => goTo(4)} nextDisabled={selectedConnections.length === 0} />
        </LessonStep>
      )}

      {step === 4 && (
        <LessonStep eyebrow="Conexões IAH" title="O que deseja criar?" description="No MVP, só a Aula de laboratório está disponível — as demais chegam em breve.">
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => goTo(5)} className="text-left">
              <Card className="border-primary transition-colors hover:bg-muted/40">
                <CardContent className="flex items-center gap-3 py-4">
                  <FlaskConical className="size-5 text-primary" aria-hidden />
                  <div>
                    <p className="font-medium">Aula de laboratório</p>
                    <p className="text-xs text-muted-foreground">Aula correlacionada, pronta para revisar e salvar.</p>
                  </div>
                </CardContent>
              </Card>
            </button>
            {["Missão investigativa", "Apresentação de slides", "Atividade", "Debate", "Estudo de caso"].map((label) => (
              <Card key={label} className="opacity-60">
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <p className="font-medium">{label}</p>
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    Em breve
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
          <MissionNavigation onBack={() => goTo(3)} hideNext />
        </LessonStep>
      )}

      {step === 5 && (
        <>
          {lessonPhase === "loading" || lessonPhase === "idle" ? (
            <LessonStep eyebrow="Conexões IAH" title="Criar aula de laboratório" description="Montando a aula correlacionada a partir das conexões selecionadas.">
              <LoadingCard text="Gerando aula de laboratório…" />
              <MissionNavigation onBack={() => goTo(4)} hideNext />
            </LessonStep>
          ) : null}
          {lessonPhase === "error" ? (
            <LessonStep eyebrow="Conexões IAH" title="Criar aula de laboratório" description="">
              <ErrorCard message={lessonError} onRetry={handleGenerateLesson} onCancel={() => goTo(4)} />
              <MissionNavigation onBack={() => goTo(4)} hideNext />
            </LessonStep>
          ) : null}
          {lessonPhase === "loaded" && lessonResult ? (
            <div className="flex flex-col gap-6">
              <Link href="/professor/docente-iah" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="size-3.5" aria-hidden />
                DocentIAH
              </Link>
              <LessonResult connectionId={lessonResult.connection.id} materialId={lessonResult.material.id} initialLesson={lessonResult.lesson} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function WizardHeader({ step }: { step: number }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/professor/docente-iah" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" />
          DocentIAH
        </Link>
        <Badge className="bg-primary/15 text-primary">Conexões IAH</Badge>
      </div>
      <ProgressIndicator current={step} total={TOTAL_STEPS} />
    </div>
  );
}

function LoadingCard({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Sparkles className="size-4 animate-pulse text-primary" aria-hidden />
        {text}
      </CardContent>
    </Card>
  );
}

function ErrorCard({ message, onRetry, onCancel }: { message: string | null; onRetry: () => void; onCancel: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <p className="text-sm text-destructive">{message}</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={onRetry}>
            <RotateCcw className="size-4" aria-hidden />
            Tentar novamente
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


function CustomConnectionForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (title: string, rationale: string, iahAxisId: string) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [rationale, setRationale] = React.useState("");
  const [axisId, setAxisId] = React.useState(IAH_AXES[0].id);

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da conexão" />
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={2}
          placeholder="Justificativa (até duas frases)"
          className={textareaClassName}
        />
        <select value={axisId} onChange={(e) => setAxisId(e.target.value)} className={selectClassName}>
          {IAH_AXES.map((axis) => (
            <option key={axis.id} value={axis.id}>
              {axis.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!title.trim() || !rationale.trim()}
            onClick={() => onSubmit(title.trim(), rationale.trim(), axisId)}
          >
            Adicionar
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
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
