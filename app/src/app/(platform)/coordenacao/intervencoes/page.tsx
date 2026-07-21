import type { Metadata } from "next";

import { InstitutionalPlaceholder } from "@/components/layout/institutional-placeholder";

export const metadata: Metadata = { title: "Coordenação · Intervenções" };

export default function CoordenacaoIntervencoesPage() {
  return (
    <InstitutionalPlaceholder
      eyebrow="Coordenação Pedagógica"
      title="Intervenções"
      description="Planos de apoio pedagógico em andamento, por turma ou aluno."
      backHref="/coordenacao"
      backLabel="Coordenação Pedagógica"
    />
  );
}
