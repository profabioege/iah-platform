/**
 * Implementação LOCAL do Mission Studio — localStorage do navegador,
 * mesmo padrão do trabalho do aluno (local-student-work-store): as
 * missões ficam "salvas neste dispositivo", e a interface rotula isso.
 * Troca por banco real: docs/PERSISTENCE.md (checklist Mock → Banco Real).
 *
 * Client-side only — os componentes que a usam são "use client".
 */

import type { MissionStudioRepository } from "../domain/mission-studio-repository";
import type { StudioMission } from "../domain/studio-mission";
import { publishBlockers } from "../domain/studio-mission";

const STORAGE_KEY = "iah:mission-studio:v1";

function readAll(): StudioMission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StudioMission[]) : [];
  } catch {
    return [];
  }
}

function writeAll(missions: StudioMission[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));
}

function mustGet(missions: StudioMission[], id: string): StudioMission {
  const found = missions.find((m) => m.id === id);
  if (!found) throw new Error(`Missão "${id}" não encontrada neste dispositivo.`);
  return found;
}

export const localMissionStudioRepository: MissionStudioRepository = {
  async list() {
    return readAll();
  },

  async get(id) {
    return readAll().find((m) => m.id === id) ?? null;
  },

  async save(mission) {
    const missions = readAll();
    const index = missions.findIndex((m) => m.id === mission.id);
    if (index >= 0) {
      const current = missions[index];
      if (current.status === "published" || current.status === "archived") {
        throw new Error(
          "Versão publicada/arquivada é imutável — crie uma nova versão para editar.",
        );
      }
      missions[index] = { ...mission, updatedAt: new Date().toISOString() };
    } else {
      missions.push(mission);
    }
    writeAll(missions);
  },

  async duplicate(id) {
    const missions = readAll();
    const source = mustGet(missions, id);
    const now = new Date().toISOString();
    const copy: StudioMission = {
      ...source,
      id: crypto.randomUUID(),
      lineageId: crypto.randomUUID(),
      version: 1,
      status: "draft",
      title: source.title ? `${source.title} (cópia)` : "(cópia)",
      createdAt: now,
      updatedAt: now,
    };
    missions.push(copy);
    writeAll(missions);
    return copy;
  },

  async publish(id) {
    const missions = readAll();
    const mission = mustGet(missions, id);
    if (mission.status === "published") return mission;
    if (mission.status === "archived") {
      throw new Error("Versão arquivada não pode ser publicada.");
    }
    const blockers = publishBlockers(mission);
    if (blockers.length > 0) {
      throw new Error(`Pendências de publicação: ${blockers.join(" ")}`);
    }
    const published: StudioMission = {
      ...mission,
      status: "published",
      updatedAt: new Date().toISOString(),
    };
    writeAll(missions.map((m) => (m.id === id ? published : m)));
    return published;
  },

  async createNewVersion(id) {
    const missions = readAll();
    const source = mustGet(missions, id);
    if (source.status !== "published") {
      throw new Error("Nova versão só nasce de uma versão publicada.");
    }
    const latest = Math.max(
      ...missions
        .filter((m) => m.lineageId === source.lineageId)
        .map((m) => m.version),
    );
    const now = new Date().toISOString();
    const next: StudioMission = {
      ...source,
      id: crypto.randomUUID(),
      version: latest + 1,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    missions.push(next);
    writeAll(missions);
    return next;
  },

  async archive(id) {
    const missions = readAll();
    const mission = mustGet(missions, id);
    const archived: StudioMission = {
      ...mission,
      status: "archived",
      updatedAt: new Date().toISOString(),
    };
    writeAll(missions.map((m) => (m.id === id ? archived : m)));
    return archived;
  },
};
