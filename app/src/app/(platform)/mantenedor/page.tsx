import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Building2, GraduationCap, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { loadNetworkUnits } from "./network-data";

export const metadata: Metadata = {
  title: "Visão estratégica da rede",
  description: "Dados agregados e comparativos das unidades da rede.",
};

/**
 * Início do Mantenedor (D-046). Escopo: rede/grupo de unidades — dados
 * agregados, nunca respostas individuais ou correções específicas. Hoje
 * a rede tem uma única unidade ativa (Instituto Horizonte); comparação
 * entre unidades fica honesta sobre isso em vez de fingir gráfico.
 */
export default async function MantenedorPage() {
  const units = await loadNetworkUnits();

  const unidadesAtivas = units.length;
  const professoresAtivos = units.reduce((sum, u) => sum + u.teacherCount, 0);
  const estudantesAtendidos = units.reduce((sum, u) => sum + u.studentCount, 0);
  const taxaUtilizacao =
    estudantesAtendidos > 0
      ? Math.round(
          (units.reduce((sum, u) => sum + u.activeStudents, 0) / estudantesAtendidos) * 100,
        )
      : 0;

  const unidadesAtencao = units.filter((u) => !u.hasActivity || u.utilizationPercent < 30);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Mantenedor</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Visão estratégica da rede
        </h1>
      </header>

      <section aria-label="Indicadores da rede" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <IndicatorCard icon={Building2} label="Unidades ativas" value={unidadesAtivas} />
        <IndicatorCard icon={GraduationCap} label="Professores ativos" value={professoresAtivos} />
        <IndicatorCard icon={UsersRound} label="Estudantes atendidos" value={estudantesAtendidos} />
        <IndicatorCard icon={Activity} label="Taxa geral de utilização" value={`${taxaUtilizacao}%`} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Unidades que precisam de atenção</CardTitle>
          <CardDescription>Baixa adesão, pouca atividade recente ou implantação pendente.</CardDescription>
        </CardHeader>
        <CardContent>
          {unidadesAtencao.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma unidade com pendências no momento.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {unidadesAtencao.map((unit) => (
                <li key={unit.institution.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{unit.institution.name}</span>
                  <Badge variant="outline" className="text-muted-foreground">
                    {unit.utilizationPercent}% de utilização
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo do período</CardTitle>
          <CardDescription>Comparação entre unidades e evolução da utilização.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {unidadesAtivas <= 1 ? (
            <p className="text-sm text-muted-foreground">
              Comparação entre unidades fica disponível quando a rede tiver mais de uma unidade
              ativa. Hoje: {estudantesAtendidos} estudantes atendidos em {unidadesAtivas} unidade.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {units.map((unit) => (
                <li key={unit.institution.id} className="flex items-center justify-between text-sm">
                  <span>{unit.institution.name}</span>
                  <span className="text-muted-foreground">{unit.utilizationPercent}% de utilização</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/mantenedor/relatorios" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
            Ver relatório executivo
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function IndicatorCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-2">
        <Icon className="size-4 text-primary" />
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
