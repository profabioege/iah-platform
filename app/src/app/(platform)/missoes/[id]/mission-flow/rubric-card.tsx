import { CheckCircle2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { ParsedGuideEntry } from "./parse-mission-content";

/** Classes estáticas (Tailwind precisa ver a string completa em build time). */
const ICON_STYLES = [
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/15 text-chart-4",
  "bg-chart-5/15 text-chart-5",
];

/**
 * Um critério (do Guia de Investigação ou dos Critérios de Auditoria)
 * como cartão — nunca lista longa. `index` só varia a cor do selo
 * (Dual Coding), sem acoplar a nenhum rótulo específico de conteúdo.
 */
export function RubricCard({
  entry,
  index = 0,
}: {
  entry: ParsedGuideEntry;
  index?: number;
}) {
  const style = ICON_STYLES[index % ICON_STYLES.length];
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-1">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md",
              style,
            )}
          >
            <CheckCircle2 className="size-3.5" />
          </span>
          {entry.label}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {entry.description}
        </p>
      </CardContent>
    </Card>
  );
}
