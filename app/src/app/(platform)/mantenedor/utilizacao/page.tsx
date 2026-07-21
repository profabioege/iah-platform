import type { Metadata } from "next";
import { Activity } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { loadNetworkUnits } from "../network-data";

export const metadata: Metadata = { title: "Mantenedor · Utilização" };

export default async function MantenedorUtilizacaoPage() {
  const units = await loadNetworkUnits();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Mantenedor</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Utilização</h1>
        <p className="text-sm text-muted-foreground">
          Percentual de estudantes com participação registrada, por unidade.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4" aria-hidden />
            Utilização por unidade
          </CardTitle>
          <CardDescription>Sem detalhe individual — só indicador agregado.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {units.map((unit) => (
            <div key={unit.institution.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{unit.institution.name}</span>
                <span className="text-muted-foreground">{unit.utilizationPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${unit.utilizationPercent}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
