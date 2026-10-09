/**
 * Percursos do aluno (D-053) — os DOIS eixos do IAH na mesma tela:
 *
 *  1. Trilha IA & Humanidades: as Missões de IA publicadas para a turma.
 *     Não depende da série: a trilha começa onde o professor a coloca.
 *  2. Trilhas de estudo por área (Humanas, Linguagens, Matemática,
 *     Natureza): planejamento da escola para a série da turma + listas
 *     publicadas + circuito adaptativo.
 *
 * Função pura: recebe o que o servidor já leu (sempre pelo ator da
 * sessão, com RLS) e só organiza. Nada aqui grava, calcula nota ou
 * proficiência — "progresso" é contagem de atividades entregues.
 */

import type { CurriculumAreaCode } from "@/modules/library";

export const AREA_ORDER: CurriculumAreaCode[] = ["CHS", "LGG", "MAT", "CNT"];

export const AREA_LABELS: Record<CurriculumAreaCode, string> = {
  CHS: "Ciências Humanas",
  LGG: "Linguagens",
  MAT: "Matemática",
  CNT: "Ciências da Natureza",
};

/** `curriculum_areas.id` (0016) → código da área. */
export const AREA_ID_TO_CODE: Record<string, CurriculumAreaCode> = {
  chs: "CHS",
  lgg: "LGG",
  mat: "MAT",
  cnt: "CNT",
};

/** Mesmo esquema de id de `bnccSkillId` (catálogo): `bncc-em13chs101`. */
export const bnccSkillIdOf = (code: string) => `bncc-${code.toLowerCase()}`;

export type MissionWorkStatus = "nova" | "em_andamento" | "entregue" | "avaliada";

export type PathwayStatus =
  | "em_andamento" // há atividade aberta
  | "em_dia" // tudo o que foi publicado está entregue
  | "aguardando_atividade" // há planejamento/trilha, mas nada publicado ainda
  | "sem_conteudo"; // nada planejado para a série da turma

export interface NextActivity {
  kind: "missao" | "lista" | "circuito";
  label: string;
  href: string;
}

export interface LinkedList {
  listId: string;
  title: string;
  done: boolean;
  href: string;
}

export interface AiMissionEntry {
  id: string;
  number: number;
  title: string;
  status: MissionWorkStatus;
  /** Eixo disciplinar da Missão, quando ela tem dois eixos. */
  discipline: { area: CurriculumAreaCode; component: string; skillCode: string } | null;
  aiCompetencies: number;
  /** Listas da turma cuja habilidade-alvo é a habilidade da Missão. */
  linkedLists: LinkedList[];
}

export interface AiPathway {
  missions: AiMissionEntry[];
  done: number;
  total: number;
  next: NextActivity | null;
  status: PathwayStatus;
}

export interface AreaPathway {
  code: CurriculumAreaCode;
  label: string;
  components: string[];
  plannedSkills: number;
  listsDone: number;
  listsTotal: number;
  /** Circuito adaptativo da turma, quando a habilidade liberada é desta área. */
  circuit: { skillCode: string; masteryLabel: string } | null;
  next: NextActivity | null;
  status: PathwayStatus;
}

export interface StudentPathways {
  ai: AiPathway;
  areas: AreaPathway[];
  /** Série da turma, quando a escola informou (`classrooms.grade_code`). */
  gradeKnown: boolean;
}

export interface PathwaysInput {
  /** Catálogo de Missões (arquivos de conteúdo). */
  missions: Array<{
    id: string;
    number: number;
    order: number;
    title: string;
    axes?: {
      discipline: { area: CurriculumAreaCode; component: string; skill: { code: string } };
      ai: { competencyIds: string[] };
    };
  }>;
  /** Missões publicadas para a turma do aluno. */
  publishedMissionIds: string[];
  /** Estado do trabalho do aluno por Missão. */
  missionStatus: Record<string, MissionWorkStatus>;
  /** Planejamento da série da turma: componente e habilidade, com a área. */
  plan: Array<{ areaId: string; componentId: string; componentName: string; skillId: string }>;
  /** Componentes conhecidos (para classificar listas por área). */
  components: Array<{ id: string; areaId: string; name: string }>;
  /** Listas que o aluno alcança, com a tentativa dele. Rodadas do circuito incluídas. */
  lists: Array<{
    id: string;
    title: string;
    kind: string;
    status: string;
    componentId: string;
    targetSkillId: string | null;
    attemptStatus: "em_andamento" | "entregue" | null;
  }>;
  /** Circuito do aluno, quando ligado na turma. */
  circuit: {
    currentSkillId: string | null;
    currentSkillCode: string | null;
    currentSkillAreaId: string | null;
    masteryLabel: string;
    paused: boolean;
  } | null;
  gradeKnown: boolean;
}

function missionNext(entry: AiMissionEntry): NextActivity {
  const verb = entry.status === "nova" ? "Começar" : "Continuar";
  return {
    kind: "missao",
    label: `${verb} a Missão ${entry.number}: ${entry.title}`,
    href: `/missoes/${encodeURIComponent(entry.id)}`,
  };
}

const listHref = (id: string) => `/dashboard/listas/${encodeURIComponent(id)}`;

export function buildStudentPathways(input: PathwaysInput): StudentPathways {
  const published = new Set(input.publishedMissionIds);
  const teacherLists = input.lists.filter((l) => l.kind !== "circuito" && l.status !== "rascunho");

  // ---------------------------------------------------------------- IA
  const missions: AiMissionEntry[] = input.missions
    .filter((m) => published.has(m.id))
    .sort((a, b) => a.order - b.order || a.number - b.number)
    .map((m) => {
      const skillId = m.axes ? bnccSkillIdOf(m.axes.discipline.skill.code) : null;
      return {
        id: m.id,
        number: m.number,
        title: m.title,
        status: input.missionStatus[m.id] ?? "nova",
        discipline: m.axes
          ? {
              area: m.axes.discipline.area,
              component: m.axes.discipline.component,
              skillCode: m.axes.discipline.skill.code,
            }
          : null,
        aiCompetencies: m.axes?.ai.competencyIds.length ?? 0,
        linkedLists: skillId
          ? teacherLists
              .filter((l) => l.targetSkillId === skillId)
              .map((l) => ({
                listId: l.id,
                title: l.title,
                done: l.attemptStatus === "entregue",
                href: listHref(l.id),
              }))
          : [],
      };
    });
  const aiDone = missions.filter((m) => m.status === "entregue" || m.status === "avaliada").length;
  const pendingMission = missions.find((m) => m.status === "nova" || m.status === "em_andamento");
  const pendingLinked = missions.flatMap((m) => m.linkedLists).find((l) => !l.done);
  const ai: AiPathway = {
    missions,
    done: aiDone,
    total: missions.length,
    next: pendingMission
      ? missionNext(pendingMission)
      : pendingLinked
        ? { kind: "lista", label: `Exercícios ligados: ${pendingLinked.title}`, href: pendingLinked.href }
        : null,
    status:
      missions.length === 0
        ? "aguardando_atividade"
        : pendingMission || pendingLinked
          ? "em_andamento"
          : "em_dia",
  };

  // ------------------------------------------------------------ Áreas
  const areaOfComponent = new Map(input.components.map((c) => [c.id, c.areaId]));
  for (const p of input.plan) areaOfComponent.set(p.componentId, p.areaId);

  const areas: AreaPathway[] = AREA_ORDER.map((code) => {
    const areaId = Object.entries(AREA_ID_TO_CODE).find(([, c]) => c === code)![0];
    const planned = input.plan.filter((p) => p.areaId === areaId);
    const components = [...new Set(planned.map((p) => p.componentName))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const lists = teacherLists.filter((l) => areaOfComponent.get(l.componentId) === areaId);
    const listsDone = lists.filter((l) => l.attemptStatus === "entregue").length;
    const openList = lists.find((l) => l.attemptStatus !== "entregue" && l.status === "publicada");

    const circuitHere =
      input.circuit && !input.circuit.paused && input.circuit.currentSkillAreaId === areaId
        ? input.circuit
        : null;

    let next: NextActivity | null = null;
    if (openList) {
      next = { kind: "lista", label: `Responder: ${openList.title}`, href: listHref(openList.id) };
    } else if (circuitHere?.currentSkillCode) {
      next = {
        kind: "circuito",
        label: `Circuito: rodada em ${circuitHere.currentSkillCode}`,
        href: "/dashboard/circuito",
      };
    }

    let status: PathwayStatus;
    if (next) status = "em_andamento";
    else if (planned.length === 0 && lists.length === 0) status = "sem_conteudo";
    else if (lists.length > 0 && listsDone === lists.length) status = "em_dia";
    else status = "aguardando_atividade";

    return {
      code,
      label: AREA_LABELS[code],
      components,
      plannedSkills: new Set(planned.map((p) => p.skillId)).size,
      listsDone,
      listsTotal: lists.length,
      circuit: circuitHere?.currentSkillCode
        ? { skillCode: circuitHere.currentSkillCode, masteryLabel: circuitHere.masteryLabel }
        : null,
      next,
      status,
    };
  });

  return { ai, areas, gradeKnown: input.gradeKnown };
}

export const PATHWAY_STATUS_LABEL: Record<PathwayStatus, string> = {
  em_andamento: "Em andamento",
  em_dia: "Em dia",
  aguardando_atividade: "Aguardando atividade do professor",
  sem_conteudo: "Sem conteúdo planejado para a sua série",
};

export const MISSION_STATUS_LABEL: Record<MissionWorkStatus, string> = {
  nova: "Nova",
  em_andamento: "Em andamento",
  entregue: "Entregue",
  avaliada: "Avaliada",
};
