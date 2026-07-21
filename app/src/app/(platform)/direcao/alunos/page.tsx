import type { Metadata } from "next";
import { UserRound } from "lucide-react";

import { getDefaultRepositories } from "@/modules/platform";
import { getWorkspaceContext } from "@/modules/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Direção · Alunos" };

export default async function DirecaoAlunosPage() {
  const workspace = await getWorkspaceContext();
  if (!workspace) return null;

  const repositories = getDefaultRepositories();
  const missionRecords = await repositories.missions.list();
  const activeMissionId = missionRecords[0]?.id ?? "";

  const rows = await Promise.all(
    workspace.classrooms.map(async (classroom) => {
      const [students, progress] = await Promise.all([
        repositories.students.listByClassroom(workspace.institution.id, classroom.id),
        activeMissionId
          ? repositories.missionProgress.listByClassroomMission(
              workspace.institution.id,
              classroom.id,
              activeMissionId,
            )
          : Promise.resolve([]),
      ]);
      const active = progress.filter((item) => item.status !== "nao_acessou").length;
      return { classroomName: classroom.name, total: students.length, active };
    }),
  );

  const totalStudents = rows.reduce((sum, r) => sum + r.total, 0);
  const activeStudents = rows.reduce((sum, r) => sum + r.active, 0);
  const participacao = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Direção</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Alunos</h1>
        <p className="text-sm text-muted-foreground">
          {totalStudents} matriculados · {participacao}% com participação registrada na Missão ativa.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="size-4" aria-hidden />
            Participação por turma
          </CardTitle>
          <CardDescription>A camada institucional mostra tendências agregadas; casos individuais ficam no acompanhamento pedagógico.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhum aluno matriculado ainda.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {rows.map((row) => (
                <li key={row.classroomName} className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
                  <span className="text-sm font-medium">{row.classroomName}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.active}/{row.total} alunos ativos
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
