"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Download,
  GraduationCap,
  LayoutDashboard,
  Route,
  School,
  UserRoundCheck,
  Users,
} from "lucide-react";

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
import { isRealModeClient } from "@/lib/auth-flags";
import {
  getStudentSubmissionStatus,
  loadStudentWork,
  STUDENT_WORK_UPDATED_EVENT,
  type StudentMissionStatus,
  type StudentSubmissionStatus,
} from "@/modules/classroom";
import {
  listLocalMissionAssignments,
  MISSION_ASSIGNMENTS_UPDATED_EVENT,
  type MissionAssignment,
} from "@/modules/platform";

import { pendingReviewsLabel } from "./executive-totals";
import { countLinkedClassrooms, type TeacherLink } from "./teacher-links";

export type ExecutiveView =
  | "overview"
  | "implementation"
  | "teachers"
  | "students"
  | "classes"
  | "discipline";

interface ClassroomRow {
  id: string;
  name: string;
  studentCount: number;
  activeCount: number;
  engagement: number;
}

interface ExecutiveDashboardProps {
  /** Visão aberta ao carregar — permite chegar a "Professores" e "Missões" pelo menu. */
  initialView?: ExecutiveView;
  institutionId: string;
  institutionName: string;
  academicYear: string;
  managerName: string;
  subjectName: string;
  /** Professores da instituição com as turmas que de fato conduzem. */
  teachers: TeacherLink[];
  classrooms: ClassroomRow[];
  totals: {
    students: number;
    activeStudents: number;
    deliveredStudents: number;
    completedStudents: number;
    reviewedStudents: number;
    /** Concluíram e ainda não foram avaliados. */
    pendingReviewStudents: number;
  };
  students: Array<{
    id: string;
    classroomId: string;
    missionId: string;
    status: StudentMissionStatus;
  }>;
  assignments: MissionAssignment[];
}

interface LearningCycleStats {
  pendingReviews: number;
  reviewedStudents: number;
  publishedLessons: number;
  missionsInProgress: number;
}

const IMPLEMENTATION_PROGRESS = 75;
/**
 * Modo real (piloto): nada de número demonstrativo na tela do gestor. O
 * percentual de implantação acima é ilustrativo e só aparece no modo
 * demonstração; no modo real os indicadores vêm das entregas gravadas.
 */
const REAL_MODE = isRealModeClient();

/**
 * Rótulos que dependem do modo. No modo real os dados vêm da instituição
 * (podem ser sintéticos numa homologação, mas não são "simulados" pela
 * tela); os textos de demonstração continuam valendo no modo demo.
 */
const COPY = REAL_MODE
  ? {
      dataBadge: "Dados da instituição",
      engagement: "Participação na missão publicada mais recentemente em cada turma.",
      footerDetail: "Dados da instituição registrados na plataforma.",
    }
  : {
      dataBadge: "Ambiente de demonstração · dados simulados",
      engagement: "Participação na Mission ativa da demonstração.",
      footerDetail: "Dados simulados para demonstração comercial.",
    };

function teacherCountLabel(count: number): string {
  return `${count} ${count === 1 ? "professor vinculado" : "professores vinculados"}`;
}

function teacherClassroomsLabel(link: TeacherLink): string {
  return link.classrooms.length > 0
    ? link.classrooms.map((classroom) => classroom.name).join(", ")
    : "Sem turma vinculada";
}

const VIEW_LABEL: Record<ExecutiveView, string> = {
  overview: "Visão geral",
  implementation: "Implantação",
  teachers: "Professores",
  students: "Alunos",
  classes: "Turmas",
  discipline: "Disciplina",
};

const VIEW_ICON: Record<ExecutiveView, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  implementation: Route,
  teachers: GraduationCap,
  students: Users,
  classes: School,
  discipline: BookOpenCheck,
};

export function ExecutiveDashboard({
  initialView = "overview",
  institutionId,
  institutionName,
  academicYear,
  managerName,
  subjectName,
  teachers,
  classrooms,
  totals: initialTotals,
  students,
  assignments,
}: ExecutiveDashboardProps) {
  const [view, setView] = useState<ExecutiveView>(initialView);
  const [liveCycle, setLiveCycle] = useState<{
    totals: ExecutiveDashboardProps["totals"];
    classrooms: ClassroomRow[];
    stats: LearningCycleStats;
  } | null>(null);

  useEffect(() => {
    // Espelho local "ao vivo" (M21) — só no modo demonstração; no modo
    // real, os totais vêm prontos do servidor (props), sempre do banco
    // (fonte de verdade), atualizados a cada carregamento da página.
    if (isRealModeClient()) return;
    const refreshCycle = () => {
      const studentStates = students.map((student) => {
        const localWork = loadStudentWork(
          { institutionId, ownerId: student.id },
          student.missionId,
        );
        const localStatus = localWork
          ? getStudentSubmissionStatus(localWork)
          : "not_started";

        return {
          ...student,
          status:
            localStatus === "not_started"
              ? submissionStatusFromSnapshot(student.status)
              : localStatus,
          work: localWork,
        };
      });
      const mergedAssignments = mergeAssignments(
        assignments,
        listLocalMissionAssignments(institutionId),
      );
      const activeStudents = studentStates.filter(
        (student) => student.status !== "not_started",
      ).length;
      const deliveredStudents = studentStates.filter((student) =>
        ["submitted", "reviewed"].includes(student.status),
      ).length;
      const reviewedStudents = studentStates.filter(
        (student) => student.status === "reviewed",
      ).length;
      const pendingReviewStudents = studentStates.filter(
        (student) => student.status === "submitted",
      ).length;
      const classroomRows = classrooms.map((classroom) => {
        const classroomStudents = studentStates.filter(
          (student) => student.classroomId === classroom.id,
        );
        const activeCount = classroomStudents.filter(
          (student) => student.status !== "not_started",
        ).length;
        return {
          ...classroom,
          activeCount,
          engagement: percentage(activeCount, classroomStudents.length),
        };
      });
      setLiveCycle({
        totals: {
          students: studentStates.length,
          activeStudents,
          deliveredStudents,
          completedStudents: deliveredStudents,
          reviewedStudents,
          pendingReviewStudents,
        },
        classrooms: classroomRows,
        stats: {
          pendingReviews: pendingReviewStudents,
          reviewedStudents,
          publishedLessons: new Set(
            mergedAssignments
              .filter((assignment) => assignment.status !== "draft")
              .map((assignment) => assignment.lessonId)
              .filter(Boolean),
          ).size,
          missionsInProgress: mergedAssignments.filter(
            (assignment) => assignment.status === "published",
          ).length,
        },
      });
    };

    refreshCycle();
    window.addEventListener(STUDENT_WORK_UPDATED_EVENT, refreshCycle);
    window.addEventListener(MISSION_ASSIGNMENTS_UPDATED_EVENT, refreshCycle);
    window.addEventListener("storage", refreshCycle);
    return () => {
      window.removeEventListener(STUDENT_WORK_UPDATED_EVENT, refreshCycle);
      window.removeEventListener(MISSION_ASSIGNMENTS_UPDATED_EVENT, refreshCycle);
      window.removeEventListener("storage", refreshCycle);
    };
  }, [assignments, classrooms, institutionId, students]);

  const totals = liveCycle?.totals ?? initialTotals;
  const classroomRows = liveCycle?.classrooms ?? classrooms;
  const cycleStats = liveCycle?.stats ?? {
    // Concluíram e ainda não foram avaliados (antes: todos os concluídos,
    // inclusive os já avaliados — REGISTRO 14, G2).
    pendingReviews: initialTotals.pendingReviewStudents,
    reviewedStudents: initialTotals.reviewedStudents,
    publishedLessons: new Set(
      assignments.map((item) => item.lessonId).filter(Boolean),
    ).size,
    missionsInProgress: assignments.filter(
      (item) => item.status === "published",
    ).length,
  };
  const firstName = managerName.split(/\s+/).filter(Boolean)[0] ?? "Gestor";
  const greetingName = firstName.toLocaleLowerCase("pt-BR") === "direção" ? null : firstName;
  const inactiveStudents = Math.max(0, totals.students - totals.activeStudents);
  const activeRate = percentage(totals.activeStudents, totals.students);
  const deliveryRate = percentage(totals.deliveredStudents, totals.students);
  const completionRate = percentage(totals.completedStudents, totals.students);

  const executiveMessage = useMemo(() => {
    if (view === "implementation") {
      return REAL_MODE
        ? `${classroomRows.length} turmas, ${totals.students} alunos matriculados e ${teacherCountLabel(teachers.length)} registrados na plataforma.`
        : "A fundação institucional está concluída e a operação acompanhada já começou.";
    }
    if (view === "teachers") {
      return REAL_MODE
        ? `${teacherCountLabel(teachers.length)}, cada um com as turmas que conduz.`
        : "O professor responsável está vinculado e conduz todas as turmas da demonstração.";
    }
    if (view === "students") {
      return REAL_MODE
        ? `${totals.activeStudents} de ${totals.students} alunos já iniciaram a missão publicada.`
        : `${totals.activeStudents} de ${totals.students} alunos já participaram da Mission ativa.`;
    }
    if (view === "classes") {
      return `${classroomRows.length} turmas estão configuradas e acompanhadas no ciclo institucional.`;
    }
    if (view === "discipline") {
      return REAL_MODE
        ? "Missões publicadas para as turmas da instituição."
        : "A disciplina está configurada, com currículo, Lessons e Mission Flow conectados.";
    }
    if (REAL_MODE) {
      return inactiveStudents > 0
        ? `${inactiveStudents} alunos ainda não iniciaram a missão publicada.`
        : "Todos os alunos matriculados já iniciaram a missão publicada.";
    }
    return inactiveStudents > 0
      ? `A implantação avança bem; ${inactiveStudents} alunos ainda precisam iniciar a Mission.`
      : "A implantação está saudável e todas as turmas já iniciaram a operação.";
  }, [classroomRows.length, inactiveStudents, teachers.length, totals.activeStudents, totals.students, view]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              Executive Experience
            </Badge>
            <span className="text-xs text-muted-foreground">
              {COPY.dataBadge}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Bom dia{greetingName ? `, ${greetingName}` : ""}.
          </h1>
          <p className="flex max-w-3xl items-start gap-2 text-sm text-foreground/90 md:text-base">
            <span className="mt-2 size-2 shrink-0 rounded-full bg-chart-2" />
            {executiveMessage}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="gap-1.5 font-normal">
            <Clock3 className="size-3" />
            {REAL_MODE ? "Dados registrados na plataforma" : "Atualização demonstrativa"}
          </Badge>
          <Badge variant="outline" className="gap-1.5 font-normal">
            <CalendarDays className="size-3" />
            Ano letivo {academicYear}
          </Badge>
        </div>
      </header>

      <nav
        className="flex gap-1 overflow-x-auto border-b border-border pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Áreas da visão executiva"
      >
        {(Object.keys(VIEW_LABEL) as ExecutiveView[]).map((item) => {
          const Icon = VIEW_ICON[item];
          const active = view === item;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => setView(item)}
              className={cn(
                "relative inline-flex min-h-11 shrink-0 items-center gap-2 px-3 text-sm font-medium transition-colors",
                active
                  ? "text-primary after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:bg-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {VIEW_LABEL[item]}
            </button>
          );
        })}
      </nav>

      {view === "overview" ? (
        <Overview
          institutionName={institutionName}
          subjectName={subjectName}
          teachers={teachers}
          classrooms={classroomRows}
          totals={totals}
          cycleStats={cycleStats}
          activeRate={activeRate}
          deliveryRate={deliveryRate}
          completionRate={completionRate}
          inactiveStudents={inactiveStudents}
        />
      ) : (
        <FocusedView
          view={view}
          institutionName={institutionName}
          subjectName={subjectName}
          teachers={teachers}
          classrooms={classroomRows}
          totals={totals}
          cycleStats={cycleStats}
          activeRate={activeRate}
          deliveryRate={deliveryRate}
          completionRate={completionRate}
        />
      )}
    </div>
  );
}

function Overview({
  institutionName,
  subjectName,
  teachers,
  classrooms,
  totals,
  activeRate,
  deliveryRate,
  completionRate,
  inactiveStudents,
  cycleStats,
}: Omit<
  ExecutiveDashboardProps,
  "academicYear" | "managerName" | "institutionId" | "students" | "assignments"
> & {
  activeRate: number;
  deliveryRate: number;
  completionRate: number;
  inactiveStudents: number;
  cycleStats: LearningCycleStats;
}) {
  const linkedClassrooms = countLinkedClassrooms(teachers);
  // Cada item de atenção conta uma vez: alunos sem acesso e entregas
  // aguardando avaliação. "Sem pendências" só quando nenhum dos dois.
  const attentionPoints =
    (inactiveStudents > 0 ? 1 : 0) + (cycleStats.pendingReviews > 0 ? 1 : 0);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]">
        <Card className="border-primary/20 bg-[linear-gradient(135deg,var(--card),color-mix(in_oklch,var(--card),var(--primary)_6%))]">
          <CardHeader className="gap-4 sm:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-2">
              <Badge className="bg-primary/15 text-primary" variant="secondary">
                {REAL_MODE ? "Dados da instituição" : "Implantação em andamento"}
              </Badge>
              <div>
                <CardTitle className="text-xl md:text-2xl">
                  {REAL_MODE ? "Estrutura registrada na plataforma" : "Disciplina pronta para consolidar"}
                </CardTitle>
                <CardDescription className="mt-1 max-w-2xl">
                  {REAL_MODE
                    ? `${classrooms.length} turmas, ${totals.students} alunos matriculados e ${teacherCountLabel(teachers.length)}.`
                    : "Instituição, estrutura acadêmica, equipe, turmas, alunos e currículo estão configurados. A operação acompanhada já começou."}
                </CardDescription>
              </div>
            </div>
            {REAL_MODE ? null : (
              <div className="flex flex-col items-start sm:items-end">
                <span className="text-3xl font-semibold tabular-nums text-foreground md:text-4xl">
                  {IMPLEMENTATION_PROGRESS}%
                </span>
                <span className="text-xs text-muted-foreground">progresso demonstrativo</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {REAL_MODE ? null : (
              <ProgressBar value={IMPLEMENTATION_PROGRESS} label="Progresso da implantação" />
            )}
            {/* Marcos fixos da narrativa de demonstração: sem fonte no banco. */}
            {REAL_MODE ? null : (
              <div className="grid gap-2 sm:grid-cols-4">
                <Milestone index="01" label="Fundação" status="done" />
                <Milestone index="02" label="Configuração" status="done" />
                <Milestone index="03" label="Operação" status="current" />
                <Milestone index="04" label="Consolidação" status="next" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Atenção executiva
            </p>
            <CardTitle>
              {attentionPoints > 0
                ? `${attentionPoints} ${attentionPoints === 1 ? "ponto" : "pontos"} para acompanhar`
                : "Operação sem pendências"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <AttentionItem
              icon={inactiveStudents > 0 ? CircleAlert : CheckCircle2}
              title={
                inactiveStudents > 0
                  ? `${inactiveStudents} alunos ainda não acessaram`
                  : "Todos os alunos já acessaram"
              }
              description={
                REAL_MODE
                  ? "Leitura da missão publicada mais recentemente em cada turma."
                  : "Leitura da Mission ativa no ambiente demonstrativo."
              }
              emphasis={inactiveStudents > 0}
            />
            <AttentionItem
              icon={UserRoundCheck}
              title={teacherCountLabel(teachers.length)}
              description={`${linkedClassrooms} de ${classrooms.length} turmas com professor vinculado.`}
            />
            <AttentionItem
              icon={cycleStats.pendingReviews > 0 ? CircleAlert : CheckCircle2}
              title={
                cycleStats.pendingReviews > 0
                  ? pendingReviewsLabel(cycleStats.pendingReviews)
                  : "Entregas avaliadas"
              }
              description="Pendências pedagógicas do ciclo de aprendizagem atual."
              emphasis={cycleStats.pendingReviews > 0}
            />
            <Link
              href="/gestor/implantacao"
              className={cn(buttonVariants({ variant: "outline" }), "mt-1 w-full")}
            >
              Ver prioridades da implantação
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
        <MetricCard icon={Route} label="Implantação" value={REAL_MODE ? "Piloto" : `${IMPLEMENTATION_PROGRESS}%`} detail="Operação acompanhada" />
        <MetricCard icon={GraduationCap} label="Professores vinculados" value={`${teachers.length}`} detail={`${linkedClassrooms} de ${classrooms.length} turmas com professor`} />
        <MetricCard icon={Users} label="Alunos ativos" value={`${totals.activeStudents}`} detail={`${activeRate}% de ${totals.students} matriculados`} />
        <MetricCard
          icon={BookOpenCheck}
          label="Disciplina"
          value={`${cycleStats.missionsInProgress} Mission${cycleStats.missionsInProgress === 1 ? "" : "s"}`}
          detail={`${cycleStats.publishedLessons} Lesson${cycleStats.publishedLessons === 1 ? "" : "s"} publicada${cycleStats.publishedLessons === 1 ? "" : "s"}`}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <Card>
          <CardHeader className="sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Alunos</p>
              <CardTitle className="mt-1">Engajamento por turma</CardTitle>
              <CardDescription>{COPY.engagement}</CardDescription>
            </div>
            <Badge variant="outline">Média institucional · {activeRate}%</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {classrooms.map((classroom) => (
              <div key={classroom.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)_3rem] items-center gap-3">
                <span className="text-sm font-medium">{classroom.name}</span>
                <ProgressBar value={classroom.engagement} label={`Engajamento da turma ${classroom.name}`} compact />
                <span className="text-right text-sm tabular-nums text-muted-foreground">{classroom.engagement}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Professor</p>
              <CardTitle className="mt-1">Prontidão da equipe</CardTitle>
              <CardDescription>Vínculo e responsabilidade institucional.</CardDescription>
            </div>
            {REAL_MODE ? (
              <Badge variant="outline">{teacherCountLabel(teachers.length)}</Badge>
            ) : (
              <Badge className="bg-chart-2/10 text-chart-2" variant="secondary">Em operação</Badge>
            )}
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {teachers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum professor vinculado.</p>
            ) : null}
            {teachers.map((link) => (
              <div key={link.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {initials(link.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{link.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{link.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Turmas: {teacherClassroomsLabel(link)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <Card>
          <CardHeader className="sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Aprendizagem</p>
              <CardTitle className="mt-1">Como estão os alunos</CardTitle>
              <CardDescription>Leitura agregada do ciclo atual, sem exposição individual.</CardDescription>
            </div>
            <Link href="/gestor/sondagens" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Ver sondagem diagnóstica <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <LearningIndicator value={`${deliveryRate}%`} label="entregaram" detail={`${totals.deliveredStudents} de ${totals.students} alunos`} />
            <LearningIndicator value={`${activeRate}%`} label="participaram" detail={`${totals.activeStudents} alunos ativos`} />
            <LearningIndicator value={`${completionRate}%`} label="concluíram" detail={`${totals.completedStudents} ciclo completo`} />
            <LearningIndicator
              value={`${percentage(cycleStats.reviewedStudents, totals.students)}%`}
              label="foram avaliados"
              detail={`${cycleStats.reviewedStudents} devolutivas registradas`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Instituição</p>
            <CardTitle className="mt-1">Estrutura implantada</CardTitle>
            <CardDescription>{institutionName}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <StructureItem icon={School} label={`${classrooms.length} turmas configuradas`} />
            <StructureItem icon={Users} label={`${totals.students} alunos matriculados`} />
            <StructureItem icon={GraduationCap} label={teacherCountLabel(teachers.length)} />
            <StructureItem icon={BookOpenCheck} label={subjectName} />
          </CardContent>
        </Card>
      </div>

      <footer className="flex flex-col gap-3 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          {REAL_MODE
            ? "Indicadores calculados a partir das entregas registradas na plataforma."
            : "Indicadores demonstrativos derivados do ciclo institucional compartilhado."}
        </p>
        <button type="button" disabled className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "opacity-50")}>
          <Download className="size-4" /> Exportar resumo executivo · Em breve
        </button>
      </footer>
    </div>
  );
}

function FocusedView({
  view,
  institutionName,
  subjectName,
  teachers,
  classrooms,
  totals,
  activeRate,
  deliveryRate,
  completionRate,
  cycleStats,
}: Omit<
  ExecutiveDashboardProps,
  "academicYear" | "managerName" | "institutionId" | "students" | "assignments"
> & {
  view: Exclude<ExecutiveView, "overview">;
  activeRate: number;
  deliveryRate: number;
  completionRate: number;
  cycleStats: LearningCycleStats;
}) {
  const content = {
    implementation: {
      badge: REAL_MODE ? "Implantação · piloto" : `Implantação · ${IMPLEMENTATION_PROGRESS}%`,
      title: REAL_MODE ? "Estrutura registrada na plataforma" : "Do Setup à operação acompanhada",
      description: REAL_MODE
        ? "Instituição, professores, turmas e matrículas como estão registrados."
        : "O que foi concluído, o que está em operação e qual é o próximo marco institucional.",
      // No modo real, só o que tem registro; as etapas "Concluído/Em curso"
      // são a narrativa fixa da demonstração.
      rows: REAL_MODE
        ? [
            ["Instituição", institutionName],
            ["Professores vinculados", String(teachers.length)],
            ["Turmas e matrículas", `${classrooms.length} turmas · ${totals.students} alunos`],
          ]
        : [
            ["Instituição e ano letivo", "Concluído"],
            ["Equipe e professor responsável", "Concluído"],
            ["Turmas e matrículas", `${classrooms.length} turmas · ${totals.students} alunos`],
            ["Operação acompanhada", "Em curso"],
            ["Consolidação e relatório inicial", "Próxima etapa"],
          ],
      href: "/gestor/implantacao",
      action: "Abrir Implantação Institucional",
    },
    teachers: {
      badge: REAL_MODE ? `Professores · ${teachers.length}` : "Professor · Em operação",
      title: "Prontidão e capacidade de condução",
      description: "Uma leitura institucional do vínculo docente, sem vigilância de produtividade individual.",
      // Um professor por linha, com as turmas que de fato conduz.
      rows: [
        ...teachers.map((link) => [link.name, teacherClassroomsLabel(link)]),
        ["Disciplina", subjectName],
        ...(REAL_MODE ? [] : [["Situação", "Em operação"]]),
      ],
      href: null,
      action: null,
    },
    students: {
      badge: `Alunos · ${totals.activeStudents} ativos`,
      title: "Participação e aprendizagem com privacidade",
      description: "A camada executiva apresenta tendências agregadas; casos individuais permanecem no acompanhamento pedagógico.",
      rows: [
        ["Matriculados", String(totals.students)],
        ["Participação ativa", `${activeRate}%`],
        ["Entregas registradas", `${deliveryRate}%`],
        ["Entregas pendentes", String(cycleStats.pendingReviews)],
        ["Avaliações registradas", String(cycleStats.reviewedStudents)],
        ["Ciclo completo", `${completionRate}%`],
      ],
      href: "/gestor/sondagens",
      action: "Ver sondagem diagnóstica",
    },
    classes: {
      badge: `Turmas · ${classrooms.length} configuradas`,
      title: "Operação por turma",
      description:
        "Acesso direto às turmas e uma leitura comparável do engajamento no ciclo atual.",
      rows: classrooms.map((classroom) => [
        classroom.name,
        `${classroom.engagement}% · ${classroom.activeCount} de ${classroom.studentCount} ativos`,
      ]),
      href: null,
      action: null,
    },
    discipline: {
      badge: REAL_MODE ? "Disciplina" : "Disciplina · Em operação",
      title: "Currículo em movimento",
      description: REAL_MODE
        ? "Missões e aulas publicadas para as turmas da instituição."
        : "Currículo, Lesson Composer, Mission Flow e acompanhamento conectados numa mesma proposta pedagógica.",
      rows: [
        ["Disciplina", subjectName],
        // "Configurado" é texto fixo da demonstração; no modo real não há
        // registro de currículo que o sustente.
        ...(REAL_MODE ? [] : [["Currículo", "Configurado"]]),
        ["Lessons publicadas", String(cycleStats.publishedLessons)],
        [REAL_MODE ? "Publicações de missão nas turmas" : "Missions em andamento", String(cycleStats.missionsInProgress)],
        ["Turmas alcançadas", String(classrooms.length)],
      ],
      href: null,
      action: null,
    },
  }[view];

  return (
    <Card className="border-primary/20">
      <CardHeader className="gap-3 border-b border-border pb-5 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-2">
          <Badge className="bg-primary/15 text-primary" variant="secondary">{content.badge}</Badge>
          <div><CardTitle className="text-xl md:text-2xl">{content.title}</CardTitle><CardDescription className="mt-1 max-w-3xl">{content.description}</CardDescription></div>
        </div>
        {/* Só destinos da área do gestor: as telas do professor não são acessíveis a este papel. */}
        {content.href ? (
          <Link href={content.href} className={buttonVariants({ variant: "outline" })}>
            {content.action} <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {content.rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium">{value}</span>
          </div>
        ))}
      </CardContent>
      <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        {institutionName} · {COPY.footerDetail}
      </div>
    </Card>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof Route; label: string; value: string; detail: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 text-muted-foreground"><span className="text-sm">{label}</span><Icon className="size-4" /></div>
        <div><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ value, label, compact = false }: { value: number; label: string; compact?: boolean }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-muted", compact ? "h-2" : "h-2.5")} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function Milestone({ index, label, status }: { index: string; label: string; status: "done" | "current" | "next" }) {
  return (
    <div className={cn("flex items-center gap-2 border-t-2 pt-2 text-sm", status === "done" && "border-chart-2", status === "current" && "border-primary", status === "next" && "border-border text-muted-foreground")}>
      <span className="font-mono text-xs">{index}</span><span>{label}</span>
    </div>
  );
}

function AttentionItem({ icon: Icon, title, description, emphasis = false }: { icon: typeof CircleAlert; title: string; description: string; emphasis?: boolean }) {
  return (
    <div className="flex items-start gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0">
      <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground", emphasis && "bg-chart-4/10 text-chart-4")}><Icon className="size-4" /></div>
      <div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p></div>
    </div>
  );
}

function LearningIndicator({ value, label, detail }: { value: string; label: string; detail: string }) {
  return <div><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-sm font-medium">{label}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

function StructureItem({ icon: Icon, label }: { icon: typeof School; label: string }) {
  return <div className="flex items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span><span>{label}</span></div>;
}

function percentage(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function submissionStatusFromSnapshot(
  status: StudentMissionStatus,
): StudentSubmissionStatus {
  if (status === "avaliado") return "reviewed";
  if (["entregue", "reflexao", "concluiu"].includes(status)) {
    return "submitted";
  }
  if (status === "nao_acessou") return "not_started";
  return "in_progress";
}

function mergeAssignments(
  serverAssignments: MissionAssignment[],
  localAssignments: MissionAssignment[],
): MissionAssignment[] {
  const merged = new Map(
    serverAssignments.map((assignment) => [assignment.id, assignment]),
  );
  for (const assignment of localAssignments) {
    merged.set(assignment.id, assignment);
  }
  return [...merged.values()];
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}
