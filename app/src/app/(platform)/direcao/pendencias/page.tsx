import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { getDefaultAssessmentRepositories } from "@/modules/assessment";
import { getWorkspaceContext } from "@/modules/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { buildDirectorAttentionItems } from "../assignment-signals";

export const metadata: Metadata = { title: "Direção · Pendências" };

export default async function DirecaoPendenciasPage() {
  const workspace = await getWorkspaceContext();
  if (!workspace) return null;

  const assessmentRepositories = getDefaultAssessmentRepositories();
  const assignments = await assessmentRepositories.assignments.listByInstitution(
    workspace.institution.id,
  );
  const submissionsByAssignment = Object.fromEntries(
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

  const items = buildDirectorAttentionItems({
    classrooms: workspace.classrooms,
    assignments,
    submissionsByAssignment,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Direção</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Pendências</h1>
        <p className="text-sm text-muted-foreground">
          Turmas sem publicação, entregas sem devolutiva e vínculos incompletos.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4" aria-hidden />
            Pendências críticas
          </CardTitle>
          <CardDescription>{items.length} no momento.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma pendência crítica.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {items.map((item) => (
                <li key={item.key} className="flex flex-col px-4 py-3 md:px-6">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
