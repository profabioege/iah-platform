"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, PartyPopper, Plus, X } from "lucide-react";

import type { Mission } from "@/modules/library";
import type { Classroom } from "@/modules/workspace";
import {
  KNOWLEDGE_RESOURCE_TYPE_LABEL,
  type KnowledgeDocument,
} from "@/modules/knowledge";
import {
  LESSON_FORMAT_LABEL,
  LESSON_FORMATS,
  rankKnowledgeDocuments,
  suggestLessonFormat,
  suggestMission,
} from "@/modules/lesson";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
// Reaproveita a navegação e o parser do Mission Flow — mesmos
// componentes, sem duplicar (Sprint M13: "usar exclusivamente
// componentes já implementados").
import { MissionNavigation } from "@/app/(platform)/missoes/[id]/mission-flow/mission-navigation";
import { parseMissionContent } from "@/app/(platform)/missoes/[id]/mission-flow/parse-mission-content";
import { RubricCard } from "@/app/(platform)/missoes/[id]/mission-flow/rubric-card";

import { useLessonBuilder } from "../use-lesson-builder";
import { LessonHeader } from "./lesson-header";
import { LessonStep } from "./lesson-step";
import { LessonPreview } from "./lesson-preview";

const TOTAL_STEPS = 7;
const GRADE_OPTIONS = ["1º ano E.M.", "2º ano E.M.", "3º ano E.M."];

/**
 * LessonWizard — Intelligent Lesson Composer (Sprint M13): 7 etapas,
 * cada uma com sugestão automática por regra simples (sem IA) que o
 * Professor sempre pode revisar e trocar — Quem é minha turma? → O que
 * quero ensinar? → Como meus alunos irão aprender? → Com quais
 * recursos? → Como será a missão? → Avaliação → Preview do Pacote
 * Pedagógico. Evolução do Lesson Builder MVP (M12): mesmo módulo
 * `modules/lesson`, mesma forma de wizard do Mission Flow (uma etapa
 * por tela, baixa carga cognitiva).
 */
export function LessonWizard({
  lessonId,
  author,
  missions,
  knowledgeDocuments,
  classrooms,
}: {
  lessonId: string;
  author: string;
  missions: Mission[];
  knowledgeDocuments: KnowledgeDocument[];
  classrooms: Classroom[];
}) {
  const { lesson, update, blockers, saved } = useLessonBuilder(lessonId, author);
  const [step, setStep] = React.useState(1);

  const planningAxisOptions = React.useMemo(
    () => Array.from(new Set(missions.map((m) => m.module))),
    [missions],
  );
  const rankedDocuments = React.useMemo(
    () => (lesson ? rankKnowledgeDocuments(lesson, knowledgeDocuments) : knowledgeDocuments),
    [lesson, knowledgeDocuments],
  );
  const groupedDocuments = React.useMemo(
    () => groupByResourceType(rankedDocuments),
    [rankedDocuments],
  );

  // Sugestões automáticas por regra simples — só preenchem campo vazio,
  // nunca sobrescrevem uma escolha já feita pelo Professor.
  React.useEffect(() => {
    if (step === 3 && lesson && lesson.format === null) {
      update({ format: suggestLessonFormat(lesson) });
    }
  }, [step, lesson, update]);

  React.useEffect(() => {
    if (step === 4 && lesson && lesson.knowledgeDocumentIds.length === 0 && rankedDocuments.length > 0) {
      update({ knowledgeDocumentIds: [rankedDocuments[0].id] });
    }
  }, [step, lesson, rankedDocuments, update]);

  React.useEffect(() => {
    if (step === 5 && lesson && lesson.missionId === null) {
      const suggested = suggestMission(lesson, missions);
      if (suggested) update({ missionId: suggested.id });
    }
  }, [step, lesson, missions, update]);

  if (!lesson) return <WizardSkeleton />;

  const goTo = (next: number) => setStep(Math.min(TOTAL_STEPS, Math.max(1, next)));

  const selectedMission = missions.find((m) => m.id === lesson.missionId) ?? null;
  const selectedDocuments = knowledgeDocuments.filter((d) =>
    lesson.knowledgeDocumentIds.includes(d.id),
  );
  const parsed = selectedMission ? parseMissionContent(selectedMission.didacticMaterials) : null;
  const criteria = parsed?.auditCriteria ?? [];
  const evidenceCount = parsed?.evidences.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <LessonHeader topic={lesson.topic} step={step} totalSteps={TOTAL_STEPS} />

      {step === 1 && (
        <LessonStep
          eyebrow="Planejamento"
          title="Quem é minha turma?"
          description="A base da aula — o resto do assistente parte daqui."
        >
          <div className="flex flex-col gap-4">
            <Field label="Série">
              <select
                value={lesson.grade}
                onChange={(e) => update({ grade: e.target.value })}
                className={selectClassName}
              >
                <option value="">Selecione a série</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label="Turma">
              <select
                value={lesson.classroomId ?? ""}
                onChange={(e) => {
                  const classroom = classrooms.find((c) => c.id === e.target.value);
                  update({
                    classroomId: classroom?.id ?? null,
                    classroomLabel: classroom?.name ?? "",
                  });
                }}
                className={selectClassName}
              >
                <option value="">Selecione a turma</option>
                {classrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tempo disponível (minutos)">
              <Input
                type="number"
                min={0}
                value={lesson.estimatedMinutes ?? ""}
                onChange={(e) =>
                  update({
                    estimatedMinutes: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="ex.: 50"
              />
            </Field>
          </div>
          <MissionNavigation onNext={() => goTo(2)} hideBack />
        </LessonStep>
      )}

      {step === 2 && (
        <LessonStep
          eyebrow="Currículo"
          title="O que quero ensinar?"
          description="Tema, objetivo e alinhamento normativo (LDB/BNCC/BNCC Computação, D-029 a D-031)."
        >
          <div className="flex flex-col gap-4">
            <Field label="Tema">
              <Input
                value={lesson.topic}
                onChange={(e) => update({ topic: e.target.value })}
                placeholder="ex.: Desinformação e verificação de fontes"
              />
            </Field>
            <Field label="Objetivo">
              <textarea
                value={lesson.objective}
                onChange={(e) => update({ objective: e.target.value })}
                rows={3}
                placeholder="ex.: Reconhecer critérios objetivos para verificar a confiabilidade de uma informação."
                className={textareaClassName}
              />
            </Field>
            <Field label="Eixo do Planejamento Anual">
              <select
                value={lesson.planningAxis}
                onChange={(e) => update({ planningAxis: e.target.value })}
                className={selectClassName}
              >
                <option value="">Selecione o eixo</option>
                {planningAxisOptions.map((axis) => (
                  <option key={axis} value={axis}>{axis}</option>
                ))}
              </select>
            </Field>
            <TagListField
              label="Competências BNCC"
              values={lesson.bnccCompetencies}
              onChange={(values) => update({ bnccCompetencies: values })}
              placeholder="ex.: Pensamento científico, crítico e criativo"
            />
            <TagListField
              label="Competências BNCC Computação"
              values={lesson.bnccComputacaoCompetencies}
              onChange={(values) => update({ bnccComputacaoCompetencies: values })}
              placeholder="ex.: Pensamento computacional"
            />
          </div>
          <MissionNavigation onBack={() => goTo(1)} onNext={() => goTo(3)} />
        </LessonStep>
      )}

      {step === 3 && (
        <LessonStep
          eyebrow="Metodologia"
          title="Como meus alunos irão aprender?"
          description="Sugestão automática por regra simples (sem IA) a partir do Tema e do Objetivo — troque se quiser."
        >
          <div className="flex flex-wrap gap-2">
            {LESSON_FORMATS.map((format) => {
              const isSelected = lesson.format === format;
              return (
                <button key={format} type="button" onClick={() => update({ format })}>
                  <Badge
                    variant={isSelected ? undefined : "outline"}
                    className={cn(
                      "cursor-pointer py-1.5 text-sm font-normal",
                      isSelected && "bg-primary text-primary-foreground",
                    )}
                  >
                    {LESSON_FORMAT_LABEL[format]}
                  </Badge>
                </button>
              );
            })}
          </div>
          <MissionNavigation
            onBack={() => goTo(2)}
            onNext={() => goTo(4)}
            nextDisabled={!lesson.format}
          />
        </LessonStep>
      )}

      {step === 4 && (
        <LessonStep
          eyebrow="Recursos"
          title="Com quais recursos?"
          description="Busca automática na Biblioteca Inteligente, ordenada por relevância ao Tema (dados de demonstração)."
        >
          <div className="flex flex-col gap-4">
            {Object.keys(groupedDocuments).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum material disponível na Biblioteca ainda.
              </p>
            ) : (
              Object.entries(groupedDocuments).map(([type, docs]) => (
                <div key={type} className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {KNOWLEDGE_RESOURCE_TYPE_LABEL[type as keyof typeof KNOWLEDGE_RESOURCE_TYPE_LABEL] ?? type}
                  </p>
                  <div className="flex flex-col gap-2">
                    {docs.map((doc) => {
                      const isSelected = lesson.knowledgeDocumentIds.includes(doc.id);
                      return (
                        <SelectableCard
                          key={doc.id}
                          selected={isSelected}
                          onClick={() =>
                            update({
                              knowledgeDocumentIds: isSelected
                                ? lesson.knowledgeDocumentIds.filter((id) => id !== doc.id)
                                : [...lesson.knowledgeDocumentIds, doc.id],
                            })
                          }
                        >
                          <p className="text-sm font-semibold">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.sourceName ?? "Fonte não informada"}
                          </p>
                        </SelectableCard>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          <MissionNavigation onBack={() => goTo(3)} onNext={() => goTo(5)} />
        </LessonStep>
      )}

      {step === 5 && (
        <LessonStep
          eyebrow="Fluxo da Missão"
          title="Como será a missão?"
          description="Associação automática pela combinação de Tema, Objetivo e Eixo — ou crie uma nova no Estúdio."
        >
          <div className="flex flex-col gap-3">
            {missions.map((mission) => (
              <SelectableCard
                key={mission.id}
                selected={lesson.missionId === mission.id}
                onClick={() => update({ missionId: mission.id })}
              >
                <p className="text-sm font-semibold">{mission.title}</p>
                <p className="text-xs text-muted-foreground">{mission.module}</p>
              </SelectableCard>
            ))}
            <Link
              href="/professor/estudio"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Criar nova Missão no Estúdio →
            </Link>
          </div>
          <MissionNavigation
            onBack={() => goTo(4)}
            onNext={() => goTo(6)}
            nextDisabled={!lesson.missionId}
          />
        </LessonStep>
      )}

      {step === 6 && (
        <LessonStep
          eyebrow="Avaliação"
          title="Rubrica, critérios e evidências"
          description="Herdados automaticamente do Fluxo da Missão selecionada — as competências avaliadas são as que você já escolheu."
        >
          <div className="flex flex-col gap-4">
            {criteria.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {evidenceCount} evidência{evidenceCount === 1 ? "" : "s"} no Dossiê da Missão selecionada.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {criteria.map((entry, i) => (
                    <RubricCard key={entry.label} entry={entry} index={i} />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Volte à etapa Fluxo da Missão e selecione uma Missão para herdar a rubrica.
              </p>
            )}
            {(lesson.bnccCompetencies.length > 0 || lesson.bnccComputacaoCompetencies.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {lesson.bnccCompetencies.map((c) => (
                  <Badge key={c} variant="outline">{c}</Badge>
                ))}
                {lesson.bnccComputacaoCompetencies.map((c) => (
                  <Badge key={c} variant="outline">{c}</Badge>
                ))}
              </div>
            )}
            <Field label="Notas de avaliação (opcional)">
              <textarea
                value={lesson.assessmentNotes ?? ""}
                onChange={(e) => update({ assessmentNotes: e.target.value || null })}
                rows={3}
                placeholder="ex.: Priorizar a justificativa do veredito, não só o resultado."
                className={textareaClassName}
              />
            </Field>
          </div>
          <MissionNavigation onBack={() => goTo(5)} onNext={() => goTo(7)} />
        </LessonStep>
      )}

      {step === 7 && (
        <LessonStep
          eyebrow="Pré-visualização"
          title="O Pacote Pedagógico desta aula"
          description="Revise tudo antes de salvar."
        >
          <LessonPreview
            lesson={lesson}
            mission={selectedMission}
            knowledgeDocuments={selectedDocuments}
          />
          {blockers.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm text-destructive">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
          {saved ? (
            <div className="flex items-center gap-3 rounded-xl border border-chart-2/50 bg-chart-2/10 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-2/20 text-chart-2">
                <PartyPopper className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Aula salva</p>
                <p className="text-sm text-muted-foreground">
                  Encontre-a em &ldquo;Minhas Aulas&rdquo; a qualquer momento.
                </p>
                <Link
                  href="/professor/aulas"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-chart-2 transition-colors hover:text-foreground"
                >
                  Voltar a Minhas Aulas
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          ) : (
            <Button
              size="lg"
              disabled={blockers.length > 0}
              onClick={() => update({ savedAt: new Date().toISOString() })}
              className="w-fit"
            >
              <CheckCircle2 className="size-4" />
              Salvar Aula
            </Button>
          )}
          <MissionNavigation onBack={() => goTo(6)} hideNext />
        </LessonStep>
      )}
    </div>
  );
}

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const textareaClassName =
  "w-full resize-y rounded-lg border border-input bg-background/60 p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30";

function groupByResourceType(
  documents: KnowledgeDocument[],
): Record<string, KnowledgeDocument[]> {
  const groups: Record<string, KnowledgeDocument[]> = {};
  for (const doc of documents) {
    (groups[doc.resourceType] ??= []).push(doc);
  }
  return groups;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/** Constrói uma lista de strings (competências) — sem catálogo formal ainda (D-029/D-030). */
function TagListField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = React.useState("");

  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...values, trimmed]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" />
        </Button>
      </div>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {values.map((value) => (
            <Badge key={value} variant="outline" className="gap-1 pr-1 font-normal">
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== value))}
                aria-label={`Remover ${value}`}
                className="rounded-full p-0.5 hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SelectableCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className={cn(selected && "border-primary bg-primary/5")}>
        <CardContent className="flex items-center justify-between gap-3 py-2">
          <div className="flex flex-col gap-0.5">{children}</div>
          {selected ? <CheckCircle2 className="size-5 shrink-0 text-primary" /> : null}
        </CardContent>
      </Card>
    </button>
  );
}

function WizardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando a Aula">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-1.5 w-full rounded-full" />
      <div className="flex flex-col gap-4 py-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}
