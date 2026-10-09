/**
 * Regras do ciclo de uma Missão de dois eixos (D-053).
 *
 * Funções puras: o serviço do ciclo as aplica com a especificação da
 * Missão (arquivo de conteúdo); o banco (0021) impõe por conta própria
 * o que dá para impor sem conhecer o conteúdo (níveis válidos, os dois
 * eixos juntos, habilidade identificada, tamanhos).
 */

import {
  isAiEvidenceComplete,
  type AiUseEvidence,
  type StudentWorkAxesReview,
} from "@/modules/classroom";
import { AXIS_LEVELS, type MissionAxes } from "@/modules/library";

export const AI_EVIDENCE_LIMITS: Record<keyof AiUseEvidence, number> = {
  tool: 200,
  request: 2_000,
  response: 3_000,
  verification: 3_000,
  decision: 3_000,
};

const AI_EVIDENCE_LABELS: Record<keyof AiUseEvidence, string> = {
  tool: "ferramenta",
  request: "pedido à IA",
  response: "resposta da IA",
  verification: "verificação",
  decision: "decisão",
};

export function assertAiEvidenceWithinLimit(evidence: AiUseEvidence): AiUseEvidence {
  for (const field of Object.keys(AI_EVIDENCE_LIMITS) as Array<keyof AiUseEvidence>) {
    const value = evidence[field];
    if (typeof value !== "string") throw new Error(`Campo inválido no registro de uso da IA: ${field}.`);
    if (value.length > AI_EVIDENCE_LIMITS[field]) {
      throw new Error(
        `O campo "${AI_EVIDENCE_LABELS[field]}" passou do limite de ` +
          `${AI_EVIDENCE_LIMITS[field].toLocaleString("pt-BR")} caracteres.`,
      );
    }
  }
  return evidence;
}

/** Uma Missão de dois eixos só é entregue com o registro de uso da IA completo. */
export function assertDeliverable(axes: MissionAxes | undefined, evidence: AiUseEvidence): void {
  if (!axes) return;
  if (!isAiEvidenceComplete(evidence)) {
    throw new Error(
      "Antes de entregar, preencha o registro de uso da IA: ferramenta, pedido, " +
        "resposta, como verificou e o que decidiu.",
    );
  }
}

/**
 * A avaliação precisa casar com a Missão: com eixos → os dois eixos, a
 * habilidade e as competências da especificação e só critérios dela;
 * sem eixos → nenhuma avaliação por eixo.
 */
export function assertAxesReview(
  axes: MissionAxes | undefined,
  review: StudentWorkAxesReview | null | undefined,
): void {
  if (!axes) {
    if (review) throw new Error("Esta Missão não tem avaliação por eixo.");
    return;
  }
  if (!review) {
    throw new Error("Avalie os dois eixos: o objetivo da disciplina e a competência em IA.");
  }
  const levels = new Set(AXIS_LEVELS.map((l) => l.value));
  if (!levels.has(review.discipline.level) || !levels.has(review.ai.level)) {
    throw new Error("Escolha o nível observado em cada eixo.");
  }
  if (review.discipline.skillCode !== axes.discipline.skill.code) {
    throw new Error("A habilidade avaliada não é a da Missão.");
  }
  const expected = [...axes.ai.competencyIds].sort().join("|");
  if ([...review.ai.competencyIds].sort().join("|") !== expected) {
    throw new Error("As competências de IA avaliadas não são as da Missão.");
  }
  const unknownDiscipline = review.discipline.observedCriteria.filter(
    (c) => !axes.discipline.criteria.includes(c),
  );
  const unknownAi = review.ai.observedCriteria.filter((c) => !axes.ai.criteria.includes(c));
  if (unknownDiscipline.length > 0 || unknownAi.length > 0) {
    throw new Error("Critério fora da especificação da Missão.");
  }
  if (review.discipline.note.length > 2_000 || review.ai.note.length > 2_000) {
    throw new Error("O comentário de cada eixo tem no máximo 2.000 caracteres.");
  }
}
