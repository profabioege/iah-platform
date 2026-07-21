import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ClipboardCheck,
  GraduationCap,
  Send,
  UsersRound,
} from "lucide-react";

import {
  getDefaultAssessmentRepositories,
  type AssessmentSubmission,
} from "@/modules/assessment";
import { getDefaultRepositories } from "@/modules/platform";
import { getWorkspaceContext } from "@/modules/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { buildDirectorAttentionItems } from "./assignment-signals";

export const metadata: Metadata = {
  title: "Visão da unidade",
  description: "Acompanhamento operacional e institucional da unidade.",
};

/**
 * Início da Direção (D-046) — sucede o antigo Painel do Gestor genérico.
 * Escopo: uma unidade escolar. No máximo 4 indicadores + 2 blocos, sem
 * detalhe pedagógico excessivo (isso é escopo da Coordenação).
 */
export default async function DirecaoPage() {
  const workspace = await getWorkspaceContext();
  if (!workspace) return null; // middleware garante sessão; guarda defensiva

  const repositories = getDefaultRepositories();
  const assessmentRepositories = getDefaultAssessmentRepositories();

  const [teachers, missionRecords] = await Promise.all([
    repositories.teachers.listByInstitution(workspace.institution.id),
    repositories.missions.list(),
  ]);
  const activeMissionId = missionRecords[0]?.id ?? "";

  const classroomStats = await Promise.all(
    workspace.classrooms.map(async (classroom) => {
      const [students, progress, missionAssignments] = await Promise.all([
        repositories.students.listByClassroom(workspace.institution.id, classroom.id),
        activeMissionId
          ? repositories.missionProgress.listByClassroomMission(
              workspace.institution.id,
              classroom.id,
              activeMissionId,
            )
          : Promise.resolve([]),
        repositories.missionAssignments.listByClassroom(workspace.institution.id, classroom.id),
      ]);
      const activeStudents = progress.filter((item) => item.status !== "nao_acessou").length;
      return {
        totalStudents: students.length,
        activeStudents,
        hasActivity: missionAssignments.length > 0,
      };
    }),
  );

  const totalStudents = classroomStats.reduce((sum, c) => sum + c.totalStudents, 0);
  const activeStudents = classroomStats.reduce((sum, c) => sum + c.activeStudents, 0);
  const classroomsComAtividade = classroomStats.filter((c) => c.hasActivity).length;
  const participacao = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

  const assignments = await assessmentRepositories.assignments.listByInstitution(
    workspace.institution.id,
  );
  const submissionsByAssignment: Record<string, AssessmentSubmission[]> = Object.fromEntries(
    await Promise.all(
      assignments.map(async (assignment) => [
        assignment.id,
        await assessmentRepositories.submissions.listByAssignment(
          workspace.institution.id,
          assignment.id,
        ),
      ]),
    ),
  );
  const allSubmissions = Object.values(submissionsByAssignment).flat();

  const attentionItems = buildDirectorAttentionItems({
    classrooms: workspace.classrooms,
    assignments,
    submissionsByAssignment,
  });

  const atividadesAbertas = assignments.filter(
    (a) => a.publicationStatus === "published",
  ).length;
  const entregas = allSubmissions.filter((s) => s.status !== "draft").length;
  const correcoesAguardando = allSubmissions.filter((s) => s.status === "submitted").length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Direção</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Visão da unidade</h1>
        <p className="text-sm text-muted-foreground">
          {workspace.institution.name} · Ano letivo {workspace.schoolYear.label}
        </p>
      </header>

      <section aria-label="Indicadores da unidade" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <IndicatorCard icon={GraduationCap} label="Professores ativos" value={teachers.length} />
        <IndicatorCard
          icon={UsersRound}
          label="Turmas com atividade recente"
          value={`${classroomsComAtividade}/${workspace.classrooms.length}`}
        />
        <IndicatorCard icon={Send} label="Participação dos alunos" value={`${participacao}%`} />
        <IndicatorCard
          icon={AlertTriangle}
          label="Pendências críticas"
          value={attentionItems.length}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Precisa da sua atenção</CardTitle>
          <CardDescription>Turmas, entregas e vínculos que pedem uma decisão.</CardDescription>
        </CardHeader>
        <CardContent>
          {attentionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pendência crítica no momento.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {attentionItems.map((item) => (
                <li key={item.key} className="flex flex-col">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo institucional</CardTitle>
          <CardDescription>Atividades, entregas e correções da unidade.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-3 gap-4">
            <div className="flex flex-col">
              <dt className="text-xs text-muted-foreground">Atividades abertas</dt>
              <dd className="text-xl font-semibold">{atividadesAbertas}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-xs text-muted-foreground">Entregas</dt>
              <dd className="text-xl font-semibold">{entregas}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-xs text-muted-foreground">Correções aguardando</dt>
              <dd className="text-xl font-semibold">{correcoesAguardando}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3">
            <Link href="/direcao/relatorios" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
              <ClipboardCheck className="size-4" />
              Ver relatório da unidade
            </Link>
            <Link
              href="/direcao/implantacao"
              className={cn(buttonVariants({ variant: "ghost" }), "w-fit")}
            >
              Ver implantação institucional
            </Link>
          </div>
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
