import type { Metadata } from "next";
import Link from "next/link";

import { localMissionRepository } from "@/modules/library";
import { isGoogleWorkspaceConfigured } from "@/modules/integrations";
import { createInstitutionalClassMonitor, getDefaultRepositories } from "@/modules/platform";
import { getWorkspaceContext } from "@/modules/workspace";
import { isAuthConfigured } from "@/lib/auth-flags";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ClassPanel } from "./class-panel";
import { ClassroomsSection, type ClassroomRow } from "./classrooms-section";
import { TeacherWorkspace } from "./teacher-workspace";


export const metadata: Metadata = {
  title: "Painel do Professor",
  description: "Acompanhe a turma durante a Missão.",
};

/**
 * Painel do Professor — acompanhamento da turma na Missão ativa.
 *
 * A fonte dos dados é o contrato ClassMonitorReader; hoje injeta-se a
 * implementação simulada (dados fictícios, autorizados para a fase de
 * demonstração). Ao trocar pela implementação com banco, apenas esta
 * injeção muda.
 */
export default async function ProfessorPage() {
  const missions = await localMissionRepository.list();
  const mission = missions[0];
  const googleConfigured = isGoogleWorkspaceConfigured();
  const classrooms = await listClassroomRows();
  const workspace = isAuthConfigured() ? null : await getWorkspaceContext();

  // Acompanhamento institucional (M17) — substitui definitivamente o
  // simulated-class-monitor; mostra a primeira Turma do Professor
  // enquanto não há um seletor aqui (o fluxo completo com Turma
  // escolhida vive em /professor/turmas).
  const activeClassroom = workspace?.classrooms[0] ?? null;
  const students =
    mission && workspace && activeClassroom
      ? await createInstitutionalClassMonitor(
          getDefaultRepositories(),
          workspace.institution.id,
          activeClassroom.id,
        ).listByMission(mission.id)
      : [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          Painel do Professor
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Acompanhamento da turma
        </h1>
        {mission ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/15 text-primary">
              Missão {String(mission.number).padStart(2, "0")}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {mission.title}
              {activeClassroom ? ` · ${activeClassroom.name}` : ""}
            </span>
          </div>
        ) : null}
      </header>

      <TeacherWorkspace
        subjectName={workspace?.subjects[0]?.name ?? null}
        classrooms={workspace?.classrooms ?? []}
      />

      <ClassroomsSection classrooms={classrooms} />

      <section id="acompanhamento" className="scroll-mt-20">
        <ClassPanel students={students} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Integrações</CardTitle>
          <CardDescription>
            Provedores externos conectados a este Painel.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">
                {googleConfigured ? "✅" : "○"}
              </span>
              <span className="text-sm font-medium">Google Workspace</span>
            </div>
            <Badge variant="outline" className="text-muted-foreground">
              {googleConfigured ? "Conectado" : "Não configurado"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Infraestrutura preparada. Configure OAuth quando o projeto Google
            Cloud estiver disponível.
          </p>
          <Link
            href="/professor/importar"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
          >
            Importar turmas do Google Classroom
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Turmas da instituição + estado de sincronização, lidas do módulo
 * platform (hoje servido pelos seeds de demonstração; a troca para banco
 * é uma mudança de factory — ver docs/PERSISTENCE.md).
 */
async function listClassroomRows(): Promise<ClassroomRow[]> {
  const repositories = getDefaultRepositories();
  // Instituição resolvida da fonte de dados, nunca fixa em código (M16) —
  // hoje o seed tem só o Colégio Beryon; multi-instituição chega com a
  // autenticação real amarrando o usuário ao tenant.
  const institutionId = (await repositories.institutions.list())[0]?.id;
  if (!institutionId) return [];
  const [classrooms, academicYears, syncStates] = await Promise.all([
    repositories.classrooms.listByInstitution(institutionId),
    repositories.academicYears.listByInstitution(institutionId),
    repositories.classroomSyncStates.listByInstitution(institutionId),
  ]);

  return Promise.all(
    classrooms.map(async (classroom) => {
      const enrollments = await repositories.enrollments.listByClassroom(
        institutionId,
        classroom.id,
      );
      return {
        id: classroom.id,
        name: classroom.name,
        academicYear:
          academicYears.find((year) => year.id === classroom.academicYearId)
            ?.label ?? "—",
        studentCount: enrollments.length,
        sync:
          syncStates.find((state) => state.classroomId === classroom.id) ?? null,
      };
    }),
  );
}
