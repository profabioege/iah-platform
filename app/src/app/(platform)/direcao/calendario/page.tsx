import type { Metadata } from "next";

import { InstitutionalPlaceholder } from "@/components/layout/institutional-placeholder";

export const metadata: Metadata = { title: "Direção · Calendário institucional" };

export default function DirecaoCalendarioPage() {
  return (
    <InstitutionalPlaceholder
      eyebrow="Direção"
      title="Calendário institucional"
      description="Prazos, eventos e datas-chave da unidade num só lugar."
      backHref="/direcao"
      backLabel="Direção"
    />
  );
}
