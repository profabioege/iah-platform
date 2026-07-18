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
const ICON_BADGE_STYLES = [
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/15 text-chart-4",
];
/** Versão em degradê, usada na "imagem" de cada item na tela cheia. */
const ICON_BAND_STYLES = [
  "from-chart-1/25 to-chart-1/5 text-chart-1",
  "from-chart-2/25 to-chart-2/5 text-chart-2",
  "from-chart-3/25 to-chart-3/5 text-chart-3",
  "from-chart-4/25 to-chart-4/5 text-chart-4",
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

  if (compact) {
    const badgeStyle = ICON_BADGE_STYLES[(evidence.number - 1) % ICON_BADGE_STYLES.length];
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 px-4 pb-1 pt-4">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              badgeStyle,
            )}
          >
            <Icon className="size-4" />
          </span>
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Item {evidence.number}
          </span>
        </div>
        <CardContent className="flex flex-col gap-2 pt-0">
          <p className="text-base font-semibold leading-snug">
            &ldquo;{evidence.headline}&rdquo;
          </p>
          <p className="text-xs text-muted-foreground">{evidence.source}</p>
        </CardContent>
      </Card>
    );
  }

  const bandStyle = ICON_BAND_STYLES[(evidence.number - 1) % ICON_BAND_STYLES.length];
  return (
    <Card className="overflow-hidden">
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br py-8",
          bandStyle,
        )}
        aria-hidden="true"
      >
        <Icon className="size-12" />
      </div>
      <CardContent className="flex flex-col gap-3 py-5">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Item {evidence.number}
        </span>
        <p className="text-xl font-semibold leading-snug">
          &ldquo;{evidence.headline}&rdquo;
        </p>
        <p className="text-xs font-medium text-muted-foreground">{evidence.source}</p>
        <p className="text-sm leading-relaxed text-foreground/90">
          {evidence.body}
        </p>
        {prompt ? (
          <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm font-medium text-foreground/90">
            {prompt}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
