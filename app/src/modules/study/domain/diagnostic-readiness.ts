/**
 * PRONTIDÃO para um diagnóstico REAL (D-055) — função pura.
 *
 * Um diagnóstico deixa de ser demonstrativo quando NENHUMA questão vem de
 * fonte sintética (o banco marca isso, 0022). Para isso, cada habilidade
 * planejada precisa de pelo menos `DIAGNOSTIC_RULES.minAnswered`
 * questões APROVADAS NO SISTEMA por revisor humano (autor ≠ revisor,
 * imposto pela 0017/0018), de fonte não sintética e com vínculo oficial
 * ou confirmado. Aprovação "em bloco" fora do sistema ou revisão
 * assistida por IA não contam.
 *
 * O planejamento também precisa estar validado pela escola (`approved`);
 * com planejamento provisório o diagnóstico continua marcado como tal.
 */

import { DIAGNOSTIC_RULES } from "./diagnostic-evidence";

export interface ReadinessSkillInput {
  skillId: string;
  skillCode: string;
  componentName: string;
  planProvisional: boolean;
  /** Aprovadas e elegíveis (inclui as sintéticas). */
  eligible: number;
  /** Das elegíveis, quantas são de fonte sintética/demonstrativa. */
  synthetic: number;
}

export interface ReadinessSkill extends ReadinessSkillInput {
  reviewed: number;
  missing: number;
  ready: boolean;
}

export interface DiagnosticReadiness {
  ready: boolean;
  skills: ReadinessSkill[];
  readySkills: number;
  /** O que falta, em frases curtas para a tela. */
  reasons: string[];
}

export function buildDiagnosticReadiness(skills: ReadinessSkillInput[]): DiagnosticReadiness {
  const min = DIAGNOSTIC_RULES.minAnswered;
  const rows = skills.map((s) => {
    const reviewed = Math.max(0, s.eligible - s.synthetic);
    return { ...s, reviewed, missing: Math.max(0, min - reviewed), ready: reviewed >= min && !s.planProvisional };
  });
  const reasons: string[] = [];
  if (rows.length === 0) reasons.push("A turma não tem habilidades no planejamento da escola.");
  const provisional = rows.filter((r) => r.planProvisional);
  if (provisional.length) {
    reasons.push(
      `Planejamento provisório em ${provisional.length} habilidade(s): carregue o planejamento validado pela escola.`,
    );
  }
  const short = rows.filter((r) => r.missing > 0);
  if (short.length) {
    reasons.push(
      `Faltam questões revisadas (não demonstrativas) em ${short.length} habilidade(s): ` +
        short.map((r) => `${r.skillCode} (faltam ${r.missing})`).join(", ") +
        ".",
    );
  }
  return {
    ready: rows.length > 0 && rows.every((r) => r.ready),
    skills: rows,
    readySkills: rows.filter((r) => r.ready).length,
    reasons,
  };
}
