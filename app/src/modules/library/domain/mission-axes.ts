/**
 * Missão de dois eixos — aprendizagem da disciplina × competência em IA
 * (D-053, docs/reformulacao/07-dois-eixos-ia-e-disciplinas.md).
 *
 * Uma Missão de IA & Humanidades ensina IA explicitamente E trabalha uma
 * habilidade de uma disciplina. Os dois objetivos são registrados,
 * acompanhados e avaliados SEPARADAMENTE: acertar a análise histórica não
 * comprova que o aluno verificou criticamente a resposta da IA, e
 * vice-versa.
 *
 * Os campos ficam no arquivo de conteúdo da Missão (convenção "uma Missão
 * = um arquivo"); o banco guarda o que o aluno fez e o que o professor
 * avaliou (migration 0021).
 */

import { AI_COMPETENCIES, type AiCompetency } from "./ai-competencies";

/** Áreas do Ensino Médio na BNCC (mesmos códigos de `curriculum_areas`). */
export type CurriculumAreaCode = "LGG" | "MAT" | "CNT" | "CHS";

export const AREA_NAMES: Record<CurriculumAreaCode, string> = {
  CHS: "Ciências Humanas e Sociais Aplicadas",
  LGG: "Linguagens e suas Tecnologias",
  MAT: "Matemática e suas Tecnologias",
  CNT: "Ciências da Natureza e suas Tecnologias",
};

export interface MissionDisciplineAxis {
  area: CurriculumAreaCode;
  /** Componente em que a habilidade é trabalhada (ex.: "História"). */
  component: string;
  /** Objetivo da disciplina, em linguagem do professor. */
  objective: string;
  /** Habilidade oficial avaliada neste eixo — só código conferido na fonte. */
  skill: {
    framework: "bncc";
    code: string;
    text: string;
    /** De onde o texto foi conferido e quando. */
    reference: string;
  };
  /** Critérios de avaliação DESTE eixo. */
  criteria: string[];
}

export interface MissionAiAxis {
  /** Objetivo de aprendizagem de IA. */
  objective: string;
  /** Competências do referencial IAH (`ai-competencies.ts`) trabalhadas. */
  competencyIds: string[];
  /** Instrução prática: o que o aluno faz com a IA nesta Missão. */
  practicalInstruction: string;
  /** O que conta como evidência de uso CRÍTICO da IA. */
  criticalUseEvidence: string[];
  /** Critérios de avaliação DESTE eixo. */
  criteria: string[];
}

export interface MissionAxes {
  discipline: MissionDisciplineAxis;
  ai: MissionAiAxis;
  /** Critérios da reflexão (a pergunta continua em `Mission.reflection`). */
  reflectionCriteria: string[];
}

/** Escala única dos dois eixos — nível observado, NÃO nota nem TRI. */
export type AxisLevel = "nao_evidenciado" | "em_desenvolvimento" | "atingido" | "superado";

export const AXIS_LEVELS: Array<{ value: AxisLevel; label: string }> = [
  { value: "nao_evidenciado", label: "Não evidenciado" },
  { value: "em_desenvolvimento", label: "Em desenvolvimento" },
  { value: "atingido", label: "Atingido" },
  { value: "superado", label: "Superado" },
];

export function axisLevelLabel(level: AxisLevel | null | undefined): string {
  return AXIS_LEVELS.find((l) => l.value === level)?.label ?? "Pendente";
}

/** Competências do referencial resolvidas para exibição (ids desconhecidos são recusados). */
export function resolveAiCompetencies(axes: MissionAxes): AiCompetency[] {
  return axes.ai.competencyIds.map((id) => {
    const found = AI_COMPETENCIES.find((c) => c.id === id);
    if (!found) throw new Error(`Competência de IA desconhecida no referencial IAH: ${id}`);
    return found;
  });
}

/**
 * Confere que a especificação separa de fato os dois eixos. Usado em teste
 * de conteúdo: toda Missão com `axes` precisa passar.
 */
export function validateMissionAxes(axes: MissionAxes): string[] {
  const problems: string[] = [];
  const d = axes.discipline;
  if (!d.objective.trim()) problems.push("eixo disciplinar sem objetivo");
  if (!/^EM13[A-Z]{2,3}\d{3}$/.test(d.skill.code)) problems.push(`código BNCC inválido: ${d.skill.code}`);
  if (!d.skill.text.trim() || !d.skill.reference.trim()) problems.push("habilidade sem texto ou sem referência");
  if (d.criteria.length === 0) problems.push("eixo disciplinar sem critérios");
  const a = axes.ai;
  if (!a.objective.trim()) problems.push("eixo de IA sem objetivo");
  if (a.competencyIds.length === 0) problems.push("eixo de IA sem competência");
  if (!a.practicalInstruction.trim()) problems.push("eixo de IA sem instrução prática");
  if (a.criticalUseEvidence.length === 0) problems.push("eixo de IA sem evidências de uso crítico");
  if (a.criteria.length === 0) problems.push("eixo de IA sem critérios");
  if (axes.reflectionCriteria.length === 0) problems.push("reflexão sem critérios");
  const shared = d.criteria.filter((c) => a.criteria.includes(c));
  if (shared.length > 0) problems.push(`critério repetido nos dois eixos: ${shared.join("; ")}`);
  try {
    resolveAiCompetencies(axes);
  } catch (error) {
    problems.push((error as Error).message);
  }
  return problems;
}
