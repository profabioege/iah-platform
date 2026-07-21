import type { Metadata } from "next";
import { Users } from "lucide-react";

import { getWorkspaceContext } from "@/modules/workspace";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { loadPedagogicalOverview } from "../assessment-data";

export const metadata: Metadata = { title: "Coordenação · Turmas" };

export default async function CoordenacaoTurmasPage() {
  const workspace = await getWorkspaceContext();
  if (!workspace) return null;

  const overview = await loadPedagogicalOverview(workspace);
  const semParticipacao = new Set(overview.turmasSemParticipacao);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Coordenação Pedagógica
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Turmas</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4" aria-hidden />
            Situação pedagógica por turma
          </CardTitle>
          <CardDescription>Turmas com atividades publicadas e sem nenhuma entrega.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border border-t border-border">
            {workspace.classrooms.map((classroom) => (
              <li key={classroom.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
                <span className="text-sm font-medium">{classroom.name}</span>
                {semParticipacao.has(classroom.name) ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    Precisa de apoio
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Sem pendência
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
