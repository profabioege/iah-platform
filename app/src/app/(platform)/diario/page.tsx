import { localMissionRepository } from "@/modules/library";
import { isAuthConfigured } from "@/lib/auth-flags";
import { getWorkspaceContext } from "@/modules/workspace";

import { DiarioList, type MissionRef } from "./diario-list";

/**
 * Diário do Auditor — reúne as reflexões que o aluno registrou nas Missões.
 * O servidor fornece os títulos das Missões; a listagem (cliente) lê as
 * reflexões salvas no dispositivo e as cruza.
 */
export default async function DiarioPage() {
  const missions = await localMissionRepository.list();
  const refs: MissionRef[] = missions.map((m) => ({
    id: m.id,
    number: m.number,
    title: m.title,
  }));

  const workspace = isAuthConfigured() ? null : await getWorkspaceContext();
  const scope = workspace
    ? {
        institutionId: workspace.institution.id,
        ownerId: workspace.user.studentId ?? workspace.user.id,
      }
    : null;

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

      <DiarioList missions={refs} scope={scope} />
    </div>
  );
}
