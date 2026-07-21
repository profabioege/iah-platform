import type { Metadata } from "next";

import { localMissionRepository } from "@/modules/library";
import { getDefaultKnowledgeRepositories } from "@/modules/knowledge";
import {
  createInstitutionalClassMonitor,
  createMissionPublishingService,
  getDefaultRepositories,
} from "@/modules/platform";
import { getWorkspaceContext } from "@/modules/workspace";
import type { StudentMissionSnapshot } from "@/modules/classroom";

import { TurmasExplorer, type ClassroomLifecycle } from "./turmas-explorer";

export const metadata: Metadata = {
  title: "Turmas",
  description: "Percorra o fluxo completo: turma, Aula, Missão, entregas.",
};

/**
 * Learning Lifecycle (Sprint M17) — o fluxo Professor → Aluno → Professor
 * numa única tela: seleciona a turma, vê as Lessons dela, publica a
 * Mission de uma Lesson, e acompanha as entregas — tudo sobre a
 * arquitetura institucional (`modules/platform`), sem depender mais do
 * `simulated-class-monitor` (`modules/classroom`).
 */
export default async function TurmasPage() {
  const workspace = await getWorkspaceContext();
  if (!workspace) return null; // middleware garante sessão; guarda defensiva

  const repositories = getDefaultRepositories();
  const publishingService = createMissionPublishingService(repositories);

  const missions = await localMissionRepository.list();
  const knowledgeDocuments = await getDefaultKnowledgeRepositories().documents.list();

  const classroomLifecycles: ClassroomLifecycle[] = await Promise.all(
    workspace.classrooms.map(async (classroom) => {
      const assignments = await publishingService.listByClassroom(
        workspace.institution.id,
        classroom.id,
      );
      const latest = [...assignments].sort((a, b) =>
        b.publishedAt.localeCompare(a.publishedAt),
      )[0];

      let snapshot: StudentMissionSnapshot[] = [];
      if (latest) {
        const monitor = createInstitutionalClassMonitor(
          repositories,
          workspace.institution.id,
          classroom.id,
        );
        snapshot = await monitor.listByMission(latest.missionId);
      }

      return { classroom, assignments, activeAssignment: latest ?? null, snapshot };
    }),
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Ciclo de Aprendizagem
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Turmas
        </h1>
        <p className="text-sm text-muted-foreground">
          Selecione uma turma, escolha a Aula e publique a Missão — depois
          acompanhe quem iniciou, concluiu ou está pendente.
        </p>
      </header>

      <TurmasExplorer
        institutionId={workspace.institution.id}
        reviewer={{ id: workspace.user.id, name: workspace.user.name }}
        classroomLifecycles={classroomLifecycles}
        missions={missions}
        knowledgeDocuments={knowledgeDocuments}
      />
    </div>
  );
}
