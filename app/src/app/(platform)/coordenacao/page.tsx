import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ClipboardCheck, GraduationCap, Send } from "lucide-react";

import { getDefaultRepositories } from "@/modules/platform";
import { getWorkspaceContext } from "@/modules/workspace";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { loadPedagogicalOverview } from "./assessment-data";

export const metadata: Metadata = {
  title: "Acompanhamento pedagógico",
  description: "Professores, turmas, atividades, avaliações e intervenção pedagógica.",
};

/**
 * Início da Coordenação Pedagógica (D-046). Escopo: pedagogia da
 * unidade. Linguagem de apoio, nunca vigilância — sem ranking nominal
 * de alunos, sem detalhe de neurodivergência exposto aqui.
 */
export default async function CoordenacaoPage() {
  const workspace = await getWorkspaceContext();
  if (!workspace) return null;

  const repositories = getDefaultRepositories();
  const [overview, classrooms] = await Promise.all([
    loadPedagogicalOverview(workspace),
    Promise.resolve(workspace.classrooms),
  ]);
  const turmasComAtividade = await Promise.all(
    classrooms.map(async (classroom) => {
      const assignments = await repositories.missionAssignments.listByClassroom(
        workspace.institution.id,
        classroom.id,
      );
      return assignments.length > 0;
    }),
  );
  const turmasQuePrecisamIntervencao =
    overview.turmasSemParticipacao.length +
    turmasComAtividade.filter((hasActivity) => !hasActivity).length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Coordenação Pedagógica
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Acompanhamento pedagógico
        </h1>
      </header>

      <section aria-label="Indicadores pedagógicos" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <IndicatorCard
          icon={ClipboardCheck}
          label="Atividades publicadas"
          value={overview.indicators.publishedActivities}
        />
        <IndicatorCard
          icon={AlertCircle}
          label="Correções pendentes"
          value={overview.indicators.awaitingValidation}
        />
        <IndicatorCard
          icon={Send}
          label="Devolutivas enviadas"
          value={overview.indicators.releasedResults}
        />
        <IndicatorCard
          icon={GraduationCap}
          label="Turmas que precisam de intervenção"
          value={turmasQuePrecisamIntervencao}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Acompanhamento docente</CardTitle>
          <CardDescription>Apoio ao professor, não vigilância.</CardDescription>
        </CardHeader>
        <CardContent>
          {overview.professoresComCorrecoesPendentes.length === 0 &&
          overview.turmasSemParticipacao.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum acompanhamento pendente no momento.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {overview.professoresComCorrecoesPendentes.map((row) => (
                <li key={row.teacherName} className="flex flex-col">
                  <span className="text-sm font-medium">{row.teacherName}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.pendentes === 1 ? "1 correção pendente" : `${row.pendentes} correções pendentes`}
                  </span>
                </li>
              ))}
              {overview.turmasSemParticipacao.map((name) => (
                <li key={name} className="flex flex-col">
                  <span className="text-sm font-medium">{name}</span>
                  <span className="text-xs text-muted-foreground">Sem participação nas atividades publicadas</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Materiais adaptados utilizados: ainda não há dado real — a especificação de adaptações
            no DocentIAH ainda não é salva em lugar nenhum, nesta etapa.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aprendizagem e intervenção</CardTitle>
          <CardDescription>Dificuldades por questão e turmas que precisam de apoio.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Link
            href="/coordenacao/atividades-avaliacoes"
            className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
          >
            Ver desempenho por questão
          </Link>
          <p className="text-sm text-muted-foreground">
            Histórico de desempenho ao longo do tempo e intervenções em andamento ainda não estão
            disponíveis — dependem de dados que a plataforma ainda não acumulou.
          </p>
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
