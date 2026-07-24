"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  InfographicDraft,
  LessonPlanDraft,
  LessonPlanningBrief,
  LessonPlanningStatus,
  MindMapDraft,
  SupportMaterialType,
} from "@/modules/docentiah";

import { generateLessonMaterialAction, saveLessonDraftAction, type GeneratedMaterialDraft } from "./actions";
import { BASIC_PALETTES, otherThemes } from "./palette-picker-basic";

export const SLIDES_PREFILL_STORAGE_KEY = "docentiah:slides-prefill";

const MATERIAL_OPTIONS: Array<{ id: SupportMaterialType; label: string; description: string }> = [
  { id: "lesson_plan", label: "Plano da aula", description: "Estrutura completa da aula, pronta para editar." },
  { id: "slides", label: "Apresentação de slides", description: "Reaproveita o gerador de slides do DocentIAH." },
  { id: "infographic", label: "Infográfico", description: "Rascunho estruturado — blocos, dados e paleta." },
  { id: "mind_map", label: "Mapa mental", description: "Conceito central, ramos e conexões." },
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
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function pickMaterial(type: SupportMaterialType) {
    setMaterialType(type);
    setErrorMessage(null);
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
      window.sessionStorage.setItem(
        SLIDES_PREFILL_STORAGE_KEY,
        JSON.stringify({
          subject: brief.subject,
          educationLevel: brief.educationLevel,
          grade: brief.grade,
          topic: brief.topic,
          studentProfile: brief.classProfile.join(", "),
          visualTheme: palette,
        }),
      );
    }
    router.push("/professor/docente-iah/apresentacao-slides");
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
    return (
      <Card className="border-primary/40">
        <CardContent className="flex flex-col gap-3 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Prévia — {materialLabel(materialType)}</p>
          <DraftPreview materialType={materialType} draft={editableDraft} onChange={setEditableDraft} />
          {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
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
        </CardContent>
      </Card>
    );
  }

  return null;
}

function materialLabel(type: SupportMaterialType): string {
  return MATERIAL_OPTIONS.find((o) => o.id === type)?.label ?? type;
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
      <div className="flex flex-col gap-2">
        <EditableField label="Título" value={d.title} onChange={(v) => onChange({ ...d, title: v })} />
        <EditableField label="Mobilização" value={d.mobilization} onChange={(v) => onChange({ ...d, mobilization: v })} />
        <EditableField label="Desenvolvimento" value={d.development} onChange={(v) => onChange({ ...d, development: v })} />
        <EditableField label="Atividade" value={d.activity} onChange={(v) => onChange({ ...d, activity: v })} />
        <EditableField label="Síntese" value={d.synthesis} onChange={(v) => onChange({ ...d, synthesis: v })} />
        <EditableField label="Avaliação" value={d.assessment} onChange={(v) => onChange({ ...d, assessment: v })} />
        {d.iahConnection ? <p className="text-xs text-muted-foreground">Conexão IAH: {d.iahConnection}</p> : null}
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
