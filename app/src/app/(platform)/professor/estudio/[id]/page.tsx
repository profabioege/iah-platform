import type { Metadata } from "next";

import { MissionEditor } from "./mission-editor";

export const metadata: Metadata = {
  title: "Editor de Missão",
  description: "Edite, versione e publique uma Missão no Estúdio.",
};

/** Editor do Mission Studio — a missão é carregada no cliente (localStorage). */
export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <MissionEditor missionId={id} />
    </div>
  );
}
