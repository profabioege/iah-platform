import type { Metadata } from "next";

import { getWorkspaceContext } from "@/modules/workspace";

import { AvaliacaoWizard } from "./avaliacao-wizard";

export const metadata: Metadata = {
  title: "DocentIAH · Avaliação",
  description: "Especifique uma avaliação, com adaptações pedagógicas quando precisar.",
};

export default async function AvaliacaoPage() {
  const workspace = await getWorkspaceContext();

  return <AvaliacaoWizard defaultSubjectName={workspace?.subjects[0]?.name ?? null} />;
}
