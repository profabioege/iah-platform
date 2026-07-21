import type { Metadata } from "next";

import { InstitutionalLinkCard } from "@/components/layout/institutional-link-card";

import { COORDINATOR_REPORTS } from "./reports";

export const metadata: Metadata = { title: "Coordenação · Relatórios pedagógicos" };

export default function CoordenacaoRelatoriosPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Coordenação Pedagógica
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Relatórios pedagógicos</h1>
        <p className="text-sm text-muted-foreground">
          Estrutura pronta — geração completa chega numa etapa futura.
        </p>
      </header>

      <section aria-label="Relatórios da Coordenação" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {COORDINATOR_REPORTS.map((report) => (
          <InstitutionalLinkCard
            key={report.slug}
            icon={report.icon}
            title={report.title}
            description={report.description}
            href={`/coordenacao/relatorios/${report.slug}`}
          />
        ))}
      </section>
    </div>
  );
}
