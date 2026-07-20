import {
  emptyStudentWork,
  getStudentSubmissionStatus,
  type StudentWork,
  type StudentWorkReview,
} from "../domain/student-work";

/**
 * Persistência local do trabalho do aluno (Fase 1 do MVP — localStorage).
 *
 * Um registro por Instituição + Aluno + Missão, no dispositivo. Uso
 * exclusivo em componentes cliente ("use client"); em ambiente sem window
 * (SSR), as funções degradam com segurança.
 */
const KEY_PREFIX = "iah:student-work:";
export const STUDENT_WORK_UPDATED_EVENT = "iah:student-work-updated";

/** Identifica o dono do trabalho: instituição + usuário (Institutional Workspace). */
export interface StudentWorkScope {
  institutionId: string;
  ownerId: string;
}

function storageKey(scope: StudentWorkScope, missionId: string): string {
  return `${KEY_PREFIX}${scope.institutionId}:${scope.ownerId}:${missionId}`;
}

/**
 * Chave usada antes do isolamento por Instituição/Aluno (M15–M19): um só
 * registro por Missão, compartilhado por qualquer conta que usasse o mesmo
 * navegador. Migração explícita (nunca leitura silenciosa): na primeira
 * leitura de um escopo novo, se a chave antiga existir, o conteúdo é
 * transferido para a chave do usuário atual e a chave antiga é removida —
 * ela não pode continuar visível a outra conta depois disso.
 */
function legacyStorageKey(missionId: string): string {
  return `${KEY_PREFIX}${missionId}`;
}

function migrateLegacyIfPresent(scope: StudentWorkScope, missionId: string): void {
  const legacyKey = legacyStorageKey(missionId);
  const legacyRaw = window.localStorage.getItem(legacyKey);
  if (legacyRaw === null) return;
  window.localStorage.setItem(storageKey(scope, missionId), legacyRaw);
  window.localStorage.removeItem(legacyKey);
}

/** Carrega o trabalho da Missão para o dono do escopo; retorna vazio se nunca foi salvo. */
export function loadStudentWork(
  scope: StudentWorkScope,
  missionId: string,
): StudentWork {
  if (typeof window === "undefined") return emptyStudentWork(missionId);
  try {
    const key = storageKey(scope, missionId);
    if (window.localStorage.getItem(key) === null) {
      migrateLegacyIfPresent(scope, missionId);
    }
    const raw = window.localStorage.getItem(key);
    if (!raw) return emptyStudentWork(missionId);
    const parsed = JSON.parse(raw) as Partial<StudentWork>;
    // Mescla sobre o vazio para tolerar registros de versões anteriores.
    return { ...emptyStudentWork(missionId), ...parsed, missionId };
  } catch {
    return emptyStudentWork(missionId);
  }
}

/** Salva o trabalho da Missão do dono do escopo, atualizando o carimbo de modificação. */
export function saveStudentWork(
  scope: StudentWorkScope,
  work: StudentWork,
): StudentWork {
  const updated: StudentWork = { ...work, updatedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      storageKey(scope, work.missionId),
      JSON.stringify(updated),
    );
    window.dispatchEvent(
      new CustomEvent(STUDENT_WORK_UPDATED_EVENT, {
        detail: { ...scope, missionId: work.missionId },
      }),
    );
  }
  return updated;
}

/** Registra a decisão humana do Professor sobre uma entrega concluída. */
export function reviewStudentWork(
  scope: StudentWorkScope,
  missionId: string,
  review: Omit<StudentWorkReview, "reviewedAt">,
): StudentWork {
  const current = loadStudentWork(scope, missionId);
  const status = getStudentSubmissionStatus(current);
  if (status !== "submitted" && status !== "reviewed") {
    throw new Error("A entrega precisa estar concluída antes da avaliação.");
  }
  return saveStudentWork(scope, {
    ...current,
    review: { ...review, reviewedAt: new Date().toISOString() },
  });
}

/** Lista todos os trabalhos salvos neste dispositivo para o dono do escopo (todas as Missões). */
export function listAllStudentWork(scope: StudentWorkScope): StudentWork[] {
  if (typeof window === "undefined") return [];
  const prefix = storageKey(scope, "");
  const works: StudentWork[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    works.push(loadStudentWork(scope, key.slice(prefix.length)));
  }
  return works;
}
