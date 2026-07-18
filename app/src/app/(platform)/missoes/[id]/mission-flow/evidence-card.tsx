import { Bot, FileBarChart, MessageCircleWarning, Newspaper } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { ParsedEvidence } from "./parse-mission-content";

/**
 * Um item do Dossiê — ícone (Dual Coding, não foto: uma imagem real da
 * "notícia" confundiria com o próprio critério de autenticidade que a
 * Missão ensina a checar), manchete, fonte e (opcional) a pergunta que
 * guia o próximo passo do aluno.
 */
const ICONS = [Newspaper, FileBarChart, MessageCircleWarning, Bot];
/** Classes estáticas (Tailwind precisa ver a string completa em build time). */
const ICON_STYLES = [
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/15 text-chart-4",
];

export function EvidenceCard({
  evidence,
  compact = false,
  prompt,
}: {
  evidence: ParsedEvidence;
  compact?: boolean;
  prompt?: string;
}) {
  const Icon = ICONS[(evidence.number - 1) % ICONS.length];
  const iconStyle = ICON_STYLES[(evidence.number - 1) % ICON_STYLES.length];

  return (
    <Card className="overflow-hidden">
      <div className={cn("flex items-center gap-2 px-4 pt-4", !compact && "pb-1")}>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            iconStyle,
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Item {evidence.number}
        </span>
      </div>
      <CardContent className={cn("flex flex-col gap-2", compact && "pt-0")}>
        <p className="text-base font-semibold leading-snug">
          &ldquo;{evidence.headline}&rdquo;
        </p>
        <p className="text-xs text-muted-foreground">{evidence.source}</p>
        {!compact ? (
          <p className="text-sm leading-relaxed text-foreground/90">
            {evidence.body}
          </p>
        ) : null}
        {prompt ? (
          <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium text-foreground/90">
            {prompt}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
