import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { loadNetworkUnits } from "../network-data";

export const metadata: Metadata = { title: "Mantenedor · Unidades" };

export default async function MantenedorUnidadesPage() {
  const units = await loadNetworkUnits();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Mantenedor</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Unidades</h1>
        <p className="text-sm text-muted-foreground">
          {units.length === 1 ? "1 unidade ativa na rede." : `${units.length} unidades ativas na rede.`}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4" aria-hidden />
            Unidades da rede
          </CardTitle>
          <CardDescription>Novas unidades aparecem aqui quando a rede crescer.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border border-t border-border">
            {units.map((unit) => (
              <li key={unit.institution.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{unit.institution.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {unit.teacherCount === 1 ? "1 professor(a)" : `${unit.teacherCount} professores(as)`} ·{" "}
                    {unit.studentCount === 1 ? "1 aluno" : `${unit.studentCount} alunos`}
                  </span>
                </div>
                <Badge variant="outline" className="text-muted-foreground">
                  {unit.utilizationPercent}% de utilização
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
