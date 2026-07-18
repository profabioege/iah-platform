/**
 * Intelligent Lesson Composer — regras simples de sugestão (Sprint M13),
 * SEM IA: correspondência de palavras-chave e pontuação por sobreposição
 * de texto. Cada função é pura e isolada de propósito — é o ponto de
 * extensão natural para uma futura implementação por IA (mesmo
 * princípio do IPE, D-026: hoje regra determinística, amanhã um serviço
 * que devolve o mesmo formato de sugestão, sempre revisável pelo
 * Professor antes de salvar).
 */

import type { Mission } from "@/modules/library";
import type { KnowledgeDocument } from "@/modules/knowledge";

import type { Lesson, LessonFormat } from "./lesson";

/**
 * Palavras-chave por formato — a Investigação é o padrão (Método IAH
 * nasce do "Auditor da Realidade"), os demais formatos precisam de um
 * sinal explícito no Tema/Objetivo para serem sugeridos.
 */
const FORMAT_KEYWORDS: Partial<Record<LessonFormat, string[]>> = {
  debate: ["debate", "debater", "argumenta", "posicionamento", "polêmica", "polemica"],
  estudo_de_caso: ["estudo de caso", "caso real", "análise de caso", "analise de caso"],
  oficina: ["oficina", "mão na massa", "mao na massa", "prática guiada", "pratica guiada"],
  projeto: ["projeto", "construir", "prototipar", "desenvolver"],
  laboratorio: ["laboratório", "laboratorio", "experimento", "simulação", "simulacao"],
  producao: ["produzir", "redigir", "criar conteúdo", "criar conteudo"],
};

/** Etapa 3 — "Como meus alunos irão aprender?": sugere o formato pela combinação de Tema + Objetivo. */
export function suggestLessonFormat(
  lesson: Pick<Lesson, "topic" | "objective">,
): LessonFormat {
  const haystack = `${lesson.topic} ${lesson.objective}`.toLowerCase();
  for (const [format, keywords] of Object.entries(FORMAT_KEYWORDS) as [
    LessonFormat,
    string[],
  ][]) {
    if (keywords.some((keyword) => haystack.includes(keyword))) return format;
  }
  return "investigacao";
}

function overlapScore(haystack: string, needle: string): number {
  const words = needle
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3);
  if (words.length === 0) return 0;
  const lowerHaystack = haystack.toLowerCase();
  return words.filter((word) => lowerHaystack.includes(word)).length;
}

/**
 * Etapa 4 — "Com quais recursos?": ordena os materiais do Knowledge
 * Engine (`modules/knowledge`) por relevância ao Tema/Competências da
 * Lesson. Não descarta nenhum documento — só ordena, o Professor
 * decide o que entra (a busca real, `KnowledgeDocumentRepository.search()`,
 * segue disponível para quando o catálogo crescer além do que cabe
 * numa lista única).
 */
export function rankKnowledgeDocuments(
  lesson: Pick<Lesson, "topic" | "bnccCompetencies" | "bnccComputacaoCompetencies">,
  documents: KnowledgeDocument[],
): KnowledgeDocument[] {
  const signal = [lesson.topic, ...lesson.bnccCompetencies, ...lesson.bnccComputacaoCompetencies]
    .filter(Boolean)
    .join(" ");
  if (!signal.trim()) return documents;

  return [...documents].sort((a, b) => {
    const haystackA = [a.title, a.summary ?? "", ...a.keywords].join(" ");
    const haystackB = [b.title, b.summary ?? "", ...b.keywords].join(" ");
    return overlapScore(haystackB, signal) - overlapScore(haystackA, signal);
  });
}

/**
 * Etapa 5 — "Como será a missão?": sugere a Mission Flow (`modules/library`)
 * cujo título/pergunta norteadora/módulo melhor combina com o Tema e o
 * Eixo do Planejamento Anual da Lesson. `null` quando nenhuma Missão
 * existe ainda — a etapa oferece criar uma nova no Estúdio.
 */
export function suggestMission(
  lesson: Pick<Lesson, "topic" | "objective" | "planningAxis">,
  missions: Mission[],
): Mission | null {
  if (missions.length === 0) return null;
  if (missions.length === 1) return missions[0];

  const signal = [lesson.topic, lesson.objective, lesson.planningAxis]
    .filter(Boolean)
    .join(" ");
  if (!signal.trim()) return missions[0];

  let best = missions[0];
  let bestScore = -1;
  for (const mission of missions) {
    const haystack = [mission.title, mission.guidingQuestion, mission.module].join(" ");
    const score = overlapScore(haystack, signal);
    if (score > bestScore) {
      best = mission;
      bestScore = score;
    }
  }
  return best;
}
