import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { loadNetworkUnits } from "../network-data";

export const metadata: Metadata = { title: "Mantenedor · Implantação" };

/**
 * Status agregado de implantação por unidade — a experiência guiada de
 * implantação em si (8 etapas) é operacional e vive em
 * `/direcao/implantacao`; aqui o Mantenedor só acompanha o andamento.
 */
export default async function MantenedorImplantacaoPage() {
  const units = await loadNetworkUnits();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Mantenedor</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Implantação</h1>
        <p className="text-sm text-muted-foreground">
          Andamento da implantação do Método IAH® por unidade.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-4" aria-hidden />
            Implantação por unidade
          </CardTitle>
          <CardDescription>O passo a passo detalhado é conduzido pela Direção de cada unidade.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border border-t border-border">
            {units.map((unit) => (
              <li key={unit.institution.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
                <span className="text-sm font-medium">{unit.institution.name}</span>
                <Badge variant="outline" className="text-muted-foreground">
                  {unit.hasActivity ? "Operação iniciada" : "Aguardando primeira atividade"}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
