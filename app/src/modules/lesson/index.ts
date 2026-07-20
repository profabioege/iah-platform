/**
 * Módulo Lesson — Intelligent Lesson Composer (Sprint M13), evolução do
 * Lesson Builder MVP (Sprint M12).
 *
 * Implementação de código do conceito registrado em D-028. Documentação:
 * docs/DECISIONS.md D-028 (conceito), docs/STATUS.md e docs/CHANGELOG.md
 * (esta implementação, Sprints M12/M13).
 */

export {
  createEmptyLesson,
  lessonSaveBlockers,
  LESSON_FORMAT_LABEL,
  LESSON_FORMATS,
  type Lesson,
  type LessonFormat,
} from "./domain/lesson";

export {
  rankKnowledgeDocuments,
  suggestLessonFormat,
  suggestMission,
} from "./domain/composer";

export type { LessonRepository } from "./domain/lesson-repository";

export { localLessonRepository } from "./infrastructure/local-lesson-repository";
export { DEMO_LESSON } from "./seeds/demo-seed";
export {
  getLessonRemote,
  listLessonsRemote,
  saveLessonRemote,
} from "./infrastructure/database/lesson-actions";

import { isRealModeClient } from "@/lib/auth-flags";

import { localLessonRepository } from "./infrastructure/local-lesson-repository";
import {
  getLessonRemote,
  listLessonsRemote,
  saveLessonRemote,
} from "./infrastructure/database/lesson-actions";
import type { LessonRepository } from "./domain/lesson-repository";

/**
 * Repositório em uso pelo Lesson Composer — chamável de componente
 * "use client" (M22): no modo real, delega às Server Actions
 * (`infrastructure/database/lesson-actions.ts`, banco real); no modo
 * demonstração, ao localStorage rotulado de sempre. Nenhuma tela decide
 * isso sozinha (D-001).
 */
export function getLessonRepository(): LessonRepository {
  if (isRealModeClient()) {
    return {
      list: listLessonsRemote,
      get: getLessonRemote,
      save: saveLessonRemote,
    };
  }
  return localLessonRepository;
}
