"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { buildSlidesPrefillPayload, mergeLessonPlanSection } from "@/lib/docentiah/material-generators";
import { EDUCATION_LEVEL_LABEL } from "@/modules/conexoes-iah";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  ActivityFormat,
  ActivityKind,
  EssayQuestion,
  InfographicDraft,
  LessonPlanActivity,
  LessonPlanDraft,
  LessonPlanningBrief,
  LessonPlanningStatus,
  MindMapDraft,
  ObjectiveQuestion,
  ResearchTask,
  SupportMaterialType,
} from "@/modules/docentiah";

import {
  generateLessonMaterialAction,
  rewriteLessonPlanSectionAction,
  saveLessonDraftAction,
  type GeneratedMaterialDraft,
  type LessonPlanSection,
} from "./actions";
import { BASIC_PALETTES, otherThemes } from "./palette-picker-basic";

export const SLIDES_PREFILL_STORAGE_KEY = "docentiah:slides-prefill";

const MATERIAL_OPTIONS: Array<{ id: SupportMaterialType; label: string; description: string }> = [
  { id: "lesson_plan", label: "Plano da aula", description: "Mobilização, desenvolvimento e atividade prontos para usar." },
  { id: "slides", label: "Apresentação de slides", description: "Reaproveita o gerador de slides do DocentIAH." },
  { id: "infographic", label: "Infográfico", description: "Rascunho estruturado — blocos, dados e paleta." },
  { id: "mind_map", label: "Mapa mental", description: "Conceito central, ramos e conexões." },
];

const SUPPORT_MATERIAL_OPTIONS: Array<{ id: "infographic" | "mind_map"; label: string }> = [
  { id: "infographic", label: "Infográfico" },
  { id: "mind_map", label: "Mapa mental" },
];

const REWRITE_OPTIONS: Array<{ id: LessonPlanSection; label: string }> = [
  { id: "introduction", label: "Mobilização" },
  { id: "development", label: "Desenvolvimento" },
  { id: "activity", label: "Atividade" },
  { id: "full", label: "Planejamento completo" },
];

const ACTIVITY_KIND_OPTIONS: Array<{ id: ActivityKind; label: string }> = [
  { id: "objective", label: "Questões objetivas" },
  { id: "essay", label: "Questões dissertativas" },
  { id: "research", label: "Pesquisa" },
  { id: "mixed", label: "Atividade mista" },
];

const ACTIVITY_FORMAT_OPTIONS: Array<{ id: ActivityFormat; label: string }> = [
  { id: "individual", label: "Individual" },
  { id: "dupla", label: "Dupla" },
  { id: "grupo", label: "Grupo" },
  { id: "pesquisa_orientada", label: "Pesquisa orientada" },
];

export function MaterialGenerationFlow({
  brief,
  status,
  onStatusChange,
  onSaved,
}: {
  brief: LessonPlanningBrief;
  status: LessonPlanningStatus;
  onStatusChange: (status: LessonPlanningStatus) => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [materialType, setMaterialType] = React.useState<SupportMaterialType | null>(brief.supportMaterialType ?? null);
  const [palette, setPalette] = React.useState<string>("essencial");
  const [showOtherThemes, setShowOtherThemes] = React.useState(false);
  const [draftResult, setDraftResult] = React.useState<GeneratedMaterialDraft | null>(null);
  const [editableDraft, setEditableDraft] = React.useState<LessonPlanDraft | InfographicDraft | MindMapDraft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [rewriting, setRewriting] = React.useState(false);
  const [showRewriteMenu, setShowRewriteMenu] = React.useState(false);
  const [showSupportMenu, setShowSupportMenu] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function pickMaterial(type: SupportMaterialType) {
    setMaterialType(type);
    setErrorMessage(null);
    setShowRewriteMenu(false);
    setShowSupportMenu(false);
    if (type === "slides") return; // aguarda escolha de paleta antes de gerar/redirecionar
    onStatusChange("generating");
    const result = await generateLessonMaterialAction(brief, type);
    if ("error" in result) {
      setErrorMessage(result.error);
      onStatusChange("material_selection");
      return;
    }
    setDraftResult(result);
    if ("draft" in result) setEditableDraft(result.draft);
    onStatusChange("ready_for_review");
  }

  function goToSlidesWizard() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SLIDES_PREFILL_STORAGE_KEY, JSON.stringify(buildSlidesPrefillPayload(brief, palette)));
    }
    router.push("/professor/docente-iah/apresentacao-slides");
  }

  async function handleRewrite(section: LessonPlanSection) {
    setRewriting(true);
    setErrorMessage(null);
    const result = await rewriteLessonPlanSectionAction(brief, section);
    setRewriting(false);
    setShowRewriteMenu(false);
    if ("error" in result) {
      setErrorMessage(result.error);
      return;
    }
    setEditableDraft((prev) => {
      if (!prev) return result.draft;
      return mergeLessonPlanSection(prev as LessonPlanDraft, result.draft, section);
    });
  }

  async function handleSave() {
    if (!materialType || !editableDraft) return;
    setSaving(true);
    setErrorMessage(null);
    const title = brief.topic ? `${materialLabel(materialType)} — ${brief.topic}` : materialLabel(materialType);
    const result = await saveLessonDraftAction(brief, materialType, editableDraft, title);
    setSaving(false);
    if ("error" in result) {
      setErrorMessage(result.error);
      return;
    }
    onSaved();
  }

  if (status === "material_selection" && (!materialType || materialType !== "slides")) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          <p className="text-sm font-medium text-foreground">O que você precisa preparar?</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {MATERIAL_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => pickMaterial(option.id)}
                className="rounded-lg border border-border p-3 text-left text-sm hover:border-primary"
              >
                <p className="font-medium text-foreground">{option.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
              </button>
            ))}
          </div>
          {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
        </CardContent>
      </Card>
    );
  }

  if (materialType === "slides" && status === "material_selection") {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          <p className="text-sm font-medium text-foreground">Escolha um tema para os slides</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {BASIC_PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPalette(p.id)}
                className={
                  (palette === p.id ? "border-primary bg-primary/10 " : "border-border ") +
                  "rounded-lg border p-3 text-left text-xs"
                }
                aria-pressed={palette === p.id}
              >
                <p className="font-medium text-foreground">{p.label}</p>
                <p className="mt-0.5 text-muted-foreground">{p.description}</p>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowOtherThemes((v) => !v)} className="w-fit text-xs text-muted-foreground underline-offset-2 hover:underline">
            Outros temas
          </button>
          {showOtherThemes ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {otherThemes().map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setPalette(theme.id)}
                  className={(palette === theme.id ? "border-primary bg-primary/10 " : "border-border ") + "rounded-lg border p-3 text-left text-xs"}
                >
                  <p className="font-medium text-foreground">{theme.name}</p>
                  <p className="mt-0.5 text-muted-foreground">{theme.description}</p>
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex justify-between">
            <Button type="button" size="sm" variant="ghost" onClick={() => setMaterialType(null)}>
              Voltar
            </Button>
            <Button type="button" size="sm" onClick={goToSlidesWizard}>
              Continuar para os slides
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "generating") {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">Preparando seu material…</CardContent>
      </Card>
    );
  }

  if (status === "ready_for_review" && draftResult && editableDraft && materialType) {
    const isLessonPlan = materialType === "lesson_plan";
    return (
      <Card className="border-primary/40">
        <CardContent className="flex flex-col gap-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Prévia — {materialLabel(materialType)}</p>

          {isLessonPlan ? <LessonPlanContextSummary brief={brief} /> : null}

          <DraftPreview materialType={materialType} draft={editableDraft} onChange={setEditableDraft} />
          {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}

          {isLessonPlan ? (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando…" : "Salvar planejamento"}
                </Button>

                <div className="relative">
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowRewriteMenu((v) => !v)} disabled={rewriting}>
                    {rewriting ? "Reescrevendo…" : "Reescrever"}
                  </Button>
                  {showRewriteMenu ? (
                    <div className="absolute z-10 mt-1 flex w-56 flex-col gap-1 rounded-lg border border-border bg-popover p-1 shadow-md">
                      {REWRITE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleRewrite(option.id)}
                          className="rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <Button type="button" size="sm" variant="outline" onClick={goToSlidesWizard}>
                  Criar apresentação de slides
                </Button>

                <div className="relative">
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowSupportMenu((v) => !v)}>
                    Criar material de apoio
                  </Button>
                  {showSupportMenu ? (
                    <div className="absolute z-10 mt-1 flex w-44 flex-col gap-1 rounded-lg border border-border bg-popover p-1 shadow-md">
                      {SUPPORT_MATERIAL_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => pickMaterial(option.id)}
                          className="rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <Button type="button" size="sm" variant="ghost" className="w-fit" onClick={() => onStatusChange("material_selection")}>
                Ajustar informações
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap justify-between gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => onStatusChange("material_selection")}>
                Ajustar planejamento
              </Button>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => onStatusChange("cancelled")}>
                  Cancelar
                </Button>
                <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando…" : "Salvar como rascunho"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}

function materialLabel(type: SupportMaterialType): string {
  return MATERIAL_OPTIONS.find((o) => o.id === type)?.label ?? type;
}

function LessonPlanContextSummary({ brief }: { brief: LessonPlanningBrief }) {
  const turma = brief.educationLevel && brief.grade ? `${brief.grade} · ${EDUCATION_LEVEL_LABEL[brief.educationLevel]}` : "—";
  const rows: Array<[string, string]> = [
    ["Disciplina", brief.subject ?? "—"],
    ["Ano/série", turma],
    ["Conteúdo", brief.topic ?? "—"],
    ["Perfil da turma", brief.classProfile.length > 0 ? brief.classProfile.join(", ") : "—"],
    ["Conexão IAH", brief.iahConnection?.title ?? "—"],
    ["Habilidades", brief.selectedCurriculumSkills.length > 0 ? `${brief.selectedCurriculumSkills.length} selecionada(s)` : "—"],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border border-border bg-muted/30 p-3 text-xs sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col">
          <dt className="font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EditableField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        className="w-full resize-y rounded-lg border border-input bg-background p-2 text-xs leading-relaxed text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}

/** Edita um `string[]` como uma linha por item — sem inventar controles de adicionar/remover além do que já foi gerado. */
function EditableListField({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-foreground">{label}</span>
      <textarea
        value={value.join("\n")}
        onChange={(event) => onChange(event.target.value.split("\n"))}
        rows={Math.max(2, value.length)}
        className="w-full resize-y rounded-lg border border-input bg-background p-2 text-xs leading-relaxed text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}

function LessonPlanSectionHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-widest text-primary">{children}</p>;
}

function LessonPlanIntroductionEditor({ draft, onChange }: { draft: LessonPlanDraft; onChange: (draft: LessonPlanDraft) => void }) {
  const introduction = draft.introduction;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <LessonPlanSectionHeading>Mobilização</LessonPlanSectionHeading>
      <EditableField
        label="Contexto inicial"
        value={introduction.contextualization}
        onChange={(v) => onChange({ ...draft, introduction: { ...introduction, contextualization: v } })}
      />
      <EditableListField
        label="Para começar a conversa (uma pergunta por linha)"
        value={introduction.priorKnowledgeQuestions}
        onChange={(v) => onChange({ ...draft, introduction: { ...introduction, priorKnowledgeQuestions: v } })}
      />
      <EditableField
        label="Exemplo ou situação inicial"
        value={introduction.openingExample}
        onChange={(v) => onChange({ ...draft, introduction: { ...introduction, openingExample: v } })}
      />
      <EditableField
        label="Condução dos primeiros minutos"
        value={introduction.teacherGuidance}
        onChange={(v) => onChange({ ...draft, introduction: { ...introduction, teacherGuidance: v } })}
      />
    </div>
  );
}

function LessonPlanDevelopmentEditor({ draft, onChange }: { draft: LessonPlanDraft; onChange: (draft: LessonPlanDraft) => void }) {
  const development = draft.development;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <LessonPlanSectionHeading>Desenvolvimento</LessonPlanSectionHeading>
      {development.topics.map((topic, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-md bg-muted/30 p-2">
          <EditableField
            label={`Tema ${index + 1} — título`}
            value={topic.title}
            onChange={(v) => {
              const topics = [...development.topics];
              topics[index] = { ...topics[index], title: v };
              onChange({ ...draft, development: { ...development, topics } });
            }}
          />
          <EditableField
            label="Explicação"
            value={topic.explanation}
            onChange={(v) => {
              const topics = [...development.topics];
              topics[index] = { ...topics[index], explanation: v };
              onChange({ ...draft, development: { ...development, topics } });
            }}
          />
        </div>
      ))}
      {development.keyConcepts.map((concept, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-md bg-muted/30 p-2">
          <EditableField
            label={`Conceito fundamental ${index + 1} — termo`}
            value={concept.term}
            onChange={(v) => {
              const keyConcepts = [...development.keyConcepts];
              keyConcepts[index] = { ...keyConcepts[index], term: v };
              onChange({ ...draft, development: { ...development, keyConcepts } });
            }}
          />
          <EditableField
            label="Definição"
            value={concept.definition}
            onChange={(v) => {
              const keyConcepts = [...development.keyConcepts];
              keyConcepts[index] = { ...keyConcepts[index], definition: v };
              onChange({ ...draft, development: { ...development, keyConcepts } });
            }}
          />
        </div>
      ))}
      <EditableListField
        label="Exemplos (um por linha)"
        value={development.examples}
        onChange={(v) => onChange({ ...draft, development: { ...development, examples: v } })}
      />
      {development.iahConnection ? (
        <EditableField
          label="Conexão com Inteligência Artificial & Humanidades"
          value={development.iahConnection}
          onChange={(v) => onChange({ ...draft, development: { ...development, iahConnection: v } })}
        />
      ) : null}
      <EditableListField
        label="Para aprofundar (uma questão por linha)"
        value={development.deepeningQuestions}
        onChange={(v) => onChange({ ...draft, development: { ...development, deepeningQuestions: v } })}
      />
      <EditableListField
        label="Possíveis equívocos dos alunos (um por linha)"
        value={development.commonMisconceptions}
        onChange={(v) => onChange({ ...draft, development: { ...development, commonMisconceptions: v } })}
      />
    </div>
  );
}

function ObjectiveQuestionEditor({
  question,
  index,
  onChange,
}: {
  question: ObjectiveQuestion;
  index: number;
  onChange: (question: ObjectiveQuestion) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-muted/30 p-2">
      <EditableField label={`Questão objetiva ${index + 1} — enunciado`} value={question.prompt} onChange={(v) => onChange({ ...question, prompt: v })} />
      <EditableListField
        label="Alternativas (uma por linha)"
        value={question.options}
        onChange={(v) => onChange({ ...question, options: v })}
      />
      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-foreground">Alternativa correta</span>
        <select
          value={question.correctOptionIndex}
          onChange={(event) => onChange({ ...question, correctOptionIndex: Number(event.target.value) })}
          className="rounded-lg border border-input bg-background p-2 text-xs text-foreground"
        >
          {question.options.map((option, optionIndex) => (
            <option key={optionIndex} value={optionIndex}>
              {String.fromCharCode(65 + optionIndex)} — {option.slice(0, 40)}
            </option>
          ))}
        </select>
      </label>
      <EditableField label="Justificativa (gabarito)" value={question.rationale} onChange={(v) => onChange({ ...question, rationale: v })} />
    </div>
  );
}

function EssayQuestionEditor({
  question,
  index,
  onChange,
}: {
  question: EssayQuestion;
  index: number;
  onChange: (question: EssayQuestion) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-muted/30 p-2">
      <EditableField label={`Questão dissertativa ${index + 1} — enunciado`} value={question.prompt} onChange={(v) => onChange({ ...question, prompt: v })} />
      <EditableField label="Comando cognitivo" value={question.cognitiveDemand} onChange={(v) => onChange({ ...question, cognitiveDemand: v })} />
      <EditableField label="Expectativa de resposta" value={question.expectedAnswer} onChange={(v) => onChange({ ...question, expectedAnswer: v })} />
      <EditableListField
        label="Critérios de correção (um por linha)"
        value={question.correctionCriteria}
        onChange={(v) => onChange({ ...question, correctionCriteria: v })}
      />
    </div>
  );
}

function ResearchTaskEditor({ task, onChange }: { task: ResearchTask; onChange: (task: ResearchTask) => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-muted/30 p-2">
      <EditableField label="Pergunta central" value={task.centralQuestion} onChange={(v) => onChange({ ...task, centralQuestion: v })} />
      <EditableListField label="Questões orientadoras (uma por linha)" value={task.guidingQuestions} onChange={(v) => onChange({ ...task, guidingQuestions: v })} />
      <EditableListField label="Fontes recomendadas (uma por linha)" value={task.recommendedSources} onChange={(v) => onChange({ ...task, recommendedSources: v })} />
      <EditableField label="Produto final esperado" value={task.expectedProduct} onChange={(v) => onChange({ ...task, expectedProduct: v })} />
      <EditableListField label="Critérios de qualidade (um por linha)" value={task.qualityCriteria} onChange={(v) => onChange({ ...task, qualityCriteria: v })} />
      <EditableField label="Orientação de verificação das fontes" value={task.verificationGuidance} onChange={(v) => onChange({ ...task, verificationGuidance: v })} />
      <EditableField label="Autoria e referências" value={task.authorshipNote} onChange={(v) => onChange({ ...task, authorshipNote: v })} />
    </div>
  );
}

function LessonPlanActivityEditor({ draft, onChange }: { draft: LessonPlanDraft; onChange: (draft: LessonPlanDraft) => void }) {
  const activity = draft.activity;

  function updateActivity(patch: Partial<LessonPlanActivity>) {
    onChange({ ...draft, activity: { ...activity, ...patch } });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <LessonPlanSectionHeading>Atividade</LessonPlanSectionHeading>
      <EditableField label="Título da atividade" value={activity.title} onChange={(v) => updateActivity({ title: v })} />
      <EditableField label="Objetivo" value={activity.objective} onChange={(v) => updateActivity({ objective: v })} />
      <EditableField label="Orientações ao aluno" value={activity.instructions} onChange={(v) => updateActivity({ instructions: v })} />

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-foreground">Tempo estimado (min)</span>
          <input
            type="number"
            min={5}
            value={activity.durationMinutes}
            onChange={(event) => updateActivity({ durationMinutes: Number(event.target.value) })}
            className="rounded-lg border border-input bg-background p-2 text-xs text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-foreground">Formato</span>
          <select
            value={activity.format}
            onChange={(event) => updateActivity({ format: event.target.value as ActivityFormat })}
            className="rounded-lg border border-input bg-background p-2 text-xs text-foreground"
          >
            {ACTIVITY_FORMAT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <EditableListField label="Recursos necessários (um por linha)" value={activity.resources} onChange={(v) => updateActivity({ resources: v })} />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de atividade">
        {ACTIVITY_KIND_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={activity.activityKind === option.id}
            onClick={() => updateActivity({ activityKind: option.id })}
            className={
              activity.activityKind === option.id
                ? "rounded-full border border-primary bg-primary/15 px-3 py-1 text-xs text-primary"
                : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      {activity.activityKind === "objective" || activity.activityKind === "mixed" ? (
        <>
          {activity.objectiveQuestions.map((question, index) => (
            <ObjectiveQuestionEditor
              key={index}
              question={question}
              index={index}
              onChange={(updated) => {
                const objectiveQuestions = [...activity.objectiveQuestions];
                objectiveQuestions[index] = updated;
                updateActivity({ objectiveQuestions });
              }}
            />
          ))}
          <EditableField label="Gabarito consolidado" value={activity.answerKey} onChange={(v) => updateActivity({ answerKey: v })} />
        </>
      ) : null}

      {activity.activityKind === "essay" || activity.activityKind === "mixed" ? (
        <>
          {activity.essayQuestions.map((question, index) => (
            <EssayQuestionEditor
              key={index}
              question={question}
              index={index}
              onChange={(updated) => {
                const essayQuestions = [...activity.essayQuestions];
                essayQuestions[index] = updated;
                updateActivity({ essayQuestions });
              }}
            />
          ))}
          <EditableListField
            label="Critérios de correção consolidados (um por linha)"
            value={activity.correctionCriteria}
            onChange={(v) => updateActivity({ correctionCriteria: v })}
          />
        </>
      ) : null}

      {(activity.activityKind === "research" || activity.activityKind === "mixed") && activity.researchTask ? (
        <ResearchTaskEditor task={activity.researchTask} onChange={(researchTask) => updateActivity({ researchTask })} />
      ) : null}
    </div>
  );
}

function DraftPreview({
  materialType,
  draft,
  onChange,
}: {
  materialType: SupportMaterialType;
  draft: LessonPlanDraft | InfographicDraft | MindMapDraft;
  onChange: (draft: LessonPlanDraft | InfographicDraft | MindMapDraft) => void;
}) {
  if (materialType === "lesson_plan") {
    const d = draft as LessonPlanDraft;
    return (
      <div className="flex flex-col gap-3">
        <EditableField label="Título" value={d.title} onChange={(v) => onChange({ ...d, title: v })} />
        <LessonPlanIntroductionEditor draft={d} onChange={onChange} />
        <LessonPlanDevelopmentEditor draft={d} onChange={onChange} />
        <LessonPlanActivityEditor draft={d} onChange={onChange} />
      </div>
    );
  }
  if (materialType === "infographic") {
    const d = draft as InfographicDraft;
    return (
      <div className="flex flex-col gap-2">
        <EditableField label="Título" value={d.title} onChange={(v) => onChange({ ...d, title: v })} />
        <EditableField label="Mensagem central" value={d.centralMessage} onChange={(v) => onChange({ ...d, centralMessage: v })} />
        {d.blocks.map((block, index) => (
          <EditableField
            key={index}
            label={block.title}
            value={block.content}
            onChange={(v) => {
              const blocks = [...d.blocks];
              blocks[index] = { ...blocks[index], content: v };
              onChange({ ...d, blocks });
            }}
          />
        ))}
        <p className="text-[11px] text-muted-foreground">Paleta: {d.palette} · Prévia estruturada — exportação final fica para uma próxima etapa.</p>
      </div>
    );
  }
  const d = draft as MindMapDraft;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{d.centralConcept}</p>
      {d.branches.map((branch, index) => (
        <div key={index} className="rounded-lg border border-border p-2 text-xs">
          <p className="font-medium text-foreground">{branch.label}</p>
          <ul className="ml-4 list-disc text-muted-foreground">
            {branch.subBranches.map((sub, subIndex) => (
              <li key={subIndex}>{sub}</li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">Estrutura visual simples — exportação final fica para uma próxima etapa.</p>
    </div>
  );
}
