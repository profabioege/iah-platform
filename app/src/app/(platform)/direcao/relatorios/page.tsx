import type { Metadata } from "next";

import { InstitutionalLinkCard } from "@/components/layout/institutional-link-card";

import { DIRECTOR_REPORTS } from "./reports";

export const metadata: Metadata = { title: "Direção · Relatórios" };

export default function DirecaoRelatoriosPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Direção</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Estrutura pronta para os relatórios da unidade — geração completa chega numa etapa futura.
        </p>
      </header>

      <section aria-label="Relatórios da Direção" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DIRECTOR_REPORTS.map((report) => (
          <InstitutionalLinkCard
            key={report.slug}
            icon={report.icon}
            title={report.title}
            description={report.description}
            href={`/direcao/relatorios/${report.slug}`}
          />
        ))}
      </section>
    </div>
  );
}
