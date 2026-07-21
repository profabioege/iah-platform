import type { Metadata } from "next";

import { InstitutionalPlaceholder } from "@/components/layout/institutional-placeholder";

export const metadata: Metadata = { title: "Mantenedor · Configurações" };

export default function MantenedorConfiguracoesPage() {
  return (
    <InstitutionalPlaceholder
      eyebrow="Mantenedor"
      title="Configurações"
      description="Preferências da rede e das unidades vinculadas."
      backHref="/mantenedor"
      backLabel="Mantenedor"
    />
  );
}
