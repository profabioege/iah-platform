/**
 * Módulo Lesson — Lesson Builder MVP (Sprint M12).
 *
 * Primeira implementação de código do conceito registrado em D-028.
 * Documentação: docs/DECISIONS.md D-028 (conceito), docs/STATUS.md e
 * docs/CHANGELOG.md (esta implementação, Sprint M12).
 */

export {
  createEmptyLesson,
  lessonSaveBlockers,
  type Lesson,
} from "./domain/lesson";

export type { LessonRepository } from "./domain/lesson-repository";

export { localLessonRepository } from "./infrastructure/local-lesson-repository";

import { localLessonRepository } from "./infrastructure/local-lesson-repository";
import type { LessonRepository } from "./domain/lesson-repository";

/**
 * Repositório em uso pelo Lesson Builder. Hoje sempre o local
 * (localStorage, rotulado na interface); quando o banco existir, a
 * implementação database entra aqui — nenhuma tela muda.
 */
export function getLessonRepository(): LessonRepository {
  return localLessonRepository;
}
