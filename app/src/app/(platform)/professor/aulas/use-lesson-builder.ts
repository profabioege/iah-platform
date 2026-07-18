"use client";

import * as React from "react";

import {
  createEmptyLesson,
  getLessonRepository,
  lessonSaveBlockers,
  type Lesson,
} from "@/modules/lesson";

/**
 * Carrega (ou cria) e autosalva uma Lesson — mesmo padrão de
 * `mission-flow/use-student-work.ts`, aplicado ao LessonWizard.
 */
export function useLessonBuilder(lessonId: string, author: string) {
  const [lesson, setLesson] = React.useState<Lesson | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const repository = getLessonRepository();
    repository.get(lessonId).then((existing) => {
      if (cancelled) return;
      setLesson(existing ?? { ...createEmptyLesson(author), id: lessonId });
    });
    return () => {
      cancelled = true;
    };
  }, [lessonId, author]);

  const update = React.useCallback((partial: Partial<Lesson>) => {
    setLesson((current) => {
      if (!current) return current;
      const next = { ...current, ...partial };
      void getLessonRepository().save(next);
      return next;
    });
  }, []);

  return {
    lesson,
    update,
    blockers: lesson ? lessonSaveBlockers(lesson) : [],
    saved: lesson ? lesson.savedAt !== null : false,
  };
}
