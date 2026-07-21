import {
  ClipboardCheck,
  ListChecks,
  ListTree,
  MessageSquareHeart,
  Puzzle,
  Rocket,
  Wand2,
  Workflow,
} from "lucide-react";

export interface DocentTask {
  slug: string;
  title: string;
  description: string;
  icon: typeof Wand2;
  /** Ferramenta real já construída que resolve parte desta tarefa hoje, sem IA. */
  bridgeHref?: string;
  bridgeLabel?: string;
}

/**
 * As oito tarefas do DocentIAH (posicionamento do produto: "planejar,
 * criar e acompanhar, sem substituir o professor"). Nesta etapa é só
 * interface e arquitetura de navegação — sem provedor de IA conectado
 * (D-016/D-044). Quando a ferramenta real já resolve um pedaço da
 * tarefa hoje, a página da tarefa aponta para ela em vez de fingir uma
 * IA que ainda não existe.
 */
export const DOCENT_TASKS: DocentTask[] = [
  {
    slug: "criar-aula",
    title: "Criar uma aula",
    description: "Monte o Pacote Pedagógico de uma aula, passo a passo.",
    icon: Wand2,
    bridgeHref: "/professor/aulas",
    bridgeLabel: "Abrir o Montador de Aula",
  },
  {
    slug: "criar-missao",
    title: "Criar uma missão",
    description: "Autoria de uma Missão investigativa para a turma.",
    icon: Rocket,
    bridgeHref: "/professor/estudio",
    bridgeLabel: "Abrir o Estúdio de Missões",
  },
  {
    slug: "criar-sondagem",
    title: "Criar uma sondagem",
    description: "Diagnóstico com correção e devolutiva de respostas.",
    icon: ClipboardCheck,
    bridgeHref: "/professor/avaliacoes",
    bridgeLabel: "Abrir Sondagens",
  },
  {
    slug: "adaptar-atividade",
    title: "Adaptar uma atividade",
    description: "Ajustar uma atividade existente para outro contexto ou turma.",
    icon: Puzzle,
  },
  {
    slug: "criar-rubrica",
    title: "Criar uma rubrica",
    description: "Critérios de avaliação claros para um trabalho ou missão.",
    icon: ListChecks,
  },
  {
    slug: "preparar-devolutiva",
    title: "Preparar uma devolutiva",
    description: "Retorno estruturado para o aluno sobre um trabalho entregue.",
    icon: MessageSquareHeart,
    bridgeHref: "/professor/devolutivas",
    bridgeLabel: "Abrir Devolutivas",
  },
  {
    slug: "relacionar-competencias",
    title: "Relacionar competências",
    description: "Ligar uma atividade às competências da BNCC que ela trabalha.",
    icon: Workflow,
  },
  {
    slug: "organizar-sequencia-didatica",
    title: "Organizar uma sequência didática",
    description: "Encadear aulas e missões num arco pedagógico maior.",
    icon: ListTree,
    bridgeHref: "/professor/docente-iah/planejar/sequencia-didatica",
    bridgeLabel: "Abrir em Planejar",
  },
];

export function findDocentTask(slug: string): DocentTask | undefined {
  return DOCENT_TASKS.find((task) => task.slug === slug);
}
