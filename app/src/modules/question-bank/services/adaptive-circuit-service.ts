import type {
  AdaptiveCircuit,
  ClassroomRef,
  CurriculumSkill,
  ListAttempt,
  PracticeList,
  StudentRef,
} from "../domain/entities";
import type { QuestionBankRepositories } from "../domain/repositories";
import {
  circuitPosition,
  groupEvidence,
  nextRoundLevel,
  skillMastery,
  type AnsweredItem,
  type SkillMastery,
  type StudentCircuitPosition,
} from "../domain/adaptive";
import type { PlannedSkill, QuestionBankActor, QuestionBankService } from "./question-bank-service";

/**
 * Circuito adaptativo (D-051) — casos de uso.
 *
 * Híbrido: o reforço na habilidade liberada é automático (o aluno pede a
 * rodada e o BANCO escolhe as questões — `iah_circuit_next_round`); o
 * avanço para a próxima habilidade é decisão do professor
 * (`adaptive_unlocks`). Contínuo: entregou, pode pedir a próxima.
 *
 * Nada aqui é nota: o estado por habilidade vem de `domain/adaptive.ts`.
 */

export const DEFAULT_ROUND_SIZE = 3;

export interface CircuitStudentRow {
  student: StudentRef;
  unlocked: string[];
  mastery: Record<string, SkillMastery>;
  position: StudentCircuitPosition;
  rounds: number;
}

export interface CircuitPanel {
  classroom: ClassroomRef;
  circuit: AdaptiveCircuit | null;
  sequence: PlannedSkill[];
  students: CircuitStudentRow[];
  /** Questões aprovadas que a rodada automática pode usar (vínculo oficial ou confirmado). */
  pool: Record<string, { total: number; catalog: number }>;
}

export interface MyCircuit {
  classroom: ClassroomRef;
  circuit: AdaptiveCircuit;
  sequence: CurriculumSkill[];
  unlocked: string[];
  mastery: Record<string, SkillMastery>;
  position: StudentCircuitPosition;
  openRound: PracticeList | null;
  rounds: Array<{ list: PracticeList; attempt: ListAttempt | null }>;
}

function requireRole(actor: QuestionBankActor, roles: QuestionBankActor["role"][], message: string) {
  if (!roles.includes(actor.role)) throw new Error(message);
}

/** Uma habilidade por posição, na ordem do planejamento (período, depois código). */
function sequenceOf(entries: PlannedSkill[]): PlannedSkill[] {
  const seen = new Set<string>();
  return [...entries]
    .sort((a, b) => a.plan.periodOrder - b.plan.periodOrder || a.skill.code.localeCompare(b.skill.code))
    .filter((e) => (seen.has(e.skill.id) ? false : (seen.add(e.skill.id), true)));
}

export function createAdaptiveCircuitService(
  repos: QuestionBankRepositories,
  actor: QuestionBankActor,
  bank: QuestionBankService,
) {
  /** Respostas entregues na turma (o que a RLS deixa o ator ver), com as habilidades de evidência. */
  async function evidence(classroomId: string): Promise<{
    answered: AnsweredItem[];
    lists: PracticeList[];
    attempts: ListAttempt[];
  }> {
    const lists = await repos.listLists({ classroomIds: [classroomId], status: ["publicada", "encerrada"] });
    const listIds = lists.map((l) => l.id);
    const [attempts, items] = await Promise.all([
      repos.listSubmittedAttempts(listIds),
      repos.listItemsForLists(listIds),
    ]);
    const answers = await repos.listAnswers(attempts.map((a) => a.id));
    const listById = new Map(lists.map((l) => [l.id, l]));
    const itemById = new Map(items.map((i) => [i.id, i]));
    const attemptById = new Map(attempts.map((a) => [a.id, a]));
    const answered: AnsweredItem[] = [];
    for (const a of answers) {
      const item = itemById.get(a.listItemId);
      const attempt = attemptById.get(a.attemptId);
      if (!item || !attempt || a.isCorrect === null) continue;
      const list = listById.get(item.listId);
      answered.push({
        studentId: a.studentId,
        isCorrect: a.isCorrect,
        at: attempt.submittedAt ?? attempt.startedAt,
        // Habilidade-alvo da lista (rodada ou escolhida pelo professor);
        // sem alvo, a habilidade oficial da questão.
        skillIds: [list?.targetSkillId ?? item.skillId],
      });
    }
    return { answered, lists, attempts };
  }

  function masteryFor(bySkill: Map<string, { isCorrect: boolean; at: string }[]> | undefined, skills: string[]) {
    const map = new Map<string, SkillMastery>();
    for (const id of skills) map.set(id, skillMastery(bySkill?.get(id) ?? []));
    return map;
  }

  const service = {
    // ------------------------------------------------------------------
    // Professor
    // ------------------------------------------------------------------
    async panel(classroomId: string): Promise<CircuitPanel> {
      requireRole(actor, ["professor", "administrador"], "Apenas a equipe acompanha o circuito.");
      const { classroom, entries } = await bank.plannedSkillsForClassroom(classroomId);
      const sequence = sequenceOf(entries);
      const skillIds = sequence.map((e) => e.skill.id);
      const [circuit, students, { answered, lists }] = await Promise.all([
        repos.getCircuit(classroomId),
        repos.listStudentsOfClassroom(classroomId),
        evidence(classroomId),
      ]);
      const unlocks = circuit ? await repos.listUnlocks(circuit.id) : [];
      const grouped = groupEvidence(answered);

      const pool: CircuitPanel["pool"] = {};
      for (const skillId of skillIds) {
        const items = (await bank.approvedForSkill(skillId)).filter(
          (i) => i.link.kind === "oficial" || i.link.kind === "confirmada",
        );
        pool[skillId] = { total: items.length, catalog: items.filter((i) => i.origin === "catalogo").length };
      }

      return {
        classroom,
        circuit,
        sequence,
        pool,
        students: students.map((student) => {
          const unlocked = unlocks.filter((u) => u.studentId === student.id).map((u) => u.skillId);
          const mastery = masteryFor(grouped.get(student.id), skillIds);
          return {
            student,
            unlocked,
            mastery: Object.fromEntries(mastery),
            position: circuitPosition(skillIds, new Set(unlocked), mastery),
            rounds: lists.filter((l) => l.kind === "circuito" && l.targetStudentId === student.id).length,
          };
        }),
      };
    },

    /** Liga o circuito da turma e libera a primeira habilidade da sequência para todos. */
    async activate(classroomId: string): Promise<void> {
      requireRole(actor, ["professor"], "Apenas o professor da turma liga o circuito.");
      const existing = await repos.getCircuit(classroomId);
      if (existing) {
        if (existing.status === "pausado") await repos.setCircuitStatus(existing.id, "ativo");
        return;
      }
      const { entries } = await bank.plannedSkillsForClassroom(classroomId);
      const first = sequenceOf(entries)[0];
      if (!first) throw new Error("A turma não tem habilidades planejadas para o circuito.");
      const circuitId = `circuit:${classroomId}`;
      await repos.insertCircuit({
        id: circuitId,
        institutionId: actor.institutionId,
        classroomId,
        roundSize: DEFAULT_ROUND_SIZE,
        createdBy: actor.userId,
      });
      const students = await repos.listStudentsOfClassroom(classroomId);
      await repos.insertUnlocks(
        students.map((s) => ({
          id: `unlock:${circuitId}:${s.id}:${first.skill.id}`,
          institutionId: actor.institutionId,
          circuitId,
          studentId: s.id,
          skillId: first.skill.id,
          reason: "inicio" as const,
          unlockedBy: actor.userId,
        })),
      );
    },

    async pause(classroomId: string): Promise<void> {
      requireRole(actor, ["professor"], "Apenas o professor da turma pausa o circuito.");
      const circuit = await repos.getCircuit(classroomId);
      if (!circuit) throw new Error("A turma não tem circuito.");
      await repos.setCircuitStatus(circuit.id, "pausado");
    },

    /** Decisão do professor: libera a habilidade para o aluno (avanço ou início). */
    async unlock(classroomId: string, studentId: string, skillId: string): Promise<void> {
      requireRole(actor, ["professor"], "Apenas o professor da turma libera habilidades.");
      const circuit = await repos.getCircuit(classroomId);
      if (!circuit) throw new Error("A turma não tem circuito.");
      const { entries } = await bank.plannedSkillsForClassroom(classroomId);
      const sequence = sequenceOf(entries).map((e) => e.skill.id);
      if (!sequence.includes(skillId)) throw new Error("Habilidade fora do planejamento da turma.");
      await repos.insertUnlocks([{
        id: `unlock:${circuit.id}:${studentId}:${skillId}`,
        institutionId: actor.institutionId,
        circuitId: circuit.id,
        studentId,
        skillId,
        reason: sequence[0] === skillId ? "inicio" : "avanco",
        unlockedBy: actor.userId,
      }]);
    },

    // ------------------------------------------------------------------
    // Aluno
    // ------------------------------------------------------------------
    async mine(): Promise<MyCircuit | null> {
      requireRole(actor, ["aluno"], "Apenas alunos fazem o circuito.");
      for (const classroom of await repos.listClassrooms()) {
        const circuit = await repos.getCircuit(classroom.id);
        if (!circuit) continue;
        const { entries } = await bank.plannedSkillsForClassroom(classroom.id);
        const sequence = sequenceOf(entries);
        const skillIds = sequence.map((e) => e.skill.id);
        const [unlocks, { answered, lists, attempts }] = await Promise.all([
          repos.listUnlocks(circuit.id),
          evidence(classroom.id),
        ]);
        const unlocked = unlocks.filter((u) => u.studentId === actor.studentId).map((u) => u.skillId);
        const mastery = masteryFor(groupEvidence(answered).get(actor.studentId!), skillIds);
        const rounds = lists
          .filter((l) => l.kind === "circuito" && l.targetStudentId === actor.studentId)
          .map((list) => ({ list, attempt: attempts.find((a) => a.listId === list.id) ?? null }));
        return {
          classroom,
          circuit,
          sequence: sequence.map((e) => e.skill),
          unlocked,
          mastery: Object.fromEntries(mastery),
          position: circuitPosition(skillIds, new Set(unlocked), mastery),
          openRound: rounds.find((r) => r.list.status === "publicada" && !r.attempt)?.list ?? null,
          rounds,
        };
      }
      return null;
    },

    /**
     * Pede a próxima rodada da habilidade atual (ou devolve a aberta). O
     * nível só ordena a escolha pelo rótulo editorial; quem escolhe e
     * confere é o banco.
     */
    async startRound(): Promise<string> {
      const mine = await service.mine();
      if (!mine) throw new Error("Sua turma ainda não tem circuito.");
      if (mine.openRound) return mine.openRound.id;
      const skillId = mine.position.currentSkillId;
      if (!skillId) throw new Error("Aguarde o professor liberar a primeira habilidade.");
      const last = mine.rounds
        .filter((r) => r.list.targetSkillId === skillId && r.attempt?.status === "entregue")
        .sort((a, b) => (b.attempt!.submittedAt ?? "").localeCompare(a.attempt!.submittedAt ?? ""))[0];
      const level = nextRoundLevel(
        last ? { correct: last.attempt!.scoreCorrect ?? 0, total: last.attempt!.scoreTotal ?? 0 } : null,
      );
      return repos.nextCircuitRound(mine.circuit.id, skillId, level);
    },
  };
  return service;
}

export type AdaptiveCircuitService = ReturnType<typeof createAdaptiveCircuitService>;
