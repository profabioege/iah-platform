/**
 * Leitura dos percursos (D-053) — só no servidor e só no modo real.
 *
 * Tudo é lido pelo ator da sessão (JWT `iah_app`, RLS no caminho): o
 * aluno só alcança a própria turma, as listas publicadas para ela e o
 * próprio trabalho; o professor só as turmas que leciona. Nenhum dado de
 * escopo vem do cliente.
 *
 * Falhas de UM eixo não derrubam o outro: se o banco de questões não
 * responder, a trilha de IA continua aparecendo (e vice-versa), com o
 * aviso de indisponibilidade na própria seção.
 */

import { getStudentSubmissionStatus } from "@/modules/classroom";
import { localMissionRepository } from "@/modules/library";
import {
  createInstitutionalClassMonitor,
  createLearningCycleService,
} from "@/modules/platform";
import { getRequestRepositories } from "@/modules/platform/infrastructure/request-repositories";
import { MASTERY_LABEL } from "@/modules/question-bank";
import { getQuestionBankContext } from "@/modules/question-bank/infrastructure/request-context";
import { getWorkspaceContext } from "@/modules/workspace";

import {
  buildStudentPathways,
  type MissionWorkStatus,
  type PathwaysInput,
  type StudentPathways,
} from "../domain/student-pathways";
import {
  buildTeacherAiTrail,
  type TeacherTrailMission,
  type TrailListInput,
  type TrailStudentInput,
} from "../domain/teacher-ai-trail";

export interface LoadedStudentPathways {
  pathways: StudentPathways;
  /** Mensagem quando a parte disciplinar não pôde ser lida. */
  disciplineUnavailable: string | null;
}

function toMissionStatus(status: ReturnType<typeof getStudentSubmissionStatus>): MissionWorkStatus {
  if (status === "reviewed") return "avaliada";
  if (status === "submitted") return "entregue";
  if (status === "in_progress") return "em_andamento";
  return "nova";
}

export async function loadStudentPathways(): Promise<LoadedStudentPathways | null> {
  const workspace = await getWorkspaceContext();
  if (!workspace || workspace.role !== "student" || !workspace.user.studentId) return null;
  const classroomId = workspace.classrooms[0]?.id;
  if (!classroomId) return null;
  const institutionId = workspace.institution.id;
  const studentId = workspace.user.studentId;

  // ---------------------------------------------------- Trilha de IA
  const repositories = await getRequestRepositories();
  const [missions, assignments] = await Promise.all([
    localMissionRepository.list(),
    repositories.missionAssignments.listByClassroom(institutionId, classroomId),
  ]);
  const publishedMissionIds = [
    ...new Set(assignments.filter((a) => a.status === "published").map((a) => a.missionId)),
  ];
  const cycle = createLearningCycleService(repositories);
  const missionStatus: Record<string, MissionWorkStatus> = Object.fromEntries(
    await Promise.all(
      publishedMissionIds.map(async (missionId) => {
        const work = await cycle.getStudentWork({ institutionId, classroomId, studentId, missionId });
        return [missionId, toMissionStatus(getStudentSubmissionStatus(work))] as const;
      }),
    ),
  );

  // ------------------------------------------- Trilhas por disciplina
  let disciplineUnavailable: string | null = null;
  let plan: PathwaysInput["plan"] = [];
  let components: PathwaysInput["components"] = [];
  let lists: PathwaysInput["lists"] = [];
  let circuit: PathwaysInput["circuit"] = null;
  let gradeKnown = false;
  try {
    const { service, circuit: circuitService } = await getQuestionBankContext();
    const [planned, comps, mine, myCircuit] = await Promise.all([
      service.plannedSkillsForClassroom(classroomId),
      service.components(),
      service.myLists(),
      circuitService.mine(),
    ]);
    gradeKnown = planned.gradeKnown;
    plan = planned.entries.map((e) => ({
      areaId: e.skill.areaId,
      componentId: e.component.id,
      componentName: e.component.name,
      skillId: e.skill.id,
    }));
    components = comps.map((c) => ({ id: c.id, areaId: c.areaId, name: c.name }));
    // Rodadas do circuito chegam por `mine()`; `myLists()` traz as listas
    // do professor (e, conforme a RLS, as rodadas do próprio aluno).
    lists = mine.map(({ list, attempt }) => ({
      id: list.id,
      title: list.title,
      kind: list.kind,
      status: list.status,
      componentId: list.componentId,
      targetSkillId: list.targetSkillId,
      attemptStatus: attempt?.status ?? null,
    }));
    if (myCircuit) {
      const currentId = myCircuit.position.currentSkillId;
      const skill = myCircuit.sequence.find((s) => s.id === currentId) ?? null;
      const mastery = currentId ? myCircuit.mastery[currentId] : undefined;
      circuit = {
        currentSkillId: currentId,
        currentSkillCode: skill?.code ?? null,
        currentSkillAreaId: skill?.areaId ?? null,
        masteryLabel: mastery ? MASTERY_LABEL[mastery.state] : MASTERY_LABEL.sem_evidencia,
        paused: myCircuit.circuit.status !== "ativo",
      };
    }
  } catch (error) {
    disciplineUnavailable =
      error instanceof Error ? error.message : "As trilhas por disciplina não puderam ser lidas agora.";
  }

  return {
    pathways: buildStudentPathways({
      missions,
      publishedMissionIds,
      missionStatus,
      plan,
      components,
      lists,
      circuit,
      gradeKnown,
    }),
    disciplineUnavailable,
  };
}

export interface LoadedTeacherTrail {
  classrooms: Array<{
    id: string;
    name: string;
    missions: TeacherTrailMission[];
  }>;
  listsUnavailable: string | null;
}

/** Painel docente da Trilha IA & Humanidades — turmas do professor (ou da gestão). */
export async function loadTeacherAiTrail(): Promise<LoadedTeacherTrail | null> {
  const workspace = await getWorkspaceContext();
  if (!workspace || workspace.role === "student") return null;
  const institutionId = workspace.institution.id;
  const repositories = await getRequestRepositories();
  const missions = (await localMissionRepository.list()).filter((m) => m.axes);

  let listsByClassroom = new Map<string, TrailListInput[]>();
  let listsUnavailable: string | null = null;
  try {
    const { service } = await getQuestionBankContext();
    const all = await service.listsForClassrooms(workspace.classrooms.map((c) => c.id));
    const skillIds = new Set(
      missions.map((m) => `bncc-${m.axes!.discipline.skill.code.toLowerCase()}`),
    );
    const linked = all.filter((l) => l.targetSkillId && skillIds.has(l.targetSkillId));
    const delivered = new Map<string, number>(
      await Promise.all(
        linked.map(async (l) => {
          const results = await service.listResults(l.id);
          return [l.id, results.students.filter((s) => s.attempt?.status === "entregue").length] as const;
        }),
      ),
    );
    listsByClassroom = new Map();
    for (const l of all) {
      const row: TrailListInput = {
        id: l.id,
        title: l.title,
        status: l.status,
        kind: l.kind,
        targetSkillId: l.targetSkillId,
        delivered: delivered.get(l.id) ?? 0,
      };
      listsByClassroom.set(l.classroomId, [...(listsByClassroom.get(l.classroomId) ?? []), row]);
    }
  } catch (error) {
    listsUnavailable = error instanceof Error ? error.message : "Listas indisponíveis agora.";
  }

  const classrooms = await Promise.all(
    workspace.classrooms.map(async (classroom) => {
      const assignments = await repositories.missionAssignments.listByClassroom(institutionId, classroom.id);
      const assignedMissionIds = [
        ...new Set(assignments.filter((a) => a.status === "published").map((a) => a.missionId)),
      ].filter((id) => missions.some((m) => m.id === id));
      const monitor = createInstitutionalClassMonitor(repositories, institutionId, classroom.id);
      const studentsByMission: Record<string, TrailStudentInput[]> = {};
      let classroomSize = 0;
      for (const missionId of assignedMissionIds) {
        const snapshots = await monitor.listByMission(missionId);
        classroomSize = Math.max(classroomSize, snapshots.length);
        studentsByMission[missionId] = snapshots.map((s) => ({
          studentId: s.studentId,
          status: s.status,
          disciplineLevel: s.review?.axes?.discipline.level ?? null,
          aiLevel: s.review?.axes?.ai.level ?? null,
          hasAiEvidence: Boolean(s.aiEvidence),
        }));
      }
      return {
        id: classroom.id,
        name: classroom.name,
        missions: buildTeacherAiTrail({
          missions,
          assignedMissionIds,
          studentsByMission,
          classroomSize,
          lists: listsByClassroom.get(classroom.id) ?? [],
        }),
      };
    }),
  );

  return { classrooms, listsUnavailable };
}
