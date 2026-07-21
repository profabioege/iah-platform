import { AlertTriangle, FileText, ShieldCheck } from "lucide-react";

export interface DirectorReport {
  slug: string;
  title: string;
  description: string;
  icon: typeof FileText;
}

/** Relatórios da Direção (D-046) — entradas navegáveis, sem geração de PDF nesta etapa. */
export const DIRECTOR_REPORTS: DirectorReport[] = [
  {
    slug: "unidade",
    title: "Relatório da unidade",
    description: "Panorama operacional completo da unidade escolar.",
    icon: FileText,
  },
  {
    slug: "pendencias",
    title: "Relatório de pendências",
    description: "Histórico de turmas, entregas e vínculos pendentes.",
    icon: AlertTriangle,
  },
  {
    slug: "evidencias",
    title: "Relatório de evidências institucionais",
    description: "Registro para auditoria e prestação de contas.",
    icon: ShieldCheck,
  },
];

export function findDirectorReport(slug: string): DirectorReport | undefined {
  return DIRECTOR_REPORTS.find((report) => report.slug === slug);
}
