import { notFound } from "next/navigation";

import { localMissionRepository } from "@/modules/library";
import { requirePlatformDataMode } from "@/lib/platform-access";
import { createLearningCycleService } from "@/modules/platform";
import { getRequestRepositories } from "@/modules/platform/infrastructure/request-repositories";
import { getWorkspaceContext } from "@/modules/workspace";
import { emptyStudentWork } from "@/modules/classroom";

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
  // Primeira instrução: nenhuma consulta a seed, sessão ou repositório
  // pode acontecer antes da recusa no estado indisponível.
  const mode = requirePlatformDataMode();

  const { id } = await params;
  const mission = await localMissionRepository.getById(id);

  if (!mission) notFound();

  const workspace = await getWorkspaceContext();

  let source: StudentWorkSource;
  if (mode === "supabase") {
    const classroomId = workspace?.classrooms[0]?.id;
    let initialWork = emptyStudentWork(mission.id);
    if (workspace?.role === "student" && workspace.user.studentId && classroomId) {
      const repositories = await getRequestRepositories();

      // Para o Aluno, a Missão só existe se a Turma dele a recebeu. Sem
      // esta conferência, trocar o id na URL mostrava o conteúdo de uma
      // Missão que o professor ainda não publicou. As Server Actions do
      // ciclo aplicam a mesma regra.
      const atividades = await repositories.missionAssignments.listByClassroom(
        workspace.institution.id,
        classroomId,
      );
      const disponivel = atividades.some(
        (atividade) => atividade.missionId === mission.id && atividade.status === "published",
      );
      if (!disponivel) notFound();

      initialWork = await createLearningCycleService(repositories).getStudentWork({
        institutionId: workspace.institution.id,
        classroomId,
        studentId: workspace.user.studentId,
        missionId: mission.id,
      });
    }
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

  return <MissionFlow mission={mission} source={source} />;
}
