import { emptyStudentWork, type StudentWork } from "../domain/student-work";

/**
 * Persistência local do trabalho do aluno (Fase 1 do MVP — localStorage).
 *
 * Um registro por Missão, no dispositivo do aluno. Uso exclusivo em
 * componentes cliente ("use client"); em ambiente sem window (SSR),
 * as funções degradam com segurança.
 */
const KEY_PREFIX = "iah:student-work:";

function storageKey(missionId: string): string {
  return `${KEY_PREFIX}${missionId}`;
}

/** Carrega o trabalho da Missão; retorna vazio se nunca foi salvo. */
export function loadStudentWork(missionId: string): StudentWork {
  if (typeof window === "undefined") return emptyStudentWork(missionId);
  try {
    const raw = window.localStorage.getItem(storageKey(missionId));
    if (!raw) return emptyStudentWork(missionId);
    const parsed = JSON.parse(raw) as Partial<StudentWork>;
    // Mescla sobre o vazio para tolerar registros de versões anteriores.
    return { ...emptyStudentWork(missionId), ...parsed, missionId };
  } catch {
    return emptyStudentWork(missionId);
  }
}

/** Salva o trabalho da Missão, atualizando o carimbo de modificação. */
export function saveStudentWork(work: StudentWork): StudentWork {
  const updated: StudentWork = { ...work, updatedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      storageKey(work.missionId),
      JSON.stringify(updated),
    );
  }
  return updated;
}
