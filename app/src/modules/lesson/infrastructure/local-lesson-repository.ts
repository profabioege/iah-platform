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
import { DEMO_LESSON } from "../seeds/demo-seed";

// v3 (Sprint M17): `classroomLabel` (texto livre) virou `classroomId`
// real (-> Classroom, modules/platform) — chave nova para não tentar
// ler dados no formato antigo.
const STORAGE_KEY = "iah:lesson:v3";

function readAll(): Lesson[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [DEMO_LESSON];
    const lessons = JSON.parse(raw) as Lesson[];
    // Migração do ambiente M17: navegadores já usados podiam ter uma lista
    // vazia ou Lessons de outras turmas, mas não a fatia institucional M21.
    // Preserva todo conteúdo autoral e inclui o seed somente pelo id canônico.
    return lessons.some((lesson) => lesson.id === DEMO_LESSON.id)
      ? lessons
      : [...lessons, DEMO_LESSON];
  } catch {
    return [DEMO_LESSON];
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
