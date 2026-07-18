/**
 * Timeline do currículo (Sprint M14) — projeção calculada, nunca
 * persistida (mesmo princípio de `indicator-service.ts`,
 * `modules/platform`: "Indicadores não são tabela", `DOMAIN_MODEL.md`).
 *
 * "Concluída" aqui significa a Lesson estar salva (`savedAt` presente,
 * `modules/lesson`) — o planejamento está pronto. Esta Sprint não tem
 * como saber se a aula já foi de fato ministrada em sala (isso exigiria
 * um registro de execução que não existe ainda); o rótulo reflete
 * exatamente o que os dados comprovam, sem superestimar.
 */

import type { Lesson } from "@/modules/lesson";

import type { CurriculumTheme } from "./entities";

export interface CurriculumTimelineEntry {
  themeId: string;
  themeLabel: string;
  lessonId: string | null;
  lessonTopic: string | null;
  completed: boolean;
}

export interface CurriculumTimelineSummary {
  completedCount: number;
  pendingCount: number;
  developedCompetencies: string[];
}

/** Uma linha por Lesson do Tema; Temas sem nenhuma Lesson geram uma linha "pendente". */
export function buildCurriculumTimeline(
  themes: CurriculumTheme[],
  lessons: Lesson[],
): CurriculumTimelineEntry[] {
  const entries: CurriculumTimelineEntry[] = [];
  for (const theme of themes) {
    if (theme.lessonIds.length === 0) {
      entries.push({
        themeId: theme.id,
        themeLabel: theme.label,
        lessonId: null,
        lessonTopic: null,
        completed: false,
      });
      continue;
    }
    for (const lessonId of theme.lessonIds) {
      const lesson = lessons.find((l) => l.id === lessonId);
      entries.push({
        themeId: theme.id,
        themeLabel: theme.label,
        lessonId,
        lessonTopic: lesson?.topic ?? null,
        completed: lesson ? lesson.savedAt !== null : false,
      });
    }
  }
  return entries;
}

export function summarizeCurriculumTimeline(
  entries: CurriculumTimelineEntry[],
  lessons: Lesson[],
): CurriculumTimelineSummary {
  const completedCount = entries.filter((entry) => entry.completed).length;
  const pendingCount = entries.length - completedCount;
  const developedCompetencies = Array.from(
    new Set(
      lessons
        .filter((lesson) => lesson.savedAt !== null)
        .flatMap((lesson) => [...lesson.bnccCompetencies, ...lesson.bnccComputacaoCompetencies]),
    ),
  );
  return { completedCount, pendingCount, developedCompetencies };
}
