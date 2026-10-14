/**
 * Evidências do DIAGNÓSTICO POR ETAPAS (D-054) — função pura.
 *
 * Cada etapa é uma lista diagnóstica de uma habilidade. O acerto de cada
 * resposta foi calculado pelo banco na entrega (`attempt_answers.is_correct`);
 * aqui só se organiza o que já está gravado, distinguindo:
 *
 *  - questão INCORRETA (respondida e errada);
 *  - questão NÃO RESPONDIDA (em branco numa etapa entregue);
 *  - etapa PENDENTE (não iniciada ou em andamento) → diagnóstico INCOMPLETO.
 *
 * O resultado é EVIDÊNCIA INICIAL para orientar estudos — não é nota,
 * não é proficiência e não há TRI. Nenhuma habilidade recebe leitura com
 * menos de `minAnswered` respostas (uma única questão nunca basta).
 */

export const DIAGNOSTIC_RULES = {
  version: "diag-v1",
  /** Respostas (certas + erradas) mínimas para qualquer leitura da habilidade. */
  minAnswered: 3,
  /** Proporção de acertos a partir da qual há indícios favoráveis. */
  favorableFrom: 0.75,
  /** Abaixo disto, a habilidade vira prioridade de estudo. */
  priorityBelow: 0.4,
} as const;

export type BlockStatus = "nao_iniciada" | "em_andamento" | "entregue";

export type EvidenceLevel =
  | "pendente"
  | "evidencia_insuficiente"
  | "prioridade_de_estudo"
  | "em_desenvolvimento"
  | "indicios_favoraveis";

export const EVIDENCE_LABEL: Record<EvidenceLevel, string> = {
  pendente: "Etapa pendente",
  evidencia_insuficiente: "Evidência insuficiente",
  prioridade_de_estudo: "Prioridade de estudo",
  em_desenvolvimento: "Em desenvolvimento",
  indicios_favoraveis: "Indícios favoráveis",
};

export const BLOCK_STATUS_LABEL: Record<BlockStatus, string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento (progresso salvo)",
  entregue: "Entregue",
};

export interface DiagnosticBlockInput {
  blockId: string;
  position: number;
  listId: string;
  skillId: string;
  skillCode: string;
  /** Questões da etapa. */
  itemIds: string[];
  attempt: { status: "em_andamento" | "entregue"; submittedAt: string | null } | null;
  /** Respostas gravadas do aluno nesta etapa (acerto só depois da entrega). */
  answers: Array<{ listItemId: string; isCorrect: boolean | null }>;
}

export interface SkillEvidence {
  blockId: string;
  position: number;
  listId: string;
  skillId: string;
  skillCode: string;
  blockStatus: BlockStatus;
  submittedAt: string | null;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  /** Respostas salvas numa etapa ainda não entregue (ainda sem correção). */
  savedNotSubmitted: number;
  level: EvidenceLevel;
  /** Frase para o aluno: o que os dados sustentam, e só isso. */
  message: string;
}

export interface DiagnosticEvidence {
  ruleVersion: string;
  status: "nao_iniciado" | "incompleto" | "concluido";
  blocksTotal: number;
  blocksSubmitted: number;
  /** Próxima etapa a fazer (em andamento primeiro, depois a primeira não iniciada). */
  nextBlock: SkillEvidence | null;
  skills: SkillEvidence[];
}

function statusOf(block: DiagnosticBlockInput): BlockStatus {
  if (!block.attempt) return "nao_iniciada";
  return block.attempt.status === "entregue" ? "entregue" : "em_andamento";
}

export function evidenceFor(block: DiagnosticBlockInput): SkillEvidence {
  const blockStatus = statusOf(block);
  const total = block.itemIds.length;
  const items = new Set(block.itemIds);
  const answers = block.answers.filter((a) => items.has(a.listItemId));
  const base = {
    blockId: block.blockId,
    position: block.position,
    listId: block.listId,
    skillId: block.skillId,
    skillCode: block.skillCode,
    blockStatus,
    submittedAt: block.attempt?.submittedAt ?? null,
    total,
  };

  if (blockStatus !== "entregue") {
    return {
      ...base,
      correct: 0,
      incorrect: 0,
      unanswered: 0,
      savedNotSubmitted: answers.length,
      level: "pendente",
      message:
        blockStatus === "em_andamento"
          ? `Etapa em andamento: ${answers.length} de ${total} resposta(s) salva(s). Ainda não há evidência desta habilidade.`
          : "Etapa ainda não feita: ainda não há evidência desta habilidade.",
    };
  }

  const correct = answers.filter((a) => a.isCorrect === true).length;
  const incorrect = answers.filter((a) => a.isCorrect === false).length;
  const unanswered = total - correct - incorrect;
  const answered = correct + incorrect;
  const counts = { correct, incorrect, unanswered, savedNotSubmitted: 0 };

  if (answered < DIAGNOSTIC_RULES.minAnswered || unanswered > answered) {
    return {
      ...base,
      ...counts,
      level: "evidencia_insuficiente",
      message:
        `Você respondeu ${answered} de ${total} questão(ões)` +
        (unanswered > 0 ? ` (${unanswered} em branco)` : "") +
        `: evidência insuficiente para orientar o estudo desta habilidade. ` +
        `São necessárias pelo menos ${DIAGNOSTIC_RULES.minAnswered} respostas.`,
    };
  }

  const ratio = correct / answered;
  const level: EvidenceLevel =
    ratio >= DIAGNOSTIC_RULES.favorableFrom
      ? "indicios_favoraveis"
      : ratio < DIAGNOSTIC_RULES.priorityBelow
        ? "prioridade_de_estudo"
        : "em_desenvolvimento";
  const resumo = `Acertou ${correct} de ${answered} respondida(s)` + (unanswered > 0 ? `, ${unanswered} em branco` : "");
  const message =
    level === "indicios_favoraveis"
      ? `${resumo}. Indício inicial favorável — não é domínio confirmado; o professor e novas atividades confirmam.`
      : level === "prioridade_de_estudo"
        ? `${resumo}. Esta habilidade entra como prioridade no seu plano: rever a resolução antes de praticar de novo.`
        : `${resumo}. Em desenvolvimento: vale revisar as devolutivas das questões que errou.`;
  return { ...base, ...counts, level, message };
}

export function buildDiagnosticEvidence(blocks: DiagnosticBlockInput[]): DiagnosticEvidence {
  const skills = [...blocks].sort((a, b) => a.position - b.position).map(evidenceFor);
  const blocksSubmitted = skills.filter((s) => s.blockStatus === "entregue").length;
  const started = skills.some((s) => s.blockStatus !== "nao_iniciada");
  const nextBlock =
    skills.find((s) => s.blockStatus === "em_andamento") ??
    skills.find((s) => s.blockStatus === "nao_iniciada") ??
    null;
  return {
    ruleVersion: DIAGNOSTIC_RULES.version,
    status:
      skills.length > 0 && blocksSubmitted === skills.length
        ? "concluido"
        : started
          ? "incompleto"
          : "nao_iniciado",
    blocksTotal: skills.length,
    blocksSubmitted,
    nextBlock,
    skills,
  };
}
