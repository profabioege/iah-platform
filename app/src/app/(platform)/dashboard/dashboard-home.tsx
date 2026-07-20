"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  NotebookPen,
  PartyPopper,
} from "lucide-react";

import {
  emptyStudentWork,
  getStudentSubmissionStatus,
  isMissionCompleted,
  isProductionDelivered,
  isReflectionRecorded,
  listAllStudentWork,
  loadStudentWork,
  type StudentWork,
  type StudentWorkScope,
} from "@/modules/classroom";
import {
  listLocalMissionAssignments,
  MISSION_ASSIGNMENTS_UPDATED_EVENT,
  type MissionAssignment,
} from "@/modules/platform";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { MyLessonCard } from "./my-lesson-card";

/** Dados da Missão que o Dashboard precisa (vindos do servidor). */
export interface DashboardMission {
  id: string;
  number: number;
  title: string;
  module: string;
  guidingQuestion: string;
}

interface Loaded {
  works: Record<string, StudentWork>;
  lastReflection?: StudentWork;
}

/**
 * Home da Plataforma: mostra a Missão ativa e o progresso real do aluno.
 *
 * A Missão ativa é a primeira ainda não concluída da lista (o repositório já
 * as entrega ordenadas por módulo e ordem) — portanto, novas Missões passam a
 * aparecer aqui apenas com o cadastro do arquivo de conteúdo, sem tocar nesta
 * interface. O progresso vem do trabalho salvo no dispositivo.
 */
export function DashboardHome({
  missions,
  classroomId,
  scope,
  initialAssignments,
}: {
  missions: DashboardMission[];
  /** Turma do aluno (Institutional Workspace, M17) — habilita o card "Minha Lesson". */
  classroomId?: string;
  /** Instituição + usuário do Institutional Workspace — isola o trabalho salvo por aluno. */
  scope: StudentWorkScope | null;
  initialAssignments: MissionAssignment[];
}) {
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [assignments, setAssignments] = React.useState(initialAssignments);

  React.useEffect(() => {
    const works: Record<string, StudentWork> = {};
    for (const mission of missions) {
      works[mission.id] = scope
        ? loadStudentWork(scope, mission.id)
        : emptyStudentWork(mission.id);
    }

    const lastReflection = (scope ? listAllStudentWork(scope) : [])
      .filter(isReflectionRecorded)
      .sort((a, b) =>
        (b.reflectionRecordedAt ?? "").localeCompare(a.reflectionRecordedAt ?? ""),
      )[0];

    setLoaded({ works, lastReflection });
  }, [missions, scope]);

  React.useEffect(() => {
    if (!scope || !classroomId) return;
    const refresh = () => {
      const local = listLocalMissionAssignments(scope.institutionId, classroomId);
      const merged = new Map(initialAssignments.map((item) => [item.id, item]));
      for (const item of local) merged.set(item.id, item);
      setAssignments([...merged.values()]);
    };
    refresh();
    window.addEventListener(MISSION_ASSIGNMENTS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(MISSION_ASSIGNMENTS_UPDATED_EVENT, refresh);
  }, [classroomId, initialAssignments, scope]);

  // O progresso vive no dispositivo e só é lido após a hidratação; até lá,
  // mostramos o esqueleto para não piscar uma tela vazia.
  if (!loaded) return <DashboardSkeleton />;
  const visibleMissionIds = new Set(
    assignments
      .filter((assignment) => assignment.status !== "draft")
      .map((assignment) => assignment.missionId),
  );
  const availableMissions = classroomId
    ? missions.filter((mission) => visibleMissionIds.has(mission.id))
    : missions;

  if (availableMissions.length === 0) {
    return (
      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Nenhuma Mission publicada</CardTitle>
          <CardDescription>
            Sua próxima Mission aparecerá aqui quando o Professor publicar a Lesson da turma.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const workOf = (id: string) => loaded.works[id] ?? emptyStudentWork(id);

  const active =
    availableMissions.find(
      (mission) => getStudentSubmissionStatus(workOf(mission.id)) !== "reviewed",
    ) ?? availableMissions[availableMissions.length - 1];
  const work = workOf(active.id);

  const delivered = isProductionDelivered(work);
  const recorded = isReflectionRecorded(work);
  const completed = isMissionCompleted(work);
  const submissionStatus = getStudentSubmissionStatus(work);
  const reviewed = submissionStatus === "reviewed";
  const submitted = submissionStatus === "submitted";
  const started = submissionStatus !== "not_started";

  const doneCount = (delivered ? 1 : 0) + (recorded ? 1 : 0) + (reviewed ? 1 : 0);
  const allCompleted = availableMissions.every(
    (mission) => getStudentSubmissionStatus(workOf(mission.id)) === "reviewed",
  );

  const cta = reviewed
    ? "Ver devolutiva"
    : submitted
      ? "Acompanhar avaliação"
      : completed
        ? "Rever entrega"
    : started
      ? "Continuar missão"
      : "Iniciar missão";

  const lastReflectionMission = loaded.lastReflection
    ? missions.find((m) => m.id === loaded.lastReflection?.missionId)
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {classroomId ? <MyLessonCard classroomId={classroomId} missionId={active.id} /> : null}

      {/* Missão ativa */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-32 size-64 rounded-full bg-chart-2/10 blur-3xl" />

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary/15 text-primary">
            Missão {String(active.number).padStart(2, "0")} ·{" "}
            {reviewed
              ? "avaliada"
              : submitted
                ? "em avaliação"
              : completed
                ? "entregue"
              : started
                ? "investigação em andamento"
                : "pronta para começar"}
          </Badge>
          {reviewed ? (
            <Badge className="bg-chart-2/15 text-chart-2">
              <PartyPopper className="size-3" />
              Devolutiva disponível
            </Badge>
          ) : null}
        </div>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
          {active.title}
        </h1>
        <p className="mt-2 max-w-2xl text-base italic text-chart-2 md:text-lg">
          &ldquo;{active.guidingQuestion}&rdquo;
        </p>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          {reviewed
            ? `Avaliação concluída · ${work.review?.grade ?? "devolutiva disponível"}.`
            : submitted
              ? "Sua entrega está com o Professor para avaliação."
            : completed
              ? "Você entregou sua produção e registrou sua reflexão."
            : started
              ? "Sua investigação está em andamento. Retome de onde parou."
              : "Uma nova investigação aguarda o seu veredito."}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link
            href={`/missoes/${active.id}`}
            className={cn(buttonVariants(), "relative z-[1]")}
          >
            {cta}
            <ArrowRight className="size-4" />
          </Link>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2 transition-all"
                style={{ width: `${(doneCount / 3) * 100}%` }}
              />
            </div>
            <span>{doneCount} de 3 etapas</span>
          </div>
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <Milestone done={delivered} label="Produção entregue" />
          <Milestone done={recorded} label="Reflexão registrada" />
          <Milestone done={reviewed} label="Devolutiva recebida" />
        </ul>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Diário do Auditor — última reflexão real */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-7 items-center justify-center rounded-md bg-chart-3/15 text-chart-3">
                <NotebookPen className="size-4" />
              </span>
              Diário do Auditor
            </CardTitle>
            <CardDescription>
              {loaded.lastReflection
                ? "Sua última anotação de campo"
                : "Ainda sem reflexões registradas"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {loaded.lastReflection ? (
              <>
                <p className="line-clamp-4 whitespace-pre-wrap text-sm italic text-muted-foreground">
                  &ldquo;{loaded.lastReflection.reflection}&rdquo;
                </p>
                {lastReflectionMission ? (
                  <p className="text-xs text-muted-foreground">
                    Registrada na Missão{" "}
                    {String(lastReflectionMission.number).padStart(2, "0")}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ao concluir uma missão, sua reflexão aparece aqui — o registro da
                sua trajetória como auditor.
              </p>
            )}
            <Link
              href="/diario"
              className="inline-flex w-fit items-center gap-1 text-xs text-chart-3 transition-colors hover:text-foreground"
            >
              Abrir o Diário
              <ArrowRight className="size-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Percurso — visão geral, escala com novas missões */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seu percurso</CardTitle>
            <CardDescription>
              {allCompleted
                ? "Você recebeu devolutiva em todas as missões disponíveis."
                : `${availableMissions.filter((m) => getStudentSubmissionStatus(workOf(m.id)) === "reviewed").length} de ${availableMissions.length} missões avaliadas`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2">
              {availableMissions.map((m) => {
                const done = getStudentSubmissionStatus(workOf(m.id)) === "reviewed";
                return (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    {done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-chart-2" />
                    ) : (
                      <CircleDashed className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        "truncate",
                        done ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {String(m.number).padStart(2, "0")} · {m.title}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/missoes"
              className="inline-flex w-fit items-center gap-1 text-xs text-primary transition-colors hover:text-foreground"
            >
              Ver todas as missões
              <ArrowRight className="size-3" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

/** Espelha o layout real do Dashboard enquanto o progresso é lido. */
function DashboardSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6"
      aria-busy="true"
      aria-label="Carregando seu painel"
    >
      <section className="rounded-xl border border-border bg-card p-6 md:p-8">
        <Skeleton className="h-6 w-56 rounded-full" />
        <Skeleton className="mt-4 h-8 w-72" />
        <Skeleton className="mt-3 h-5 w-full max-w-xl" />
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
        <div className="mt-6 flex items-center gap-4">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-2 w-28 rounded-full" />
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </section>
    </div>
  );
}

function Milestone({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      {done ? (
        <CheckCircle2 className="size-4 text-chart-2" />
      ) : (
        <CircleDashed className="size-4 text-muted-foreground" />
      )}
      <span className={done ? "text-chart-2" : "text-muted-foreground"}>
        {label}
      </span>
    </li>
  );
}
