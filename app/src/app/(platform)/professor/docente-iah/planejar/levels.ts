import {
  BookOpenText,
  CalendarRange,
  Layers,
  ListTree,
  Rows3,
} from "lucide-react";

export interface PlanningLevel {
  slug: string;
  title: string;
  description: string;
  icon: typeof Layers;
  /** "Planejamento anual" já tem um motor real (Currículo Vivo) — ponte, não duplicação. */
  bridgeHref?: string;
  bridgeLabel?: string;
}

/**
 * Hierarquia de Planejamento do DocentIAH: DocentIAH → Planejar → Aula →
 * Sequência didática → Unidade → Bimestre → Planejamento anual. O
 * Planejamento Anual deixou de ser um atalho isolado no Painel — agora
 * vive aqui dentro, no nível que lhe cabe (D-044).
 */
export const PLANNING_LEVELS: PlanningLevel[] = [
  {
    slug: "aula",
    title: "Aula",
    description: "O planejamento de uma aula específica.",
    icon: Rows3,
    bridgeHref: "/professor/aulas",
    bridgeLabel: "Abrir o Montador de Aula",
  },
  {
    slug: "sequencia-didatica",
    title: "Sequência didática",
    description: "Um arco de aulas encadeadas em torno de um objetivo.",
    icon: ListTree,
  },
  {
    slug: "unidade",
    title: "Unidade",
    description: "Um conjunto de sequências didáticas com um tema em comum.",
    icon: Layers,
  },
  {
    slug: "bimestre",
    title: "Bimestre",
    description: "O planejamento do período letivo.",
    icon: BookOpenText,
  },
  {
    slug: "planejamento-anual",
    title: "Planejamento anual",
    description: "O Currículo Vivo, navegável, do ano letivo inteiro.",
    icon: CalendarRange,
    bridgeHref: "/professor/curriculo",
    bridgeLabel: "Abrir o Currículo Vivo",
  },
];

export function findPlanningLevel(slug: string): PlanningLevel | undefined {
  return PLANNING_LEVELS.find((level) => level.slug === slug);
}
