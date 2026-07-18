import { Clock, Layers, Sparkles, Tag, Users } from "lucide-react";

import { LESSON_FORMAT_LABEL, type Lesson } from "@/modules/lesson";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Cartão compacto de uma Lesson — Planejamento em relance (Série, Turma,
 * Tempo, Tema, Metodologia, Competências). Reaproveitado na listagem
 * `/professor/aulas` e na Etapa 7 (Preview) do Intelligent Lesson Composer.
 */
export function LessonSummary({ lesson }: { lesson: Lesson }) {
  const competencyCount =
    lesson.bnccCompetencies.length + lesson.bnccComputacaoCompetencies.length;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-base font-semibold leading-snug">
            {lesson.topic || "Aula sem tema definido"}
          </p>
          {lesson.savedAt ? (
            <Badge className="bg-chart-2/15 text-chart-2">Salva</Badge>
          ) : (
            <Badge variant="outline">Rascunho</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="size-3.5" />
            {lesson.grade || "Série não definida"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            {lesson.classroomLabel || "Turma não definida"}
          </span>
          {lesson.estimatedMinutes ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {lesson.estimatedMinutes} min
            </span>
          ) : null}
          {lesson.format ? (
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              {LESSON_FORMAT_LABEL[lesson.format]}
            </span>
          ) : null}
          {competencyCount > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Tag className="size-3.5" />
              {competencyCount} competência{competencyCount > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
