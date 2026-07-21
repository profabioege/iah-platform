import { Award, BarChart3, ClipboardCheck, HeartHandshake } from "lucide-react";

export interface CoordinatorReport {
  slug: string;
  title: string;
  description: string;
  icon: typeof ClipboardCheck;
}

/** Relatórios da Coordenação Pedagógica (D-046) — entradas navegáveis, sem geração de PDF nesta etapa. */
export const COORDINATOR_REPORTS: CoordinatorReport[] = [
  {
    slug: "acompanhamento",
    title: "Relatório de acompanhamento pedagógico",
    description: "Panorama do acompanhamento docente e das turmas da unidade.",
    icon: ClipboardCheck,
  },
  {
    slug: "desempenho",
    title: "Relatório de desempenho",
    description: "Desempenho por questão e por competência nas sondagens diagnósticas.",
    icon: BarChart3,
  },
  {
    slug: "intervencoes",
    title: "Relatório de intervenções",
    description: "Planos de apoio pedagógico em andamento e concluídos.",
    icon: HeartHandshake,
  },
  {
    slug: "formacao-docente",
    title: "Relatório de formação docente",
    description: "Trilhas de formação continuada oferecidas e concluídas.",
    icon: Award,
  },
];

export function findCoordinatorReport(slug: string): CoordinatorReport | undefined {
  return COORDINATOR_REPORTS.find((report) => report.slug === slug);
}
