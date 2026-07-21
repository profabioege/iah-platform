import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { assertMaterialOwnership, getDefaultDocentiahRepositories } from "@/modules/docentiah";
import { getWorkspaceContext } from "@/modules/workspace";

import { docentiahSlidesGenerationOutputSchema } from "@/lib/ai/prompts/docentiah/slides";
import { SlidesResult } from "../../apresentacao-slides/slides-result";

export const metadata: Metadata = {
  title: "DocentIAH · Meus materiais",
};

/** Reabre um material salvo em "Meus materiais" para visualização e edição — mesmo editor do fim do wizard. */
export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getWorkspaceContext();
  if (!workspace || !workspace.user.teacherId) notFound();

  const repositories = getDefaultDocentiahRepositories();
  const material = await repositories.materials.getById(workspace.institution.id, id);
  if (!material) notFound();

  try {
    assertMaterialOwnership(material, workspace.institution.id, workspace.user.teacherId);
  } catch {
    notFound();
  }

  const parsedOutput = docentiahSlidesGenerationOutputSchema.safeParse(material.outputData);
  if (!parsedOutput.success) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href="/professor/docente-iah/materiais"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Meus materiais
      </Link>
      <SlidesResult materialId={material.id} initialOutput={parsedOutput.data} />
    </div>
  );
}
