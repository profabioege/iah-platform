/**
 * Estimativa de tempo por etapa do Mission Flow — heurística fixa por
 * volume de conteúdo de cada etapa (mesma escala usada em
 * docs/ROTEIRO-DEMONSTRACAO.md para o Dossiê), não uma medição
 * validada. Serve só como sinalização de progresso para o aluno
 * durante o percurso — nunca como promessa de tempo (ver risco
 * registrado em docs/STATUS.md sobre a meta de demonstração).
 */
const STEP_MINUTES: Record<number, number> = {
  1: 0, // Capa — decisão de começar, não leitura
  2: 1, // Contexto
  3: 0.5, // Objetivo
  4: 4, // Investigação — guia + 4 evidências, núcleo da missão
  5: 1, // Comparação
  6: 2.5, // Produção
  7: 1, // Critérios
  8: 0.5, // Entrega
  9: 1.5, // Reflexão Final
};

const TOTAL_STEPS = Object.keys(STEP_MINUTES).length;

export const TOTAL_MISSION_MINUTES = Math.round(
  Object.values(STEP_MINUTES).reduce((sum, minutes) => sum + minutes, 0),
);

export function minutesRemainingFrom(step: number): number {
  let remaining = 0;
  for (let s = step; s <= TOTAL_STEPS; s++) remaining += STEP_MINUTES[s] ?? 0;
  return Math.max(1, Math.round(remaining));
}
