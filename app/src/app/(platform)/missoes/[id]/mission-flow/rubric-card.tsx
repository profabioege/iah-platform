import { CheckCircle2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import type { ParsedGuideEntry } from "./parse-mission-content";

/**
 * Um critério (do Guia de Investigação ou dos Critérios de Auditoria)
 * como cartão — nunca lista longa (a Sprint pede explicitamente:
 * "nunca listas longas").
 */
export function RubricCard({ entry }: { entry: ParsedGuideEntry }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5 py-1">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="size-4 shrink-0 text-primary" />
          {entry.label}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {entry.description}
        </p>
      </CardContent>
    </Card>
  );
}
