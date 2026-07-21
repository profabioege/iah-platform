import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";

import { getDefaultRepositories } from "@/modules/platform";
import { getWorkspaceContext } from "@/modules/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { loadPedagogicalOverview } from "../assessment-data";

export const metadata: Metadata = { title: "Coordenação · Professores" };

export default async function CoordenacaoProfessoresPage() {
  const workspace = await getWorkspaceContext();
  if (!workspace) return null;

  const repositories = getDefaultRepositories();
  const [teachers, overview] = await Promise.all([
    repositories.teachers.listByInstitution(workspace.institution.id),
    loadPedagogicalOverview(workspace),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Coordenação Pedagógica
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Professores</h1>
        <p className="text-sm text-muted-foreground">Acompanhamento de apoio, não avaliação de desempenho.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="size-4" aria-hidden />
            Corpo docente
          </CardTitle>
          <CardDescription>Correções pendentes por professor.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border border-t border-border">
            {teachers.map((teacher) => {
              const pendentes =
                overview.professoresComCorrecoesPendentes.find((row) => row.teacherName === teacher.name)
                  ?.pendentes ?? 0;
              return (
                <li key={teacher.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
                  <span className="text-sm font-medium">{teacher.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {pendentes === 0 ? "Em dia" : `${pendentes} correções pendentes`}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
