import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { isConexoesIahEnabled } from "@/lib/feature-flags";
import { assertConnectionOwnership, getDefaultConexoesIahRepositories } from "@/modules/conexoes-iah";
import { getDefaultDocentiahRepositories } from "@/modules/docentiah";
import type { CorrelatedLessonContent } from "@/modules/conexoes-iah";
import { getWorkspaceContext } from "@/modules/workspace";

import { LessonResult } from "../../lesson-result";

export const metadata: Metadata = {
  title: "DocentIAH · Meus materiais",
};

/** Reabre uma Aula de laboratório correlacionada salva em "Meus materiais". */
export default async function CorrelatedLessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isConexoesIahEnabled()) notFound();

  const { id } = await params;
  const workspace = await getWorkspaceContext();
  if (!workspace || !workspace.user.teacherId) notFound();

  const materialRepositories = getDefaultDocentiahRepositories();
  const material = await materialRepositories.materials.getById(workspace.institution.id, id);
  if (!material || material.type !== "laboratory_lesson") notFound();
  if (material.teacherId !== workspace.user.teacherId) notFound();

  const conexoesRepositories = getDefaultConexoesIahRepositories();
  const correlatedLesson = await conexoesRepositories.correlatedLessons.getByGeneratedMaterialId(material.id);
  if (!correlatedLesson) notFound();

  const connection = await conexoesRepositories.connections.getById(workspace.institution.id, correlatedLesson.curriculumConnectionId);
  if (!connection) notFound();

  try {
    assertConnectionOwnership(connection, workspace.institution.id, workspace.user.teacherId);
  } catch {
    notFound();
  }

  const lesson = material.outputData as CorrelatedLessonContent;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href="/professor/docente-iah/materiais"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Meus materiais
      </Link>
      <LessonResult connectionId={connection.id} materialId={material.id} initialLesson={lesson} />
    </div>
  );
}
