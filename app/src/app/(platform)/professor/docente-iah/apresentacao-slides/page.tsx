import type { Metadata } from "next";

import { getWorkspaceContext } from "@/modules/workspace";

import { SlidesWizard } from "./slides-wizard";

export const metadata: Metadata = {
  title: "DocentIAH · Apresentação de slides",
  description: "Gere uma apresentação de slides pedagógica a partir do contexto da sua aula.",
};

export default async function ApresentacaoSlidesPage() {
  const workspace = await getWorkspaceContext();

  return <SlidesWizard defaultSubjectName={workspace?.subjects[0]?.name ?? null} />;
}
