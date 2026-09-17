import type { Metadata } from "next";

import { requirePlatformDataMode } from "@/lib/platform-access";

import { loadDemoStudioSeed } from "../demo-studio-seed";
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
  const demoSeed = requirePlatformDataMode() === "demo" ? await loadDemoStudioSeed() : [];
  const { id } = await params;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <MissionEditor missionId={id} demoSeed={demoSeed} />
    </div>
  );
}
