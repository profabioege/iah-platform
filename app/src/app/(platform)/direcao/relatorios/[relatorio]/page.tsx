import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InstitutionalPlaceholder } from "@/components/layout/institutional-placeholder";

import { findDirectorReport } from "../reports";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ relatorio: string }>;
}): Promise<Metadata> {
  const report = findDirectorReport((await params).relatorio);
  return { title: report ? `Direção · ${report.title}` : "Direção · Relatórios" };
}

export default async function DirectorReportPage({
  params,
}: {
  params: Promise<{ relatorio: string }>;
}) {
  const report = findDirectorReport((await params).relatorio);
  if (!report) notFound();

  return (
    <InstitutionalPlaceholder
      eyebrow="Direção · Relatórios"
      title={report.title}
      description={report.description}
      backHref="/direcao/relatorios"
      backLabel="Relatórios"
    />
  );
}
