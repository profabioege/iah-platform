"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import {
  listLocalMissionAssignments,
  saveLocalMissionAssignment,
  type Classroom,
  type MissionAssignment,
} from "@/modules/platform";
import type { Mission } from "@/modules/library";
import type { KnowledgeDocument } from "@/modules/knowledge";
import { getLessonRepository, type Lesson } from "@/modules/lesson";
import type { StudentMissionSnapshot } from "@/modules/classroom";
import { isRealModeClient } from "@/lib/auth-flags";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { ClassPanel } from "../class-panel";
import { LessonPreview } from "../aulas/[id]/lesson-preview";
import { publishLessonMission } from "./actions";
import { parseMissionContent } from "../../missoes/[id]/mission-flow/parse-mission-content";

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
  reviewer,
  classroomLifecycles,
  missions,
  knowledgeDocuments,
}: {
  institutionId: string;
  reviewer: { id: string; name: string };
  classroomLifecycles: ClassroomLifecycle[];
  missions: Mission[];
  knowledgeDocuments: KnowledgeDocument[];
}) {
  const router = useRouter();
  const realMode = isRealModeClient();
  const [selectedClassroomId, setSelectedClassroomId] = React.useState(
    classroomLifecycles.find((item) => item.activeAssignment)?.classroom.id ??
      classroomLifecycles[0]?.classroom.id ??
      "",
  );
  const [lessons, setLessons] = React.useState<Lesson[] | null>(null);
  const [expandedLessonId, setExpandedLessonId] = React.useState<string | null>(null);
  const [publishing, setPublishing] = React.useState(false);
  const [localAssignments, setLocalAssignments] = React.useState<MissionAssignment[]>([]);

  React.useEffect(() => {
    getLessonRepository().list().then(setLessons);
    // Espelho local de publicações (M21) — só no modo demonstração; no
    // modo real, mission_assignments é a única fonte (D-041).
    if (!realMode) setLocalAssignments(listLocalMissionAssignments(institutionId));
  }, [institutionId, realMode]);

  const currentBase = classroomLifecycles.find(
    (c) => c.classroom.id === selectedClassroomId,
  );
  const current = React.useMemo(() => {
    if (!currentBase) return undefined;
    const assignments = mergeAssignments(
      currentBase.assignments,
      localAssignments.filter(
        (assignment) => assignment.classroomId === selectedClassroomId,
      ),
    );
    const activeAssignment = assignments
      .filter((assignment) => assignment.status === "published")
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0] ?? null;
    return { ...currentBase, assignments, activeAssignment };
  }, [currentBase, localAssignments, selectedClassroomId]);
  const classroomLessons = (lessons ?? []).filter(
    (lesson) => lesson.classroomId === selectedClassroomId,
  );

  async function handlePublish(lesson: Lesson) {
    if (!lesson.missionId) return;
    setPublishing(true);
    const assignment = await publishLessonMission({
      institutionId,
      classroomId: lesson.classroomId!,
      missionId: lesson.missionId,
      lessonId: lesson.id,
    });
    if (!realMode) {
      saveLocalMissionAssignment(assignment);
      setLocalAssignments((currentAssignments) =>
        mergeAssignments(currentAssignments, [assignment]),
      );
    }
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
                <ClassPanel
                  students={current.snapshot}
                  institutionId={institutionId}
                  classroomId={current.classroom.id}
                  missionId={current.activeAssignment.missionId}
                  reviewer={reviewer}
                  criteria={missionCriteria(
                    missions.find(
                      (mission) => mission.id === current.activeAssignment?.missionId,
                    ),
                  )}
                />
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function mergeAssignments(
  serverAssignments: MissionAssignment[],
  localAssignments: MissionAssignment[],
): MissionAssignment[] {
  const merged = new Map(serverAssignments.map((assignment) => [assignment.id, assignment]));
  for (const assignment of localAssignments) merged.set(assignment.id, assignment);
  return [...merged.values()];
}

function missionCriteria(mission: Mission | undefined): string[] {
  if (!mission) return [];
  return parseMissionContent(mission.didacticMaterials).auditCriteria.map(
    (criterion) => `${criterion.label}: ${criterion.description}`,
  );
}
