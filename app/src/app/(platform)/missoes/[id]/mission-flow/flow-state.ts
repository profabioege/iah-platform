/**
 * Decisões de apresentação do Mission Flow derivadas do estado verdadeiro
 * do trabalho — funções puras, sem gravar nada.
 *
 * Regra central: "entregue" e "concluída" só aparecem quando a produção
 * está entregue E a reflexão está registrada. Produção reaberta com a
 * reflexão ainda registrada é trabalho em andamento, não entrega.
 */

import { hasReportContent, readHypotheses } from "./report-hypotheses";

export interface FlowWorkState {
  /** Produção entregue (`productionDeliveredAt`). */
  delivered: boolean;
  /** Reflexão registrada (`reflectionRecordedAt`). */
  recorded: boolean;
  /** Avaliação do professor registrada (`review`). */
  reviewed: boolean;
}

export type ResumeTarget =
  | { kind: "reflection" }
  | { kind: "delivery" }
  | { kind: "production" }
  | { kind: "investigation"; evidenceIndex: number }
  | { kind: "start" };

/**
 * Onde o aluno retoma a Missão. A Reflexão (com a devolutiva, se houver)
 * só abre quando o trabalho está de fato completo ou avaliado; produção
 * em rascunho volta sempre para a Produção — mesmo com a reflexão ainda
 * registrada de uma entrega anterior.
 */
export function resumeTarget(
  state: FlowWorkState,
  production: string,
  template: string | undefined,
  evidenceCount: number,
): ResumeTarget {
  if (state.reviewed || (state.delivered && state.recorded)) return { kind: "reflection" };
  if (state.delivered) return { kind: "delivery" };
  if (hasReportContent(production, template)) return { kind: "production" };
  if (template && production.trim().length > 0) {
    const firstEmpty = readHypotheses(production, evidenceCount).findIndex((h) => !h.trim());
    return firstEmpty === -1 ? { kind: "production" } : { kind: "investigation", evidenceIndex: firstEmpty + 1 };
  }
  // Produção vazia com reflexão registrada (reabertura sem texto) ainda é
  // trabalho começado: volta para a Produção, não para a capa.
  if (state.recorded) return { kind: "production" };
  return { kind: "start" };
}

/**
 * Cartão de conclusão da Reflexão: "avaliada" com devolutiva; "em
 * avaliação" só com produção entregue e reflexão registrada; nenhum
 * cartão nos demais casos.
 */
export function completionState(state: FlowWorkState): "reviewed" | "awaiting_review" | null {
  if (state.reviewed) return "reviewed";
  if (state.delivered && state.recorded) return "awaiting_review";
  return null;
}

/**
 * A reflexão registrada pode ser reaberta? Só antes da avaliação — a mesma
 * regra do servidor (`setReflectionRecorded` recusa com "Entrega já
 * avaliada"); a interface não oferece o que o servidor vai recusar.
 */
export function canReopenReflection(state: Pick<FlowWorkState, "recorded" | "reviewed">): boolean {
  return state.recorded && !state.reviewed;
}

/** Produção reaberta (rascunho) enquanto a reflexão continua registrada. */
export function isReopenedWithRecordedReflection(state: FlowWorkState): boolean {
  return state.recorded && !state.delivered && !state.reviewed;
}
