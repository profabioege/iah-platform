import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";

import { getDefaultRepositories } from "@/modules/platform";
import { getWorkspaceContext } from "@/modules/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Direção · Professores" };

export default async function DirecaoProfessoresPage() {
  const workspace = await getWorkspaceContext();
  if (!workspace) return null;

  const repositories = getDefaultRepositories();
  const teachers = await repositories.teachers.listByInstitution(workspace.institution.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Direção</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Professores</h1>
        <p className="text-sm text-muted-foreground">
          Corpo docente vinculado à unidade — {teachers.length === 1 ? "1 professor(a)" : `${teachers.length} professores(as)`}.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="size-4" aria-hidden />
            Corpo docente
          </CardTitle>
          <CardDescription>Nome e turmas vinculadas.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {teachers.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum professor cadastrado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {teachers.map((teacher) => {
                const classroomCount = workspace.classrooms.filter((classroom) =>
                  classroom.teacherIds.includes(teacher.id),
                ).length;
                return (
                  <li key={teacher.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{teacher.name}</span>
                      <span className="text-xs text-muted-foreground">{teacher.email}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {classroomCount === 1 ? "1 turma" : `${classroomCount} turmas`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
