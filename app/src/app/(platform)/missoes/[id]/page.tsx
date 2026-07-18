import { notFound } from "next/navigation";

import { localMissionRepository } from "@/modules/library";

import { MissionFlow } from "./mission-flow/mission-flow";

/**
 * Tela de uma Missão — Mission Flow (docs/MISSION_STUDIO.md não; ver
 * decisão em DECISIONS.md D-027): sequência de microetapas em vez de
 * página única, para reduzir carga cognitiva. O conteúdo (11 blocos,
 * docs/MISSION.md) é o mesmo de sempre — só a apresentação mudou.
 */
export default async function MissaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mission = await localMissionRepository.getById(id);

  if (!mission) notFound();

  return <MissionFlow mission={mission} />;
}
