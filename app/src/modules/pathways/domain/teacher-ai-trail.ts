/**
 * Painel docente da Trilha IA & Humanidades (D-053).
 *
 * Mantém o ensino explícito de IA visível ao professor e separa os dois
 * eixos na leitura da turma: quantos alunos atingiram o objetivo da
 * disciplina, quantos a competência em IA — e quantos acertaram a
 * disciplina SEM evidenciar a competência em IA (e o contrário), que é
 * justamente o que um conceito único escondia.
 *
 * Função pura sobre o que o servidor leu pelo ator da sessão.
 */

import type { AxisLevel, CurriculumAreaCode } from "@/modules/library";

import { bnccSkillIdOf } from "./student-pathways";

export type LevelCounts = Record<AxisLevel | "pendente", number>;

const emptyCounts = (): LevelCounts => ({
  pendente: 0,
  nao_evidenciado: 0,
  em_desenvolvimento: 0,
  atingido: 0,
  superado: 0,
});

const reached = (level: AxisLevel | null | undefined) => level === "atingido" || level === "superado";
const notReached = (level: AxisLevel | null | undefined) =>
  level === "nao_evidenciado" || level === "em_desenvolvimento";

export interface TrailMissionInput {
  id: string;
  number: number;
  order: number;
  title: string;
  axes?: {
    discipline: { area: CurriculumAreaCode; component: string; skill: { code: string } };
    ai: { competencyIds: string[] };
  };
}

export interface TrailStudentInput {
  studentId: string;
  /** `concluiu`/`avaliado` contam como entregue (produção + reflexão). */
  status: string;
  disciplineLevel: AxisLevel | null;
  aiLevel: AxisLevel | null;
  hasAiEvidence: boolean;
}

export interface TrailListInput {
  id: string;
  title: string;
  status: string;
  kind: string;
  targetSkillId: string | null;
  delivered: number;
}

export interface TeacherTrailMission {
  id: string;
  number: number;
  title: string;
  assigned: boolean;
  discipline: { area: CurriculumAreaCode; component: string; skillCode: string } | null;
  aiCompetencies: number;
  students: number;
  started: number;
  delivered: number;
  reviewed: number;
  disciplineLevels: LevelCounts;
  aiLevels: LevelCounts;
  /** Atingiu a disciplina, mas não evidenciou a competência em IA. */
  disciplineWithoutAi: number;
  /** Evidenciou a competência em IA, mas não atingiu a disciplina. */
  aiWithoutDiscipline: number;
  linkedLists: Array<{ id: string; title: string; status: string; delivered: number }>;
}

export function buildTeacherAiTrail(input: {
  missions: TrailMissionInput[];
  assignedMissionIds: string[];
  studentsByMission: Record<string, TrailStudentInput[]>;
  classroomSize: number;
  lists: TrailListInput[];
}): TeacherTrailMission[] {
  const assigned = new Set(input.assignedMissionIds);
  return [...input.missions]
    .sort((a, b) => a.order - b.order || a.number - b.number)
    .map((mission) => {
      const rows = input.studentsByMission[mission.id] ?? [];
      const disciplineLevels = emptyCounts();
      const aiLevels = emptyCounts();
      let delivered = 0;
      let reviewed = 0;
      let started = 0;
      let disciplineWithoutAi = 0;
      let aiWithoutDiscipline = 0;
      for (const row of rows) {
        if (row.status !== "nao_acessou") started += 1;
        if (row.status === "concluiu" || row.status === "avaliado") delivered += 1;
        if (row.disciplineLevel && row.aiLevel) reviewed += 1;
        disciplineLevels[row.disciplineLevel ?? "pendente"] += 1;
        aiLevels[row.aiLevel ?? "pendente"] += 1;
        if (reached(row.disciplineLevel) && notReached(row.aiLevel)) disciplineWithoutAi += 1;
        if (reached(row.aiLevel) && notReached(row.disciplineLevel)) aiWithoutDiscipline += 1;
      }
      const skillId = mission.axes ? bnccSkillIdOf(mission.axes.discipline.skill.code) : null;
      return {
        id: mission.id,
        number: mission.number,
        title: mission.title,
        assigned: assigned.has(mission.id),
        discipline: mission.axes
          ? {
              area: mission.axes.discipline.area,
              component: mission.axes.discipline.component,
              skillCode: mission.axes.discipline.skill.code,
            }
          : null,
        aiCompetencies: mission.axes?.ai.competencyIds.length ?? 0,
        students: assigned.has(mission.id) ? input.classroomSize : 0,
        started,
        delivered,
        reviewed,
        disciplineLevels,
        aiLevels,
        disciplineWithoutAi,
        aiWithoutDiscipline,
        linkedLists: skillId
          ? input.lists
              .filter((l) => l.kind !== "circuito" && l.targetSkillId === skillId)
              .map((l) => ({ id: l.id, title: l.title, status: l.status, delivered: l.delivered }))
          : [],
      };
    });
}
