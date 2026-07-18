import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { ProgressIndicator } from "./progress-indicator";

/**
 * Barra superior do Mission Flow: "Missão N" + progresso — o único
 * elemento fixo em toda a jornada, para orientar sem distrair.
 */
export function MissionHeader({
  missionNumber,
  title,
  step,
  totalSteps,
  minutesRemaining,
}: {
  missionNumber: number;
  title: string;
  step: number;
  totalSteps: number;
  minutesRemaining?: number;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/missoes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Todas as missões
        </Link>
        <Badge className="bg-primary/15 text-primary">
          Missão {String(missionNumber).padStart(2, "0")}
        </Badge>
      </div>
      <p className="truncate text-sm font-medium text-foreground/80">{title}</p>
      <ProgressIndicator
        current={step}
        total={totalSteps}
        minutesRemaining={minutesRemaining}
      />
    </div>
  );
}
