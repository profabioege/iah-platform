import { localMissionRepository } from "@/modules/library";
import { isAuthConfigured } from "@/lib/auth-flags";
import { getDefaultRepositories } from "@/modules/platform";
import { getWorkspaceContext } from "@/modules/workspace";

import { DiarioList, type DiarioSource, type MissionRef } from "./diario-list";

/**
 * Diário do Auditor — reúne as reflexões que o aluno registrou nas Missões.
 * O servidor fornece os títulos das Missões. No modo REAL (M22), o
 * servidor também já lê as reflexões do banco (fonte de verdade); no modo
 * demonstração, a listagem (cliente) lê do dispositivo.
 */
export default async function DiarioPage() {
  const missions = await localMissionRepository.list();
  const refs: MissionRef[] = missions.map((m) => ({
    id: m.id,
    number: m.number,
    title: m.title,
  }));

  const workspace = await getWorkspaceContext();

  let source: DiarioSource;
  if (isAuthConfigured()) {
    const studentId = workspace?.role === "student" ? workspace.user.studentId : null;
    const reflections =
      workspace && studentId
        ? await getDefaultRepositories().reflections.listByStudent(
            workspace.institution.id,
            studentId,
          )
        : [];
    const byId = new Map(refs.map((m) => [m.id, m]));
    source = {
      kind: "real",
      entries: reflections
        .filter((r): r is typeof r & { recordedAt: string } => r.recordedAt !== null)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
        .map((r) => ({
          work: {
            missionId: r.missionId,
            startedAt: null,
            production: "",
            productionDeliveredAt: null,
            reflection: r.text,
            reflectionRecordedAt: r.recordedAt,
            review: null,
            updatedAt: r.recordedAt,
          },
          mission: byId.get(r.missionId),
        })),
    };
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-widest text-chart-3">
          Registro de aprendizagem
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Diário do Auditor
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          O testemunho da sua trajetória como investigador da realidade — cada
          reflexão que você registrou ao concluir uma missão.
        </p>
      </header>

      <DiarioList missions={refs} source={source} />
    </div>
  );
}
