import {
  ClipboardCheck,
  Presentation,
  Puzzle,
  Wand2,
} from "lucide-react";

export interface DocentTask {
  slug: string;
  title: string;
  description: string;
  icon: typeof Wand2;
  /** Rota dedicada (sobrepõe o placeholder padrão `/tarefa/[slug]`) — usada quando a tarefa já tem tela própria. */
  href?: string;
  /** Ferramenta real já construída que resolve parte desta tarefa hoje, sem IA. */
  bridgeHref?: string;
  bridgeLabel?: string;
  /** Segundo link, para uma tela relacionada que não é o foco principal da tarefa. */
  secondaryHref?: string;
  secondaryLabel?: string;
}

/**
 * Os quatro cards principais do DocentIAH (posicionamento do produto:
 * "planejar, criar e acompanhar, sem substituir o professor"). Nesta
 * etapa é só interface e arquitetura de navegação — sem provedor de IA
 * conectado (D-016/D-044/D-045). Quando a ferramenta real já resolve um
 * pedaço da tarefa hoje, a página da tarefa aponta para ela em vez de
 * fingir uma IA que ainda não existe.
 */
export const DOCENT_TASKS: DocentTask[] = [
  {
    slug: "apresentacao-slides",
    title: "Apresentação de slides",
    description: "Monte os slides de apoio para uma aula ou missão.",
    icon: Presentation,
  },
  {
    slug: "avaliacao",
    title: "Avaliação",
    description: "Especifique uma avaliação — com adaptações pedagógicas, se precisar.",
    icon: ClipboardCheck,
    href: "/professor/docente-iah/avaliacao",
  },
  {
    slug: "plano-de-aula",
    title: "Plano de aula",
    description: "Monte o Pacote Pedagógico de uma aula, passo a passo.",
    icon: Wand2,
    bridgeHref: "/professor/aulas",
    bridgeLabel: "Abrir o Montador de Aula",
    secondaryHref: "/professor/docente-iah/planejar",
    secondaryLabel: "Ver outras escalas de planejamento",
  },
  {
    slug: "adaptar-material",
    title: "Adaptar material",
    description: "Ajustar um material existente para outro contexto, turma ou necessidade.",
    icon: Puzzle,
  },
];

export function findDocentTask(slug: string): DocentTask | undefined {
  return DOCENT_TASKS.find((task) => task.slug === slug);
}
