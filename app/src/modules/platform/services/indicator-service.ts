/**
 * Serviço de Indicadores — projeção agregada de uma Turma numa Missão.
 * Indicadores nunca são persistidos (DOMAIN_MODEL.md): esta função pura
 * é a única fonte deles, recalculada a partir do MissionProgress.
 */

import type { ClassIndicators, MissionProgress } from "../domain/entities";

/** Estados que contam como "iniciou a Missão" (visualizou em diante). */
const STARTED_STATUSES = new Set([
  "visualizou",
  "investigando",
  "produzindo",
  "rascunho",
  "entregue",
  "reflexao",
  "concluiu",
]);

export function computeClassIndicators(params: {
  institutionId: string;
  classroomId: string;
  missionId: string;
  progress: MissionProgress[];
}): ClassIndicators {
  const { institutionId, classroomId, missionId, progress } = params;
  const scoped = progress.filter(
    (p) =>
      p.institutionId === institutionId &&
      p.classroomId === classroomId &&
      p.missionId === missionId,
  );

  const totalStudents = scoped.length;
  const startedCount = scoped.filter((p) =>
    STARTED_STATUSES.has(p.status),
  ).length;
  const completedCount = scoped.filter((p) => p.status === "concluiu").length;

  return {
    institutionId,
    classroomId,
    missionId,
    totalStudents,
    startedCount,
    completedCount,
    adhesionRate: totalStudents === 0 ? 0 : startedCount / totalStudents,
    completionRate: totalStudents === 0 ? 0 : completedCount / totalStudents,
    computedAt: new Date().toISOString(),
  };
}
