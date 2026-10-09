"use client";

import { BookOpenText, Bot, CheckCircle2, ShieldCheck } from "lucide-react";

import {
  AI_DIMENSIONS,
  axisLevelLabel,
  resolveAiCompetencies,
  type MissionAxes,
} from "@/modules/library";
import {
  isAiEvidenceComplete,
  type AiUseEvidence,
  type StudentWorkAxesReview,
} from "@/modules/classroom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Peças da Missão de dois eixos (D-053) no Mission Flow do aluno:
 * os dois objetivos lado a lado, o registro de uso da IA e a devolutiva
 * separada por eixo. A mesma cor marca sempre o mesmo eixo:
 * disciplina = primary, IA = chart-2.
 */

export function AxesObjectives({ axes }: { axes: MissionAxes }) {
  const competencies = resolveAiCompetencies(axes);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="flex flex-col gap-3 py-2">
          <div className="flex items-center gap-2">
            <BookOpenText className="size-5 shrink-0 text-primary" />
            <p className="text-sm font-semibold">Objetivo da disciplina</p>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            {axes.discipline.component} · {axes.discipline.skill.code}
          </p>
          <p className="text-sm leading-relaxed text-foreground/90">{axes.discipline.objective}</p>
        </CardContent>
      </Card>
      <Card className="border-chart-2/40 bg-chart-2/5">
        <CardContent className="flex flex-col gap-3 py-2">
          <div className="flex items-center gap-2">
            <Bot className="size-5 shrink-0 text-chart-2" />
            <p className="text-sm font-semibold">Competência em IA</p>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{axes.ai.objective}</p>
          <ul className="flex flex-col gap-1.5">
            {competencies.map((c) => (
              <li key={c.id} className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground/80">{AI_DIMENSIONS[c.dimension]}:</span>{" "}
                {c.label}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

const FIELDS: Array<{
  key: keyof AiUseEvidence;
  label: string;
  hint: string;
  rows: number;
}> = [
  { key: "tool", label: "Ferramenta de IA usada", hint: "Ex.: assistente de texto indicado pela escola.", rows: 1 },
  { key: "request", label: "O que você pediu à IA", hint: "Copie o pedido exatamente como enviou.", rows: 3 },
  { key: "response", label: "O que a IA respondeu", hint: "Cole o trecho da resposta que você analisou.", rows: 4 },
  { key: "verification", label: "Como você verificou", hint: "Qual critério de auditoria ou fonte independente você usou?", rows: 3 },
  { key: "decision", label: "O que você manteve, corrigiu ou descartou — e por quê", hint: "A decisão é sua, não da IA.", rows: 3 },
];

export function AiEvidenceForm({
  axes,
  evidence,
  readOnly,
  onChange,
  onBlur,
  statusLabel,
}: {
  axes: MissionAxes;
  evidence: AiUseEvidence;
  readOnly: boolean;
  onChange: (next: AiUseEvidence) => void;
  onBlur: () => void;
  statusLabel: string;
}) {
  const complete = isAiEvidenceComplete(evidence);
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-chart-2/40 bg-chart-2/5">
        <CardContent className="flex items-start gap-3 py-2">
          <Bot className="mt-0.5 size-5 shrink-0 text-chart-2" />
          <p className="text-sm leading-relaxed text-foreground/90">{axes.ai.practicalInstruction}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 py-2">
          {FIELDS.map((field) => (
            <label key={field.key} className="flex flex-col gap-1.5 text-sm font-medium">
              {field.label}
              <span className="text-xs font-normal text-muted-foreground">{field.hint}</span>
              {field.rows === 1 ? (
                <input
                  value={evidence[field.key]}
                  onChange={(e) => onChange({ ...evidence, [field.key]: e.target.value })}
                  onBlur={onBlur}
                  readOnly={readOnly}
                  maxLength={200}
                  className="w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 read-only:opacity-80"
                />
              ) : (
                <textarea
                  value={evidence[field.key]}
                  onChange={(e) => onChange({ ...evidence, [field.key]: e.target.value })}
                  onBlur={onBlur}
                  readOnly={readOnly}
                  rows={field.rows}
                  className="w-full resize-y rounded-lg border border-input bg-background/60 p-3 text-sm leading-relaxed text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 read-only:opacity-80"
                />
              )}
            </label>
          ))}
          <p className="text-xs text-muted-foreground">{statusLabel}</p>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="size-4" />
          O que conta como uso crítico da IA
        </p>
        <ul className="flex flex-col gap-1.5">
          {axes.ai.criticalUseEvidence.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-chart-2" />
              {item}
            </li>
          ))}
        </ul>
        {!complete && !readOnly ? (
          <p className="mt-3 text-xs font-medium text-foreground/80">
            Preencha os cinco campos para poder entregar.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function AxesReviewCards({
  axes,
  review,
}: {
  axes: MissionAxes;
  review: StudentWorkAxesReview;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <AxisCard
        tone="primary"
        icon={<BookOpenText className="size-4" />}
        title={`Disciplina · ${axes.discipline.component}`}
        subtitle={review.discipline.skillCode}
        level={axisLevelLabel(review.discipline.level)}
        criteria={review.discipline.observedCriteria}
        note={review.discipline.note}
      />
      <AxisCard
        tone="chart-2"
        icon={<Bot className="size-4" />}
        title="Competência em IA"
        subtitle={`${review.ai.competencyIds.length} competência(s) avaliada(s)`}
        level={axisLevelLabel(review.ai.level)}
        criteria={review.ai.observedCriteria}
        note={review.ai.note}
      />
    </div>
  );
}

function AxisCard({
  tone,
  icon,
  title,
  subtitle,
  level,
  criteria,
  note,
}: {
  tone: "primary" | "chart-2";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  level: string;
  criteria: string[];
  note: string;
}) {
  const border = tone === "primary" ? "border-primary/30" : "border-chart-2/40";
  const text = tone === "primary" ? "text-primary" : "text-chart-2";
  return (
    <div className={`flex flex-col gap-2 rounded-xl border ${border} bg-card p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`flex items-center gap-1.5 text-sm font-semibold ${text}`}>
            {icon}
            {title}
          </p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Badge variant="outline" className="shrink-0 font-medium">
          {level}
        </Badge>
      </div>
      {criteria.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {criteria.map((c) => (
            <li key={c} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className={`mt-0.5 size-3.5 shrink-0 ${text}`} />
              {c}
            </li>
          ))}
        </ul>
      ) : null}
      {note ? <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">{note}</p> : null}
    </div>
  );
}
