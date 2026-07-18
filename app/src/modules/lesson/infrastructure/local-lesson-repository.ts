/**
 * Implementação LOCAL da Lesson — localStorage do navegador, mesmo
 * padrão de `modules/authoring/infrastructure/local-mission-studio-repository.ts`:
 * "salva neste dispositivo", rotulado na interface. Troca por banco
 * real: checklist Mock → Banco Real de docs/PERSISTENCE.md.
 *
 * Client-side only — os componentes que a usam são "use client".
 */

import type { Lesson } from "../domain/lesson";
import type { LessonRepository } from "../domain/lesson-repository";

const STORAGE_KEY = "iah:lesson:v1";

function readAll(): Lesson[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Lesson[]) : [];
  } catch {
    return [];
  }
}

function writeAll(lessons: Lesson[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
}

export const localLessonRepository: LessonRepository = {
  async list() {
    return readAll();
  },

  async get(id) {
    return readAll().find((l) => l.id === id) ?? null;
  },

  async save(lesson) {
    const lessons = readAll();
    const index = lessons.findIndex((l) => l.id === lesson.id);
    const updated: Lesson = { ...lesson, updatedAt: new Date().toISOString() };
    if (index >= 0) lessons[index] = updated;
    else lessons.push(updated);
    writeAll(lessons);
  },
};
