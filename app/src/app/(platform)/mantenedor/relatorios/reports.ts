import { Activity, ClipboardList, FileText } from "lucide-react";

export interface MaintainerReport {
  slug: string;
  title: string;
  description: string;
  icon: typeof FileText;
}

/** Relatórios do Mantenedor (D-046) — entradas navegáveis, sem geração de PDF nesta etapa. */
export const MAINTAINER_REPORTS: MaintainerReport[] = [
  {
    slug: "executivo",
    title: "Relatório executivo",
    description: "Panorama estratégico da rede para tomada de decisão.",
    icon: FileText,
  },
  {
    slug: "utilizacao",
    title: "Relatório de utilização",
    description: "Evolução da utilização por unidade ao longo do tempo.",
    icon: Activity,
  },
  {
    slug: "implantacao",
    title: "Relatório de implantação",
    description: "Andamento da implantação do Método IAH® em cada unidade.",
    icon: ClipboardList,
  },
];

export function findMaintainerReport(slug: string): MaintainerReport | undefined {
  return MAINTAINER_REPORTS.find((report) => report.slug === slug);
}
