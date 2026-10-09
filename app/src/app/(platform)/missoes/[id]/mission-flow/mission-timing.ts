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

/**
 * Missão de dois eixos (D-053): uma etapa a mais, "Uso da IA", logo
 * depois da Produção (2 min). As etapas seguintes andam uma posição.
 */
const TWO_AXES_STEP_MINUTES: Record<number, number> = {
  ...STEP_MINUTES,
  7: 2, // Registro de uso da IA
  8: STEP_MINUTES[7], // Critérios
  9: STEP_MINUTES[8], // Entrega
  10: STEP_MINUTES[9], // Reflexão Final
};

function minutesFor(twoAxes: boolean): Record<number, number> {
  return twoAxes ? TWO_AXES_STEP_MINUTES : STEP_MINUTES;
}

export function totalSteps(twoAxes = false): number {
  return Object.keys(minutesFor(twoAxes)).length;
}

export function totalMissionMinutes(twoAxes = false): number {
  return Math.round(Object.values(minutesFor(twoAxes)).reduce((sum, minutes) => sum + minutes, 0));
}

export const TOTAL_MISSION_MINUTES = totalMissionMinutes(false);

export function minutesRemainingFrom(step: number, twoAxes = false): number {
  const table = minutesFor(twoAxes);
  let remaining = 0;
  for (let s = step; s <= totalSteps(twoAxes); s++) remaining += table[s] ?? 0;
  return Math.max(1, Math.round(remaining));
}
