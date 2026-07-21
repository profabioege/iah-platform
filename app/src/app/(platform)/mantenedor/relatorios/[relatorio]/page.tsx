import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InstitutionalPlaceholder } from "@/components/layout/institutional-placeholder";

import { findMaintainerReport } from "../reports";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ relatorio: string }>;
}): Promise<Metadata> {
  const report = findMaintainerReport((await params).relatorio);
  return { title: report ? `Mantenedor · ${report.title}` : "Mantenedor · Relatórios" };
}

export default async function MaintainerReportPage({
  params,
}: {
  params: Promise<{ relatorio: string }>;
}) {
  const report = findMaintainerReport((await params).relatorio);
  if (!report) notFound();

  return (
    <InstitutionalPlaceholder
      eyebrow="Mantenedor · Relatórios"
      title={report.title}
      description={report.description}
      backHref="/mantenedor/relatorios"
      backLabel="Relatórios"
    />
  );
}
