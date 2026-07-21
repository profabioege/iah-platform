import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LinkCard } from "../../quick-shortcuts";
import { PLANNING_LEVELS } from "./levels";

export const metadata: Metadata = {
  title: "DocentIAH · Planejar",
  description: "Da aula ao planejamento anual, num só lugar.",
};

/**
 * Hub "Planejar" do DocentIAH — hierarquia Aula → Sequência didática →
 * Unidade → Bimestre → Planejamento anual. O Planejamento Anual não é
 * mais um atalho isolado do Painel (D-044); mora aqui, no nível certo.
 */
export default function PlanejarPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Link
        href="/professor/docente-iah"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        DocentIAH
      </Link>

      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          DocentIAH · Planejar
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Em que escala você quer planejar?
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Da aula de hoje ao planejamento do ano inteiro — cada escala tem seu
          próprio lugar.
        </p>
      </header>

      <section aria-label="Escalas de planejamento" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PLANNING_LEVELS.map((level) => (
          <LinkCard
            key={level.slug}
            icon={level.icon}
            title={level.title}
            description={level.description}
            href={`/professor/docente-iah/planejar/${level.slug}`}
          />
        ))}
      </section>
    </div>
  );
}
