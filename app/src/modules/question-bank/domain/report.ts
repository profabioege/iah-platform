import type {
  AttemptAnswer,
  CurriculumSkill,
  PracticeListItem,
  QuestionKey,
  QuestionOption,
  QuestionVersion,
} from "./entities";

/**
 * Devolutiva automática de uma tentativa ENTREGUE: por item (resposta,
 * gabarito, resolução) e por habilidade (acertos/total). Função pura —
 * o acerto vem do banco (`attempt_answers.is_correct`, calculado na
 * entrega); aqui só se organiza o que já foi decidido lá.
 *
 * Não há nota, conceito nem estimativa de proficiência: numa lista
 * diagnóstica curta, "acertou 2 de 3 na habilidade X" é o que os dados
 * sustentam.
 */

export interface ItemReport {
  itemId: string;
  position: number;
  skillId: string;
  stem: string;
  options: QuestionOption[];
  selectedKey: string | null;
  isCorrect: boolean | null;
  answerKey: string | null;
  resolution: string | null;
}

export interface SkillReport {
  skillId: string;
  skillCode: string;
  correct: number;
  total: number;
}

export interface AttemptReport {
  items: ItemReport[];
  bySkill: SkillReport[];
  correct: number;
  total: number;
  unanswered: number;
}

export function buildAttemptReport(input: {
  items: PracticeListItem[];
  versions: QuestionVersion[];
  keys: QuestionKey[];
  answers: AttemptAnswer[];
  skills: CurriculumSkill[];
}): AttemptReport {
  const versions = new Map(input.versions.map((v) => [v.id, v]));
  const keys = new Map(input.keys.map((k) => [k.versionId, k]));
  const answers = new Map(input.answers.map((a) => [a.listItemId, a]));
  const skills = new Map(input.skills.map((s) => [s.id, s]));

  const items = [...input.items]
    .sort((a, b) => a.position - b.position)
    .map((item): ItemReport => {
      const version = versions.get(item.questionVersionId);
      const key = keys.get(item.questionVersionId);
      const answer = answers.get(item.id);
      return {
        itemId: item.id,
        position: item.position,
        skillId: item.skillId,
        stem: version?.stem ?? "",
        options: version?.options ?? [],
        selectedKey: answer?.selectedKey ?? null,
        isCorrect: answer?.isCorrect ?? null,
        answerKey: key?.answerKey ?? null,
        resolution: key?.resolution ?? null,
      };
    });

  const bySkillMap = new Map<string, SkillReport>();
  for (const item of items) {
    const entry = bySkillMap.get(item.skillId) ?? {
      skillId: item.skillId,
      skillCode: skills.get(item.skillId)?.code ?? item.skillId,
      correct: 0,
      total: 0,
    };
    entry.total += 1;
    if (item.isCorrect === true) entry.correct += 1;
    bySkillMap.set(item.skillId, entry);
  }

  return {
    items,
    bySkill: [...bySkillMap.values()].sort((a, b) => a.skillCode.localeCompare(b.skillCode)),
    correct: items.filter((i) => i.isCorrect === true).length,
    total: items.length,
    unanswered: items.filter((i) => i.selectedKey === null).length,
  };
}

/**
 * Conferência das alternativas ANTES de enviar ao banco (o banco
 * confere de novo — isto só dá uma mensagem melhor).
 */
export function validateOptions(options: QuestionOption[], answerKey: string): string | null {
  if (options.length < 2 || options.length > 5) return "Use de 2 a 5 alternativas.";
  const keys = options.map((o) => o.key.trim());
  if (keys.some((k) => !k)) return "Toda alternativa precisa de uma letra.";
  if (options.some((o) => !o.text.trim())) return "Toda alternativa precisa de texto.";
  if (new Set(keys).size !== keys.length) return "Letras de alternativa repetidas.";
  if (!keys.includes(answerKey.trim())) return "O gabarito precisa ser uma das alternativas.";
  return null;
}
