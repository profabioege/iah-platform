"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import {
  createEmptyLesson,
  getLessonRepository,
  type Lesson,
} from "@/modules/lesson";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { LessonSummary } from "./lesson-summary";

/** Listagem de Lessons deste dispositivo + botão "Nova Aula" (LessonWizard). */
export function LessonList({ author }: { author: string }) {
  const router = useRouter();
  const [lessons, setLessons] = React.useState<Lesson[] | null>(null);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    getLessonRepository()
      .list()
      .then((list) =>
        setLessons([...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
      );
  }, []);

  async function handleCreate() {
    setCreating(true);
    const lesson = createEmptyLesson(author);
    await getLessonRepository().save(lesson);
    router.push(`/professor/aulas/${lesson.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={handleCreate} disabled={creating} className="w-fit">
        <Plus className="size-4" />
        Nova Aula
      </Button>

      {lessons === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : lessons.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma aula criada neste dispositivo ainda. Use &ldquo;Nova Aula&rdquo;
          para montar a primeira com o Intelligent Lesson Composer.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {lessons.map((lesson) => (
            <Link key={lesson.id} href={`/professor/aulas/${lesson.id}`}>
              <LessonSummary lesson={lesson} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
