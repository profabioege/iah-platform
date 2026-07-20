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

import { localLessonRepository } from "./infrastructure/local-lesson-repository";
import type { LessonRepository } from "./domain/lesson-repository";

/**
 * Repositório em uso pelo Lesson Composer. Hoje sempre o local
 * (localStorage, rotulado na interface); quando o banco existir, a
 * implementação database entra aqui — nenhuma tela muda.
 */
export function getLessonRepository(): LessonRepository {
  return localLessonRepository;
}
