/**
 * Contrato de persistência da Lesson — mesmo padrão de
 * `modules/authoring/domain/mission-studio-repository.ts`.
 */

import type { Lesson } from "./lesson";

export interface LessonRepository {
  list(): Promise<Lesson[]>;
  get(id: string): Promise<Lesson | null>;
  /** Cria ou atualiza (autosave a cada etapa do LessonWizard). */
  save(lesson: Lesson): Promise<void>;
}
