import { notFound } from "next/navigation";

import { localMissionRepository } from "@/modules/library";
import { isAuthConfigured } from "@/lib/auth-flags";
import { createLearningCycleService, getDefaultRepositories } from "@/modules/platform";
import { getWorkspaceContext } from "@/modules/workspace";
import { emptyStudentWork } from "@/modules/classroom";
import { isMentorIAHEnabled } from "@/modules/mentor";

import { MissionFlow } from "./mission-flow/mission-flow";
import type { StudentWorkSource } from "./mission-flow/use-student-work";

/**
 * Tela de uma Missão — Mission Flow (docs/MISSION_STUDIO.md não; ver
 * decisão em DECISIONS.md D-027): sequência de microetapas em vez de
 * página única, para reduzir carga cognitiva. O conteúdo (11 blocos,
 * docs/MISSION.md) é o mesmo de sempre — só a apresentação mudou.
 *
 * M22: no modo real, o servidor já lê o `StudentWork` do banco (fonte de
 * verdade) e entrega pronto — as próximas gravações passam pelas Server
 * Actions de `mission-flow/actions.ts`, nunca por `localStorage`.
 */
export default async function MissaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mission = await localMissionRepository.getById(id);

  if (!mission) notFound();

  const workspace = await getWorkspaceContext();

  let source: StudentWorkSource;
  if (isAuthConfigured()) {
    const classroomId = workspace?.classrooms[0]?.id;
    const initialWork =
      workspace?.role === "student" && workspace.user.studentId && classroomId
        ? await createLearningCycleService(getDefaultRepositories()).getStudentWork({
            institutionId: workspace.institution.id,
            classroomId,
            studentId: workspace.user.studentId,
            missionId: mission.id,
          })
        : emptyStudentWork(mission.id);
    source = { kind: "real", initialWork };
  } else {
    const scope = workspace
      ? {
          institutionId: workspace.institution.id,
          ownerId: workspace.user.studentId ?? workspace.user.id,
        }
      : null;
    source = { kind: "demo", scope };
  }

  return (
    <MissionFlow
      mission={mission}
      source={source}
      mentorEnabled={isMentorIAHEnabled() && mission.status === "published"}
    />
  );
}
