import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ASSESSMENT_LIFECYCLE_STATUS_LABEL, getAssessmentStatus, getDefaultAssessmentRepositories } from "@/modules/assessment";
import { getWorkspaceContext } from "@/modules/workspace";

export default async function AssessmentsPage() {
  const workspace = await getWorkspaceContext();
  if (!workspace || workspace.role !== "student") return null;
  const repositories = getDefaultAssessmentRepositories();
  const assignments = (
    await Promise.all(workspace.classrooms.map((classroom) =>
      repositories.assignments.listByClassroom(workspace.institution.id, classroom.id),
    ))
  ).flat().filter((item) => item.publicationStatus === "published");
  const assessments = await repositories.assessments.list(workspace.institution.id);

  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-6"><header><p className="text-xs font-semibold uppercase tracking-widest text-primary">Minha aprendizagem</p><h1 className="text-2xl font-semibold">Sondagens diagnósticas</h1><p className="text-sm text-muted-foreground">Atividades publicadas para suas turmas.</p></header><section className="grid gap-4 sm:grid-cols-2">{assignments.map((assignment) => { const assessment = assessments.find((item) => item.id === assignment.assessmentId); const status = getAssessmentStatus(assignment); return <Card key={assignment.id}><CardHeader><div className="flex items-start justify-between gap-3"><CardTitle>{assessment?.title ?? "Sondagem diagnóstica"}</CardTitle><Badge variant="outline">{ASSESSMENT_LIFECYCLE_STATUS_LABEL[status]}</Badge></div><CardDescription>De {new Date(assignment.startsAt).toLocaleString("pt-BR")} até {new Date(assignment.endsAt).toLocaleString("pt-BR")}</CardDescription></CardHeader><CardContent><Link href={`/avaliacoes/${assignment.id}`} className={cn(buttonVariants(), "w-full")}>Abrir atividade</Link></CardContent></Card>; })}{assignments.length === 0 ? <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhuma sondagem publicada para sua turma.</CardContent></Card> : null}</section></div>;
}
