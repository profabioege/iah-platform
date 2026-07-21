import type { Metadata } from "next";

import { InstitutionalPlaceholder } from "@/components/layout/institutional-placeholder";

export const metadata: Metadata = { title: "Coordenação · Formação docente" };

export default function CoordenacaoFormacaoDocentePage() {
  return (
    <InstitutionalPlaceholder
      eyebrow="Coordenação Pedagógica"
      title="Formação docente"
      description="Trilhas de formação continuada oferecidas aos professores da unidade."
      backHref="/coordenacao"
      backLabel="Coordenação Pedagógica"
    />
  );
}
