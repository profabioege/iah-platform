import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EVIDENCE_LABEL, type EvidenceLevel } from "@/modules/study";

const TONE: Record<EvidenceLevel, string> = {
  pendente: "bg-muted text-muted-foreground",
  evidencia_insuficiente: "border border-dashed border-muted-foreground/50 bg-transparent text-muted-foreground",
  prioridade_de_estudo: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  em_desenvolvimento: "bg-primary/15 text-primary",
  indicios_favoraveis: "bg-chart-2/15 text-chart-2",
};

/** Leitura da evidência — sempre com texto (a cor só reforça). */
export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  return <Badge className={cn("w-fit font-normal", TONE[level])}>{EVIDENCE_LABEL[level]}</Badge>;
}
