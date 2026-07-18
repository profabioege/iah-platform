"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, PartyPopper, Plus, X } from "lucide-react";

import type { Mission } from "@/modules/library";
import type { KnowledgeDocument } from "@/modules/knowledge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
// Reaproveita a navegação do Mission Flow — mesmo componente, sem
// duplicar ("Voltar"/"Continuar", uma ação principal por tela).
import { MissionNavigation } from "@/app/(platform)/missoes/[id]/mission-flow/mission-navigation";

import { useLessonBuilder } from "../use-lesson-builder";
import { LessonHeader } from "./lesson-header";
import { LessonStep } from "./lesson-step";
import { LessonPreview } from "./lesson-preview";

const TOTAL_STEPS = 6;
const GRADE_OPTIONS = ["1º ano E.M.", "2º ano E.M.", "3º ano E.M."];

/**
 * LessonWizard — o fluxo "Nova Lesson" em 6 etapas (Sprint M12):
 * Planejamento → Currículo → Mission Flow → Materiais → Preview → Salvar.
 * Mesma forma do Mission Flow (uma etapa por tela, baixa carga cognitiva),
 * aplicada à montagem de aula do Professor em vez da investigação do aluno.
 */
export function LessonWizard({
  lessonId,
  author,
  missions,
  knowledgeDocuments,
}: {
  lessonId: string;
  author: string;
  missions: Mission[];
  knowledgeDocuments: KnowledgeDocument[];
}) {
  const { lesson, update, blockers, saved } = useLessonBuilder(lessonId, author);
  const [step, setStep] = React.useState(1);

  if (!lesson) return <WizardSkeleton />;

  const goTo = (next: number) => setStep(Math.min(TOTAL_STEPS, Math.max(1, next)));

  const selectedMission = missions.find((m) => m.id === lesson.missionId) ?? null;
  const selectedDocuments = knowledgeDocuments.filter((d) =>
    lesson.knowledgeDocumentIds.includes(d.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <LessonHeader topic={lesson.topic} step={step} totalSteps={TOTAL_STEPS} />

      {step === 1 && (
        <LessonStep
          eyebrow="Planejamento"
          title="Série, turma, tempo e tema"
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
                value={lesson.classroomLabel}
                onChange={(e) => update({ classroomLabel: e.target.value })}
                className={selectClassName}
              >
                <option value="Turma de demonstração">Turma de demonstração</option>
              </select>
            </Field>
            <Field label="Tempo (minutos)">
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
            <Field label="Tema">
              <Input
                value={lesson.topic}
                onChange={(e) => update({ topic: e.target.value })}
                placeholder="ex.: Desinformação e verificação de fontes"
              />
            </Field>
          </div>
          <MissionNavigation onNext={() => goTo(2)} hideBack />
        </LessonStep>
      )}

      {step === 2 && (
        <LessonStep
          eyebrow="Currículo"
          title="Competências e objetivos"
          description="Alinhamento normativo desta aula (LDB/BNCC/BNCC Computação, D-029 a D-031)."
        >
          <div className="flex flex-col gap-4">
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
            <TagListField
              label="Objetivos da Aula"
              values={lesson.objectives}
              onChange={(values) => update({ objectives: values })}
              placeholder="ex.: Reconhecer critérios de checagem de fontes"
            />
          </div>
          <MissionNavigation onBack={() => goTo(1)} onNext={() => goTo(3)} />
        </LessonStep>
      )}

      {step === 3 && (
        <LessonStep
          eyebrow="Mission Flow"
          title="Escolha a investigação desta aula"
          description="Selecione uma Mission Flow existente ou crie uma nova no Estúdio."
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
            onBack={() => goTo(2)}
            onNext={() => goTo(4)}
            nextDisabled={!lesson.missionId}
          />
        </LessonStep>
      )}

      {step === 4 && (
        <LessonStep
          eyebrow="Materiais"
          title="Recursos da Biblioteca"
          description="Selecione materiais do Knowledge Engine para apoiar esta aula (dados de demonstração)."
        >
          <div className="flex flex-col gap-3">
            {knowledgeDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum material disponível na Biblioteca ainda.
              </p>
            ) : (
              knowledgeDocuments.map((doc) => {
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
                      {doc.resourceType} · {doc.sourceName ?? "Fonte não informada"}
                    </p>
                  </SelectableCard>
                );
              })
            )}
          </div>
          <MissionNavigation onBack={() => goTo(3)} onNext={() => goTo(5)} />
        </LessonStep>
      )}

      {step === 5 && (
        <LessonStep
          eyebrow="Preview"
          title="Revise antes de salvar"
          description="Plano da aula, Mission, Materiais, Critérios e tempo previsto."
        >
          <LessonPreview
            lesson={lesson}
            mission={selectedMission}
            knowledgeDocuments={selectedDocuments}
          />
          <MissionNavigation onBack={() => goTo(4)} onNext={() => goTo(6)} />
        </LessonStep>
      )}

      {step === 6 && (
        <LessonStep eyebrow="Entrega" title="Salvar Lesson">
          <Card className={saved ? "border-chart-2/50" : undefined}>
            <CardContent className="flex flex-col gap-4 py-2">
              {blockers.length > 0 ? (
                <ul className="flex flex-col gap-1 text-sm text-destructive">
                  {blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tudo pronto — a Lesson será salva neste dispositivo.
                </p>
              )}
              {saved ? (
                <div className="flex items-center gap-3 rounded-xl border border-chart-2/50 bg-chart-2/10 p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-2/20 text-chart-2">
                    <PartyPopper className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Lesson salva</p>
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
                  Salvar Lesson
                </Button>
              )}
            </CardContent>
          </Card>
          <MissionNavigation onBack={() => goTo(5)} hideNext />
        </LessonStep>
      )}
    </div>
  );
}

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/** Constrói uma lista de strings (competências/objetivos) — sem catálogo formal ainda (D-029/D-030). */
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
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando a Lesson">
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
