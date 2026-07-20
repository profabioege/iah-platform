"use client";

import * as React from "react";
import { CheckCircle2, ChevronDown, NotebookPen, PenLine } from "lucide-react";

import {
  STUDENT_MISSION_STATUSES,
  STUDENT_WORK_UPDATED_EVENT,
  getStudentSubmissionStatus,
  loadStudentWork,
  reviewStudentWork,
  saveStudentWork,
  type StudentMissionSnapshot,
  type StudentMissionStatus,
} from "@/modules/classroom";
import { isRealModeClient } from "@/lib/auth-flags";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { reviewSubmissionAction } from "./actions";

/** Rótulo e marcador visual de cada estado (conforme especificação). */
const STATUS_META: Record<
  StudentMissionStatus,
  { emoji: string; label: string }
> = {
  nao_acessou: { emoji: "○", label: "Não acessou" },
  visualizou: { emoji: "👁", label: "Visualizou" },
  investigando: { emoji: "🔎", label: "Investigando" },
  produzindo: { emoji: "✍", label: "Produzindo" },
  rascunho: { emoji: "💾", label: "Rascunho" },
  entregue: { emoji: "📤", label: "Entregue" },
  reflexao: { emoji: "💭", label: "Reflexão" },
  concluiu: { emoji: "✅", label: "Concluiu" },
  avaliado: { emoji: "✓", label: "Avaliado" },
};

type Filter = StudentMissionStatus | "todos";

/**
 * Painel de acompanhamento da turma em uma Missão.
 * Recebe as fotografias dos alunos prontas (via contrato ClassMonitorReader);
 * aqui ficam apenas contadores, filtro e a abertura de produção/reflexão.
 */
export function ClassPanel({
  students,
  institutionId,
  classroomId,
  missionId,
  reviewer,
  criteria,
}: {
  students: StudentMissionSnapshot[];
  institutionId: string;
  /** Turma da Missão acompanhada — exigida no modo real (Server Action de avaliação). */
  classroomId: string;
  missionId: string;
  reviewer: { id: string; name: string };
  criteria: string[];
}) {
  const [filter, setFilter] = React.useState<Filter>("todos");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [snapshots, setSnapshots] = React.useState(students);
  const realMode = isRealModeClient();

  React.useEffect(() => {
    setSnapshots(students);
    // Modo real: `students` já vem do banco (fonte de verdade), atualizado
    // a cada carregamento de página — sem espelho local para mesclar.
    if (realMode) return;
    const refresh = () =>
      setSnapshots(
        students.map((student) =>
          withLocalStudentWork(student, institutionId, missionId),
        ),
      );
    refresh();
    window.addEventListener(STUDENT_WORK_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(STUDENT_WORK_UPDATED_EVENT, refresh);
  }, [institutionId, missionId, students, realMode]);

  const counts = React.useMemo(() => {
    const map = new Map<StudentMissionStatus, number>();
    for (const s of snapshots) map.set(s.status, (map.get(s.status) ?? 0) + 1);
    return map;
  }, [snapshots]);

  const visible =
    filter === "todos" ? snapshots : snapshots.filter((s) => s.status === filter);

  const notStarted = counts.get("nao_acessou") ?? 0;
  const reviewed = counts.get("avaliado") ?? 0;
  const submitted =
    (counts.get("entregue") ?? 0) +
    (counts.get("reflexao") ?? 0) +
    (counts.get("concluiu") ?? 0);
  const inProgress = Math.max(0, snapshots.length - notStarted - submitted - reviewed);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-4">
          <StatusTotal label="Não iniciaram" value={notStarted} />
          <StatusTotal label="Em andamento" value={inProgress} />
          <StatusTotal label="Entregaram" value={submitted} />
          <StatusTotal label="Avaliados" value={reviewed} highlight />
        </CardContent>
      </Card>
      {/* Contadores por status — clicáveis, funcionam como filtro */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
        <FilterChip
          active={filter === "todos"}
          onClick={() => setFilter("todos")}
          label={`Todos · ${snapshots.length}`}
        />
        {STUDENT_MISSION_STATUSES.map((status) => (
          <FilterChip
            key={status}
            active={filter === status}
            onClick={() => setFilter(filter === status ? "todos" : status)}
            label={`${STATUS_META[status].emoji} ${STATUS_META[status].label} · ${counts.get(status) ?? 0}`}
          />
        ))}
      </div>

      {/* Lista de alunos */}
      <Card>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum aluno neste status.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((s) => {
                const meta = STATUS_META[s.status];
                const hasContent = Boolean(s.production || s.reflection);
                const open = openId === s.studentId;
                return (
                  <li key={s.studentId}>
                    <button
                      type="button"
                      onClick={() =>
                        hasContent && setOpenId(open ? null : s.studentId)
                      }
                      disabled={!hasContent}
                      aria-expanded={hasContent ? open : undefined}
                      className={cn(
                        "flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors",
                        hasContent
                          ? "cursor-pointer hover:bg-muted/50"
                          : "cursor-default",
                      )}
                    >
                      <span className="w-7 text-center text-base" aria-hidden="true">
                        {meta.emoji}
                      </span>
                      <span className="min-w-40 flex-1 truncate text-sm font-medium">
                        {s.studentName}
                      </span>
                      <Badge variant="outline" className="text-muted-foreground">
                        {meta.label}
                      </Badge>
                      <span className="w-40 text-right text-xs text-muted-foreground">
                        {s.lastAccessAt
                          ? `Último acesso ${formatDateTime(s.lastAccessAt)}`
                          : "Nunca acessou"}
                      </span>
                      {hasContent ? (
                        <ChevronDown
                          className={cn(
                            "size-4 text-muted-foreground transition-transform",
                            open && "rotate-180",
                          )}
                        />
                      ) : (
                        <span className="size-4" aria-hidden="true" />
                      )}
                    </button>

                    {open ? (
                      <div className="flex flex-col gap-4 border-t border-border/60 bg-muted/20 px-6 py-4 md:px-14">
                        {s.production ? (
                          <div>
                            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-chart-2">
                              <PenLine className="size-3.5" />
                              Produção do Aluno
                            </p>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                              {s.production}
                            </p>
                          </div>
                        ) : null}
                        {s.reflection ? (
                          <div>
                            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-chart-3">
                              <NotebookPen className="size-3.5" />
                              Reflexão no Diário do Auditor
                            </p>
                            <p className="whitespace-pre-wrap text-sm italic leading-relaxed text-foreground/90">
                              &ldquo;{s.reflection}&rdquo;
                            </p>
                          </div>
                        ) : null}
                        {["concluiu", "avaliado"].includes(s.status) ? (
                          <ReviewForm
                            student={s}
                            institutionId={institutionId}
                            classroomId={classroomId}
                            missionId={missionId}
                            reviewer={reviewer}
                            criteria={criteria}
                            realMode={realMode}
                            onReviewed={(reviewedStudent) =>
                              setSnapshots((current) =>
                                current.map((item) =>
                                  item.studentId === reviewedStudent.studentId
                                    ? reviewedStudent
                                    : item,
                                ),
                              )
                            }
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            A avaliação será liberada quando produção e reflexão forem entregues.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function withLocalStudentWork(
  student: StudentMissionSnapshot,
  institutionId: string,
  missionId: string,
): StudentMissionSnapshot {
  const work = loadStudentWork(
    { institutionId, ownerId: student.studentId },
    missionId,
  );
  const submissionStatus = getStudentSubmissionStatus(work);
  if (submissionStatus === "not_started") return student;
  const status: StudentMissionStatus =
    submissionStatus === "reviewed"
      ? "avaliado"
      : submissionStatus === "submitted"
        ? "concluiu"
        : "produzindo";
  return {
    ...student,
    status,
    lastAccessAt: work.updatedAt,
    production: work.production || student.production,
    reflection: work.reflection || student.reflection,
    review: work.review,
  };
}

function StatusTotal({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted/30 px-3 py-2">
      <p className={cn("text-xl font-semibold tabular-nums", highlight && "text-chart-2")}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ReviewForm({
  student,
  institutionId,
  classroomId,
  missionId,
  reviewer,
  criteria,
  realMode,
  onReviewed,
}: {
  student: StudentMissionSnapshot;
  institutionId: string;
  classroomId: string;
  missionId: string;
  reviewer: { id: string; name: string };
  criteria: string[];
  realMode: boolean;
  onReviewed: (student: StudentMissionSnapshot) => void;
}) {
  const scope = { institutionId, ownerId: student.studentId };
  const existing = student.review ?? null;
  const [grade, setGrade] = React.useState(existing?.grade ?? "");
  const [feedback, setFeedback] = React.useState(existing?.feedback ?? "");
  const [observed, setObserved] = React.useState<string[]>(
    existing?.observedCriteria ?? [],
  );
  const [message, setMessage] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!grade.trim() || !feedback.trim()) {
      setMessage("Informe o conceito e uma devolutiva antes de confirmar.");
      return;
    }

    if (realMode) {
      setSubmitting(true);
      setMessage(null);
      try {
        const reviewedWork = await reviewSubmissionAction({
          classroomId,
          studentId: student.studentId,
          missionId,
          grade: grade.trim(),
          observedCriteria: observed,
          feedback: feedback.trim(),
        });
        onReviewed({
          ...student,
          status: "avaliado",
          lastAccessAt: reviewedWork.updatedAt,
          production: reviewedWork.production,
          reflection: reviewedWork.reflection,
          review: reviewedWork.review,
        });
        setMessage("Avaliação registrada e devolutiva liberada para o aluno.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível avaliar.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    let work = loadStudentWork(scope, missionId);
    if (
      getStudentSubmissionStatus(work) === "not_started" &&
      student.production &&
      student.reflection
    ) {
      const now = new Date().toISOString();
      work = saveStudentWork(scope, {
        ...work,
        startedAt: now,
        production: student.production,
        productionDeliveredAt: now,
        reflection: student.reflection,
        reflectionRecordedAt: now,
      });
    }

    try {
      const reviewedWork = reviewStudentWork(scope, missionId, {
        grade: grade.trim(),
        observedCriteria: observed,
        feedback: feedback.trim(),
        reviewerId: reviewer.id,
        reviewerName: reviewer.name,
      });
      onReviewed({
        ...student,
        status: "avaliado",
        lastAccessAt: reviewedWork.updatedAt,
        production: reviewedWork.production,
        reflection: reviewedWork.reflection,
        review: reviewedWork.review,
      });
      setMessage("Avaliação registrada e devolutiva liberada para o aluno.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível avaliar.");
    }
  }

  return (
    <form onSubmit={submitReview} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Avaliação do Professor</p>
          <p className="text-xs text-muted-foreground">
            Decisão humana, registrada sem assistência de IA.
          </p>
        </div>
        {existing ? <Badge className="bg-chart-2/15 text-chart-2">Avaliado</Badge> : null}
      </div>

      <label className="flex flex-col gap-1.5 text-xs font-medium">
        Nota ou conceito
        <Input
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
          placeholder="Ex.: 8,5 ou Atendeu plenamente"
        />
      </label>

      {criteria.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-medium">Critérios observados</legend>
          {criteria.map((criterion) => (
            <label key={criterion} className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={observed.includes(criterion)}
                onChange={(event) =>
                  setObserved((current) =>
                    event.target.checked
                      ? [...current, criterion]
                      : current.filter((item) => item !== criterion),
                  )
                }
                className="mt-0.5 size-4 rounded border-input accent-primary"
              />
              <span>{criterion}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      <label className="flex flex-col gap-1.5 text-xs font-medium">
        Devolutiva para o aluno
        <textarea
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          rows={4}
          placeholder="Reconheça o que foi bem sustentado e indique o próximo passo."
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </label>

      {message ? <p role="status" className="text-xs text-muted-foreground">{message}</p> : null}

      <Button type="submit" className="w-fit" disabled={submitting}>
        <CheckCircle2 className="size-4" />
        {submitting ? "Salvando…" : existing ? "Atualizar avaliação" : "Confirmar avaliação"}
      </Button>
    </form>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
