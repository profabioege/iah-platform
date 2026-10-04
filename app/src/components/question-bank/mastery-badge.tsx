import { Badge } from "@/components/ui/badge";
import { MASTERY_LABEL, MASTERY_RULES, type SkillMastery } from "@/modules/question-bank";

const TONE: Record<SkillMastery["state"], string> = {
  sem_evidencia: "",
  em_desenvolvimento: "border-amber-400 text-amber-800 dark:text-amber-200",
  consolidando: "border-sky-400 text-sky-800 dark:text-sky-200",
  consolidado: "border-emerald-500 text-emerald-800 dark:text-emerald-200",
};

/**
 * Estado da habilidade SEMPRE junto da evidência ("4 de 5 recentes") —
 * é um indicador por regra explícita (D-051), não nota nem proficiência.
 */
export function MasteryBadge({ mastery, compact = false }: { mastery: SkillMastery; compact?: boolean }) {
  const evidence =
    mastery.total === 0
      ? null
      : `${mastery.correct} de ${mastery.total}${compact ? "" : " recentes"}${mastery.insufficient ? " · pouca evidência" : ""}`;
  return (
    <Badge variant="outline" className={TONE[mastery.state]} title={`Regra ${MASTERY_RULES.versao}: últimas ${MASTERY_RULES.janela} respostas`}>
      {MASTERY_LABEL[mastery.state]}
      {evidence ? ` · ${evidence}` : ""}
    </Badge>
  );
}
