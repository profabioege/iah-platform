import type { Metadata } from "next";

import { InstitutionalPlaceholder } from "@/components/layout/institutional-placeholder";

export const metadata: Metadata = { title: "Coordenação · Aprendizagem" };

export default function CoordenacaoAprendizagemPage() {
  return (
    <InstitutionalPlaceholder
      eyebrow="Coordenação Pedagógica"
      title="Aprendizagem"
      description="Histórico de dificuldades por competência e evolução do desempenho ao longo do tempo."
      backHref="/coordenacao"
      backLabel="Coordenação Pedagógica"
      bridgeHref="/coordenacao/atividades-avaliacoes"
      bridgeLabel="Ver desempenho por questão"
    />
  );
}
