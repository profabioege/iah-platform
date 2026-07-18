"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, GitBranch, Send } from "lucide-react";

import {
  DIFFICULTY_LABEL,
  getMissionStudioRepository,
  publishBlockers,
  STATUS_LABEL,
  type StudioMission,
  type StudioMissionDifficulty,
  type StudioResourceRef,
} from "@/modules/authoring";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const STEPS = [
  "Identificação",
  "Pedagogia",
  "Investigação",
  "Avaliação",
  "Materiais",
  "Visualizar & Publicar",
] as const;

/**
 * Editor do Mission Studio — etapas, autosave (rascunho salvo
 * automaticamente neste dispositivo), duplicação, versionamento e
 * publicação. Versão publicada é imutável: os campos travam e a edição
 * exige "Nova versão" (docs/MISSION_STUDIO.md).
 */
export function MissionEditor({ missionId }: { missionId: string }) {
  const router = useRouter();
  const repository = getMissionStudioRepository();

  const [mission, setMission] = React.useState<StudioMission | null | undefined>(
    undefined,
  );
  const [step, setStep] = React.useState(0);
  const [savedAt, setSavedAt] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    void repository.get(missionId).then((m) => setMission(m ?? null));
  }, [repository, missionId]);

  const readOnly =
    mission?.status === "published" || mission?.status === "archived";

  /** Autosave com debounce — só para versões editáveis. */
  const update = React.useCallback(
    (patch: Partial<StudioMission>) => {
      setMission((current) => {
        if (!current) return current;
        const next = { ...current, ...patch };
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          void repository
            .save(next)
            .then(() => setSavedAt(new Date().toISOString()));
        }, 600);
        return next;
      });
    },
    [repository],
  );

  if (mission === undefined) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (mission === null) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-4">
          <p className="text-sm text-muted-foreground">
            Missão não encontrada neste dispositivo.
          </p>
          <Link
            href="/professor/estudio"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ArrowLeft className="size-4" />
            Voltar à Biblioteca
          </Link>
        </CardContent>
      </Card>
    );
  }

  const blockers = publishBlockers(mission);

  async function handlePublish() {
    try {
      const published = await repository.publish(mission!.id);
      setMission(published);
      setFeedback(
        "Missão publicada. Esta versão agora é imutável — para editar, crie uma nova versão.",
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleNewVersion() {
    const next = await repository.createNewVersion(mission!.id);
    router.push(`/professor/estudio/${next.id}`);
  }

  async function handleDuplicate() {
    const copy = await repository.duplicate(mission!.id);
    router.push(`/professor/estudio/${copy.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de status */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/professor/estudio"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ArrowLeft className="size-4" />
          Biblioteca
        </Link>
        <Badge variant="outline" className="text-muted-foreground">
          v{mission.version}
        </Badge>
        <Badge variant="outline" className="text-muted-foreground">
          {STATUS_LABEL[mission.status]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {readOnly
            ? "Versão imutável — crie uma nova versão para editar."
            : savedAt
              ? `Rascunho salvo automaticamente neste dispositivo (${formatTime(savedAt)})`
              : "Rascunho · salvo automaticamente neste dispositivo"}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy className="size-4" />
            Duplicar
          </Button>
          {mission.status === "published" ? (
            <Button variant="outline" size="sm" onClick={handleNewVersion}>
              <GitBranch className="size-4" />
              Nova versão
            </Button>
          ) : null}
        </div>
      </div>

      {/* Etapas */}
      <ol className="flex flex-wrap gap-2" aria-label="Etapas do editor">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(index)}
              aria-current={index === step ? "step" : undefined}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors",
                index === step
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/60",
              )}
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="flex flex-col gap-4 py-2">
          {step === 0 ? (
            <>
              <TextField label="Título" value={mission.title} onChange={(v) => update({ title: v })} disabled={readOnly} />
              <AreaField label="Descrição" value={mission.description} onChange={(v) => update({ description: v })} disabled={readOnly} rows={3} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Ano escolar" value={mission.schoolYear} onChange={(v) => update({ schoolYear: v })} disabled={readOnly} placeholder="ex.: 3º Ano EM" />
                <TextField label="Disciplina" value={mission.subject} onChange={(v) => update({ subject: v })} disabled={readOnly} />
                <NumberField label="Carga horária (horas)" value={mission.workloadHours} onChange={(v) => update({ workloadHours: v })} disabled={readOnly} />
                <NumberField label="Tempo estimado (minutos)" value={mission.estimatedMinutes} onChange={(v) => update({ estimatedMinutes: v })} disabled={readOnly} />
              </div>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Nível de dificuldade</span>
                <select
                  value={mission.difficulty}
                  onChange={(e) =>
                    update({ difficulty: e.target.value as StudioMissionDifficulty })
                  }
                  disabled={readOnly}
                  className="h-9 w-fit rounded-md border border-border bg-background px-2 text-sm"
                >
                  {Object.entries(DIFFICULTY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <AreaField label="Pergunta norteadora" value={mission.guidingQuestion} onChange={(v) => update({ guidingQuestion: v })} disabled={readOnly} rows={2} hint="Aberta, genuína, sem resposta única (MISSION_TEMPLATE.md)." />
              <ListField label="Objetivos" values={mission.objectives} onChange={(v) => update({ objectives: v })} disabled={readOnly} hint="Um objetivo por linha." />
              <ListField label="Competências" values={mission.competencies} onChange={(v) => update({ competencies: v })} disabled={readOnly} hint="Uma competência por linha (3–6)." />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <ListField label="Estudos de caso" values={mission.caseStudies} onChange={(v) => update({ caseStudies: v })} disabled={readOnly} hint="Um caso/evidência por linha (ex.: itens do Dossiê)." />
              <AreaField label="Desafio" value={mission.challenge} onChange={(v) => update({ challenge: v })} disabled={readOnly} rows={4} />
              <AreaField label="Produção esperada" value={mission.expectedProduction} onChange={(v) => update({ expectedProduction: v })} disabled={readOnly} rows={3} />
              <AreaField label="Reflexão (prompt do Diário do Auditor)" value={mission.reflectionPrompt} onChange={(v) => update({ reflectionPrompt: v })} disabled={readOnly} rows={3} />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <AreaField label="Rubrica" value={mission.rubric} onChange={(v) => update({ rubric: v })} disabled={readOnly} rows={4} hint="Como a produção será avaliada, em linguagem que o aluno entende." />
              <ListField label="Critérios de avaliação" values={mission.evaluationCriteria} onChange={(v) => update({ evaluationCriteria: v })} disabled={readOnly} hint="Um critério por linha." />
            </>
          ) : null}

          {step === 4 ? (
            <>
              <ListField label="Materiais de apoio" values={mission.supportMaterials} onChange={(v) => update({ supportMaterials: v })} disabled={readOnly} hint="Um material por linha." />
              <RefListField label="Links" values={mission.links} onChange={(v) => update({ links: v })} disabled={readOnly} hint={'Um por linha, no formato "rótulo | https://…".'} />
              <RefListField label="Arquivos (referências)" values={mission.files} onChange={(v) => update({ files: v })} disabled={readOnly} hint={'Um por linha, "nome | URL". Upload real entra com o storage do banco (docs/MISSION_STUDIO.md).'} />
              <ListField label="Bibliografia" values={mission.bibliography} onChange={(v) => update({ bibliography: v })} disabled={readOnly} hint="Uma referência por linha." />
            </>
          ) : null}

          {step === 5 ? (
            <div className="flex flex-col gap-4">
              <MissionPreview mission={mission} />

              {mission.status === "published" ? (
                <p className="flex items-center gap-2 text-sm text-chart-2">
                  <Check className="size-4" />
                  Publicada — disponível na Biblioteca do Estúdio. Levar ao
                  aluno (runtime) é a etapa futura documentada em
                  docs/MISSION_STUDIO.md.
                </p>
              ) : mission.status === "archived" ? (
                <p className="text-sm text-muted-foreground">Versão arquivada.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {blockers.length > 0 ? (
                    <ul className="text-sm text-chart-4">
                      {blockers.map((b) => (
                        <li key={b}>• {b}</li>
                      ))}
                    </ul>
                  ) : null}
                  <Button
                    size="sm"
                    className="w-fit"
                    disabled={blockers.length > 0}
                    onClick={handlePublish}
                  >
                    <Send className="size-4" />
                    Publicar esta versão
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Publicar congela esta versão (v{mission.version}) — edições
                    posteriores exigirão uma nova versão.
                  </p>
                </div>
              )}

              {feedback ? (
                <p className="text-sm text-muted-foreground">{feedback}</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- campos ---------- */

function TextField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <Input
        type="number"
        min={0}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        disabled={disabled}
      />
    </label>
  );
}

function AreaField({
  label,
  value,
  onChange,
  disabled,
  rows,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  rows: number;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed disabled:opacity-60"
      />
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function ListField({
  label,
  values,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <AreaField
      label={label}
      value={values.join("\n")}
      onChange={(text) =>
        onChange(text.split("\n").map((l) => l.trimEnd()).filter((l) => l !== ""))
      }
      disabled={disabled}
      rows={Math.max(3, values.length + 1)}
      hint={hint}
    />
  );
}

function RefListField({
  label,
  values,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  values: StudioResourceRef[];
  onChange: (v: StudioResourceRef[]) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <AreaField
      label={label}
      value={values.map((r) => `${r.label} | ${r.url}`).join("\n")}
      onChange={(text) =>
        onChange(
          text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line !== "")
            .map((line) => {
              const [label = "", url = ""] = line.split("|").map((p) => p.trim());
              return { label, url };
            }),
        )
      }
      disabled={disabled}
      rows={Math.max(3, values.length + 1)}
      hint={hint}
    />
  );
}

/* ---------- visualização ---------- */

function MissionPreview({ mission }: { mission: StudioMission }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          {[mission.schoolYear, mission.subject].filter(Boolean).join(" · ")}
        </p>
        <h2 className="text-lg font-semibold">{mission.title || "(sem título)"}</h2>
        {mission.description ? (
          <p className="text-sm text-muted-foreground">{mission.description}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {DIFFICULTY_LABEL[mission.difficulty]}
          {mission.workloadHours ? ` · ${mission.workloadHours}h` : ""}
          {mission.estimatedMinutes ? ` · ~${mission.estimatedMinutes} min` : ""}
          {" · "}por {mission.author}
        </p>
      </header>
      <PreviewBlock title="Pergunta norteadora" text={mission.guidingQuestion} />
      <PreviewList title="Objetivos" items={mission.objectives} />
      <PreviewList title="Competências" items={mission.competencies} />
      <PreviewList title="Estudos de caso" items={mission.caseStudies} />
      <PreviewBlock title="Desafio" text={mission.challenge} />
      <PreviewBlock title="Produção esperada" text={mission.expectedProduction} />
      <PreviewBlock title="Reflexão" text={mission.reflectionPrompt} />
      <PreviewBlock title="Rubrica" text={mission.rubric} />
      <PreviewList title="Critérios de avaliação" items={mission.evaluationCriteria} />
      <PreviewList title="Materiais de apoio" items={mission.supportMaterials} />
      <PreviewList
        title="Links"
        items={mission.links.map((r) => `${r.label} — ${r.url}`)}
      />
      <PreviewList
        title="Arquivos"
        items={mission.files.map((r) => `${r.label} — ${r.url}`)}
      />
      <PreviewList title="Bibliografia" items={mission.bibliography} />
    </article>
  );
}

function PreviewBlock({ title, text }: { title: string; text: string }) {
  if (!text.trim()) return null;
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <ul className="list-inside list-disc text-sm leading-relaxed">
        {items.map((item, i) => (
          <li key={`${item}-${i}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
