/**
 * Circuito adaptativo — regras PURAS (D-051).
 *
 * O estado por habilidade é um INDICADOR calculado por regra explícita a
 * partir das respostas entregues — não é nota, não é TRI, não é
 * proficiência. Com 3 a 5 itens por habilidade, o que os dados sustentam
 * é "acertou 4 das últimas 5 em X"; a tela mostra isso junto do rótulo.
 *
 * As regras ficam aqui, em um só lugar, versionadas (`MASTERY_RULES`),
 * para o professor poder entender e explicar cada decisão.
 */

export type MasteryState = "sem_evidencia" | "em_desenvolvimento" | "consolidando" | "consolidado";

export const MASTERY_LABEL: Record<MasteryState, string> = {
  sem_evidencia: "Sem evidência",
  em_desenvolvimento: "Em desenvolvimento",
  consolidando: "Consolidando",
  consolidado: "Consolidado",
};

export const MASTERY_RULES = {
  versao: "v1",
  /** Quantas respostas mais recentes contam. */
  janela: 5,
  /** Consolidado: ao menos N respostas na janela, taxa mínima e a última certa. */
  consolidadoMinimo: 4,
  consolidadoTaxa: 0.8,
  /** Consolidando: taxa mínima na janela. */
  consolidandoTaxa: 0.6,
  /** Abaixo disso a evidência é marcada como insuficiente na tela. */
  evidenciaMinima: 3,
} as const;

export interface EvidenceItem {
  isCorrect: boolean;
  /** Momento da entrega da tentativa (ISO). */
  at: string;
}

export interface SkillMastery {
  state: MasteryState;
  /** Acertos e total DENTRO da janela. */
  correct: number;
  total: number;
  /** Total de respostas já entregues na habilidade. */
  answered: number;
  insufficient: boolean;
}

export function skillMastery(evidence: EvidenceItem[]): SkillMastery {
  const ordered = [...evidence].sort((a, b) => a.at.localeCompare(b.at));
  const window = ordered.slice(-MASTERY_RULES.janela);
  const correct = window.filter((e) => e.isCorrect).length;
  const total = window.length;
  const base = { correct, total, answered: ordered.length, insufficient: total < MASTERY_RULES.evidenciaMinima };
  if (total === 0) return { ...base, state: "sem_evidencia" };
  const rate = correct / total;
  const lastCorrect = window[window.length - 1].isCorrect;
  if (total >= MASTERY_RULES.consolidadoMinimo && rate >= MASTERY_RULES.consolidadoTaxa && lastCorrect) {
    return { ...base, state: "consolidado" };
  }
  if (rate >= MASTERY_RULES.consolidandoTaxa) return { ...base, state: "consolidando" };
  return { ...base, state: "em_desenvolvimento" };
}

export type RoundLevel = "apoio" | "regular" | "desafio";

/**
 * Nível da próxima rodada, pela ÚLTIMA rodada entregue na habilidade:
 * errou mais da metade → apoio (itens de rótulo editorial "fácil"
 * primeiro); acertou tudo → desafio ("difícil" primeiro); senão regular.
 * O nível só ordena a escolha — nunca libera questão não aprovada.
 */
export function nextRoundLevel(lastRound: { correct: number; total: number } | null): RoundLevel {
  if (!lastRound || lastRound.total === 0) return "regular";
  const rate = lastRound.correct / lastRound.total;
  if (rate < 0.5) return "apoio";
  if (rate === 1) return "desafio";
  return "regular";
}

export type StudentCircuitStatus = "sem_liberacao" | "praticando" | "pronto_para_avancar" | "concluiu_sequencia";

export interface StudentCircuitPosition {
  /** Habilidade em que o aluno pratica agora (a última liberada na sequência). */
  currentSkillId: string | null;
  /** Próxima da sequência, se houver. */
  nextSkillId: string | null;
  status: StudentCircuitStatus;
}

/**
 * Posição do aluno na sequência do planejamento. Híbrido: o sistema
 * nunca avança sozinho — "pronto para avançar" é um aviso ao professor.
 */
export function circuitPosition(
  sequence: string[],
  unlocked: Set<string>,
  mastery: Map<string, SkillMastery>,
): StudentCircuitPosition {
  let index = -1;
  sequence.forEach((skillId, i) => {
    if (unlocked.has(skillId)) index = i;
  });
  if (index < 0) return { currentSkillId: null, nextSkillId: sequence[0] ?? null, status: "sem_liberacao" };
  const currentSkillId = sequence[index];
  const nextSkillId = sequence[index + 1] ?? null;
  const consolidated = mastery.get(currentSkillId)?.state === "consolidado";
  if (!consolidated) return { currentSkillId, nextSkillId, status: "praticando" };
  return { currentSkillId, nextSkillId, status: nextSkillId ? "pronto_para_avancar" : "concluiu_sequencia" };
}

/** Uma resposta entregue, já com as habilidades a que ela serve de evidência. */
export interface AnsweredItem {
  studentId: string;
  isCorrect: boolean;
  at: string;
  skillIds: string[];
}

/**
 * Evidência por aluno e habilidade. Cada resposta conta para: a habilidade
 * ALVO da rodada (circuito) ou, em listas do professor, a habilidade
 * oficial da questão e as correspondências CONFIRMADAS. Sugestão não
 * revisada não vira evidência.
 */
export function groupEvidence(answers: AnsweredItem[]): Map<string, Map<string, EvidenceItem[]>> {
  const byStudent = new Map<string, Map<string, EvidenceItem[]>>();
  for (const a of answers) {
    const bySkill = byStudent.get(a.studentId) ?? new Map<string, EvidenceItem[]>();
    for (const skillId of new Set(a.skillIds)) {
      const list = bySkill.get(skillId) ?? [];
      list.push({ isCorrect: a.isCorrect, at: a.at });
      bySkill.set(skillId, list);
    }
    byStudent.set(a.studentId, bySkill);
  }
  return byStudent;
}
