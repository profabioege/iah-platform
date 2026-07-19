"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, PlayCircle, Send, Users } from "lucide-react";

import type { Classroom, MissionAssignment } from "@/modules/platform";
import type { Mission } from "@/modules/library";
import type { KnowledgeDocument } from "@/modules/knowledge";
import { getLessonRepository, type Lesson } from "@/modules/lesson";
import type { StudentMissionSnapshot } from "@/modules/classroom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { ClassPanel } from "../class-panel";
import { LessonPreview } from "../aulas/[id]/lesson-preview";
import { publishLessonMission } from "./actions";

export interface ClassroomLifecycle {
  classroom: Classroom;
  assignments: MissionAssignment[];
  activeAssignment: MissionAssignment | null;
  snapshot: StudentMissionSnapshot[];
}

/**
 * Fluxo Professor do Learning Lifecycle (Sprint M17): seleciona a turma
 * (chips) → vê as Lessons dela (`modules/lesson`, localStorage) →
 * seleciona uma Lesson → vê Objetivos/Competências/Mission Flow/
 * Materiais/Tempo (`LessonPreview`, reaproveitado) → publica a Mission
 * → acompanha a turma (`ClassPanel`, reaproveitado, dados de
 * `modules/platform`).
 */
export function TurmasExplorer({
  institutionId,
  classroomLifecycles,
  missions,
  knowledgeDocuments,
}: {
  institutionId: string;
  classroomLifecycles: ClassroomLifecycle[];
  missions: Mission[];
  knowledgeDocuments: KnowledgeDocument[];
}) {
  const router = useRouter();
  const [selectedClassroomId, setSelectedClassroomId] = React.useState(
    classroomLifecycles[0]?.classroom.id ?? "",
  );
  const [lessons, setLessons] = React.useState<Lesson[] | null>(null);
  const [expandedLessonId, setExpandedLessonId] = React.useState<string | null>(null);
  const [publishing, setPublishing] = React.useState(false);

  React.useEffect(() => {
    getLessonRepository().list().then(setLessons);
  }, []);

  const current = classroomLifecycles.find(
    (c) => c.classroom.id === selectedClassroomId,
  );
  const classroomLessons = (lessons ?? []).filter(
    (lesson) => lesson.classroomId === selectedClassroomId,
  );

  async function handlePublish(lesson: Lesson) {
    if (!lesson.missionId) return;
    setPublishing(true);
    await publishLessonMission({
      institutionId,
      classroomId: lesson.classroomId!,
      missionId: lesson.missionId,
    });
    setPublishing(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Seleciona uma turma */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Selecionar turma">
        {classroomLifecycles.map(({ classroom }) => (
          <button
            key={classroom.id}
            type="button"
            role="tab"
            aria-selected={selectedClassroomId === classroom.id}
            onClick={() => {
              setSelectedClassroomId(classroom.id);
              setExpandedLessonId(null);
            }}
          >
            <Badge
              variant={selectedClassroomId === classroom.id ? undefined : "outline"}
              className={cn(
                "cursor-pointer py-1.5 text-sm font-normal",
                selectedClassroomId === classroom.id && "bg-primary text-primary-foreground",
              )}
            >
              {classroom.name}
            </Badge>
          </button>
        ))}
      </div>

      {current ? (
        <>
          {/* Visualiza as Lessons daquela turma */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Lessons de {current.classroom.name}
            </p>
            {lessons === null ? (
              <Skeleton className="h-20 w-full rounded-xl" />
            ) : classroomLessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma Lesson desta turma ainda — monte uma no Lesson Composer
                (Etapa 1, selecione {current.classroom.name} como Turma).
              </p>
            ) : (
              classroomLessons.map((lesson) => {
                const mission = missions.find((m) => m.id === lesson.missionId) ?? null;
                const expanded = expandedLessonId === lesson.id;
                const alreadyPublished = current.assignments.some(
                  (a) => a.missionId === lesson.missionId,
                );
                return (
                  <Card key={lesson.id}>
                    <CardContent className="flex flex-col gap-3 py-2">
                      <button
                        type="button"
                        onClick={() => setExpandedLessonId(expanded ? null : lesson.id)}
                        className="flex items-center justify-between gap-3 text-left"
                      >
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm font-semibold">
                            {lesson.topic || "Aula sem tema definido"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {mission?.title ?? "Sem Mission Flow"}
                          </p>
                        </div>
                        {alreadyPublished ? (
                          <Badge className="bg-chart-2/15 text-chart-2">Publicada</Badge>
                        ) : (
                          <Badge variant="outline">Não publicada</Badge>
                        )}
                      </button>

                      {expanded ? (
                        <div className="flex flex-col gap-4 border-t border-border pt-4">
                          <LessonPreview
                            lesson={lesson}
                            mission={mission}
                            knowledgeDocuments={knowledgeDocuments.filter((d) =>
                              lesson.knowledgeDocumentIds.includes(d.id),
                            )}
                          />
                          <Button
                            onClick={() => handlePublish(lesson)}
                            disabled={!lesson.missionId || publishing}
                            className="w-fit"
                          >
                            <Send className="size-4" />
                            {alreadyPublished
                              ? "Publicar novamente para a turma"
                              : "Publicar Mission para a turma"}
                          </Button>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Após a entrega: acompanhamento da turma */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Acompanhamento de {current.classroom.name}
            </p>
            {!current.activeAssignment ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma Mission publicada para esta turma ainda.
              </p>
            ) : (
              <>
                <ClassroomSummary snapshot={current.snapshot} />
                <ClassPanel students={current.snapshot} />
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ClassroomSummary({ snapshot }: { snapshot: StudentMissionSnapshot[] }) {
  const total = snapshot.length;
  const started = snapshot.filter((s) => s.status !== "nao_acessou").length;
  const completed = snapshot.filter((s) => s.status === "concluiu").length;
  const pending = total - completed;
  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="flex flex-wrap gap-x-6 gap-y-2 py-2 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-4 text-muted-foreground" />
          {total} aluno{total === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <PlayCircle className="size-4 text-primary" />
          {started} iniciaram
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="size-4 text-chart-2" />
          {completed} concluíram
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          {pending} pendente{pending === 1 ? "" : "s"}
        </span>
        <span className="ml-auto font-semibold text-foreground">
          {percentComplete}% da turma
        </span>
      </CardContent>
    </Card>
  );
}
