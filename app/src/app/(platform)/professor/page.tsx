import type { Metadata } from "next";
import Link from "next/link";

import { simulatedClassMonitor } from "@/modules/classroom";
import { localMissionRepository } from "@/modules/library";
import { isGoogleWorkspaceConfigured } from "@/modules/integrations";
import { getDefaultRepositories } from "@/modules/platform";
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

/** Instituição do contexto — fixa até existir autenticação real. */
const INSTITUTION_ID = "inst-demo";

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
  const students = mission
    ? await simulatedClassMonitor.listByMission(mission.id)
    : [];
  const googleConfigured = isGoogleWorkspaceConfigured();
  const classrooms = await listClassroomRows();

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
              {mission.title} · Turma de demonstração
            </span>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/professor/estudio"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-fit",
            )}
          >
            Estúdio de Missões
          </Link>
          <Link
            href="/professor/aulas"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-fit",
            )}
          >
            Minhas Aulas
          </Link>
          <Link
            href="/professor/curriculo"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-fit",
            )}
          >
            Currículo
          </Link>
        </div>
      </header>

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
  const [classrooms, academicYears, syncStates] = await Promise.all([
    repositories.classrooms.listByInstitution(INSTITUTION_ID),
    repositories.academicYears.listByInstitution(INSTITUTION_ID),
    repositories.classroomSyncStates.listByInstitution(INSTITUTION_ID),
  ]);

  return Promise.all(
    classrooms.map(async (classroom) => {
      const enrollments = await repositories.enrollments.listByClassroom(
        INSTITUTION_ID,
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
