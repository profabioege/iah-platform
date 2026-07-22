import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isConexoesIahEnabled } from "@/lib/feature-flags";
import { getWorkspaceContext } from "@/modules/workspace";

import { ConexoesWizard } from "./conexoes-wizard";

export const metadata: Metadata = {
  title: "DocentIAH · Conexões IAH",
  description: "Conecte conteúdos do currículo a experiências investigativas de Inteligência Artificial & Humanidades.",
};

export default async function ConexoesIahPage() {
  if (!isConexoesIahEnabled()) notFound();

  const workspace = await getWorkspaceContext();

  return <ConexoesWizard classrooms={workspace?.classrooms ?? []} />;
}
