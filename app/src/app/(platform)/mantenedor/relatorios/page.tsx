import type { Metadata } from "next";

import { InstitutionalLinkCard } from "@/components/layout/institutional-link-card";

import { MAINTAINER_REPORTS } from "./reports";

export const metadata: Metadata = { title: "Mantenedor · Relatórios executivos" };

export default function MantenedorRelatoriosPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Mantenedor</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Relatórios executivos</h1>
        <p className="text-sm text-muted-foreground">
          Estrutura pronta para os relatórios da rede — geração completa chega numa etapa futura.
        </p>
      </header>

      <section aria-label="Relatórios do Mantenedor" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MAINTAINER_REPORTS.map((report) => (
          <InstitutionalLinkCard
            key={report.slug}
            icon={report.icon}
            title={report.title}
            description={report.description}
            href={`/mantenedor/relatorios/${report.slug}`}
          />
        ))}
      </section>
    </div>
  );
}
