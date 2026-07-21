"use client";

import * as React from "react";
import { BookOpen } from "lucide-react";

import { getLessonRepository, type Lesson } from "@/modules/lesson";
import { Card, CardContent } from "@/components/ui/card";

/**
 * "Minha Lesson" (Sprint M17 — Learning Lifecycle): contexto da aula
 * que o Professor montou para esta Turma/Missão, quando existe. Busca
 * client-side (Lessons vivem em localStorage, `modules/lesson`) — não
 * bloqueia o Dashboard se não encontrar nenhuma.
 */
export function MyLessonCard({
  classroomId,
  missionId,
}: {
  classroomId: string;
  missionId: string;
}) {
  const [lesson, setLesson] = React.useState<Lesson | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getLessonRepository()
      .list()
      .then((lessons) => {
        if (cancelled) return;
        const match = lessons.find(
          (l) =>
            l.classroomId === classroomId && l.missionId === missionId && l.savedAt,
        );
        setLesson(match ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [classroomId, missionId]);

  if (!lesson) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex items-start gap-3 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <BookOpen className="size-4" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Minha Aula
          </p>
          <p className="text-sm font-medium text-foreground">{lesson.topic}</p>
          {lesson.objective ? (
            <p className="text-xs text-muted-foreground">{lesson.objective}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
