import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InstitutionalPlaceholder } from "@/components/layout/institutional-placeholder";

import { findCoordinatorReport } from "../reports";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ relatorio: string }>;
}): Promise<Metadata> {
  const report = findCoordinatorReport((await params).relatorio);
  return { title: report ? `Coordenação · ${report.title}` : "Coordenação · Relatórios" };
}

export default async function CoordinatorReportPage({
  params,
}: {
  params: Promise<{ relatorio: string }>;
}) {
  const report = findCoordinatorReport((await params).relatorio);
  if (!report) notFound();

  return (
    <InstitutionalPlaceholder
      eyebrow="Coordenação Pedagógica · Relatórios"
      title={report.title}
      description={report.description}
      backHref="/coordenacao/relatorios"
      backLabel="Relatórios"
    />
  );
}
