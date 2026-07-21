import type { Metadata } from "next";

import { InstitutionalPlaceholder } from "@/components/layout/institutional-placeholder";

export const metadata: Metadata = { title: "Direção · Evidências e auditoria" };

export default function DirecaoEvidenciasPage() {
  return (
    <InstitutionalPlaceholder
      eyebrow="Direção"
      title="Evidências e auditoria"
      description="Registro histórico das ações institucionais, para auditoria e prestação de contas."
      backHref="/direcao"
      backLabel="Direção"
    />
  );
}
