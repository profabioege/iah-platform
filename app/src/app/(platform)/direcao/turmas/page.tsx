import type { Metadata } from "next";
import { UsersRound } from "lucide-react";

import { getDefaultRepositories } from "@/modules/platform";
import { getWorkspaceContext } from "@/modules/workspace";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Direção · Turmas" };

export default async function DirecaoTurmasPage() {
  const workspace = await getWorkspaceContext();
  if (!workspace) return null;

  const repositories = getDefaultRepositories();
  const rows = await Promise.all(
    workspace.classrooms.map(async (classroom) => {
      const [students, missionAssignments] = await Promise.all([
        repositories.students.listByClassroom(workspace.institution.id, classroom.id),
        repositories.missionAssignments.listByClassroom(workspace.institution.id, classroom.id),
      ]);
      return {
        id: classroom.id,
        name: classroom.name,
        grade: classroom.grade,
        studentCount: students.length,
        hasActivity: missionAssignments.length > 0,
      };
    }),
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Direção</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Turmas</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length === 1 ? "1 turma configurada" : `${rows.length} turmas configuradas`} no ciclo atual.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="size-4" aria-hidden />
            Operação por turma
          </CardTitle>
          <CardDescription>Matrículas e atividade recente.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma turma cadastrada ainda.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{row.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {row.grade ?? "Série não informada"} ·{" "}
                      {row.studentCount === 1 ? "1 aluno" : `${row.studentCount} alunos`}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground">
                    {row.hasActivity ? "Com atividade recente" : "Sem atividade recente"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
