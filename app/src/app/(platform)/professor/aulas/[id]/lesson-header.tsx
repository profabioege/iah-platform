import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
// Reaproveita o indicador de progresso do Mission Flow — mesmo padrão
// visual, sem duplicar componente (Sprint M12: "usar arquitetura já
// existente").
import { ProgressIndicator } from "@/app/(platform)/missoes/[id]/mission-flow/progress-indicator";

/**
 * Barra superior do LessonWizard: link de volta, rótulo "Intelligent
 * Lesson Composer" e progresso — mesmo papel de `MissionHeader` no
 * Mission Flow.
 */
export function LessonHeader({
  topic,
  step,
  totalSteps,
}: {
  topic: string;
  step: number;
  totalSteps: number;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/professor/aulas"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Minhas Aulas
        </Link>
        <Badge className="bg-primary/15 text-primary">Lesson Composer</Badge>
      </div>
      <p className="truncate text-sm font-medium text-foreground/80">
        {topic || "Nova Aula"}
      </p>
      <ProgressIndicator current={step} total={totalSteps} />
    </div>
  );
}
