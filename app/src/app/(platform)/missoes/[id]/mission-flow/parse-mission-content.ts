/**
 * Decompõe o Material Didático (`Mission.didacticMaterials`) em blocos
 * estruturados para o Mission Flow — sem mudar o schema de `Mission`
 * (docs/AUTHORING_MODEL.md já registrou esta mesma lacuna: Evidence e
 * EvaluationCriteria hoje são strings com prefixo, não entidades
 * próprias). Este parser é só um adaptador de apresentação, derivado do
 * padrão de escrita já usado no conteúdo (docs/MISSION_TEMPLATE.md).
 *
 * Convenção reconhecida (opcional — nenhuma Missão é obrigada a segui-la):
 *   "DOSSIÊ · Item N — "Manchete" (Fonte). Corpo…"            → Evidence
 *   "GUIA DE INVESTIGAÇÃO · Rótulo — Descrição"                → GuideEntry
 *   "CRITÉRIOS DE AUDITORIA · Rótulo: Descrição"                → GuideEntry
 * Qualquer item que não bata em nenhum padrão vira material de apoio comum.
 */

export interface ParsedEvidence {
  number: number;
  headline: string;
  source: string;
  body: string;
}

export interface ParsedGuideEntry {
  label: string;
  description: string;
}

export interface ParsedMissionContent {
  supportMaterials: string[];
  evidences: ParsedEvidence[];
  investigationGuide: ParsedGuideEntry[];
  auditCriteria: ParsedGuideEntry[];
}

const EVIDENCE_RE = /^DOSSIÊ · Item (\d+) — "([^"]+)"\s*\(([^)]+)\)\.\s*([\s\S]*)$/;
const GUIDE_RE = /^GUIA DE INVESTIGAÇÃO · ([^—]+) — ([\s\S]*)$/;
const CRITERIA_RE = /^CRITÉRIOS DE AUDITORIA · ([^:]+): ([\s\S]*)$/;

export function parseMissionContent(
  didacticMaterials: string[],
): ParsedMissionContent {
  const supportMaterials: string[] = [];
  const evidences: ParsedEvidence[] = [];
  const investigationGuide: ParsedGuideEntry[] = [];
  const auditCriteria: ParsedGuideEntry[] = [];

  for (const item of didacticMaterials) {
    const evidenceMatch = item.match(EVIDENCE_RE);
    if (evidenceMatch) {
      evidences.push({
        number: Number(evidenceMatch[1]),
        headline: evidenceMatch[2],
        source: evidenceMatch[3],
        body: evidenceMatch[4].trim(),
      });
      continue;
    }
    const guideMatch = item.match(GUIDE_RE);
    if (guideMatch) {
      investigationGuide.push({
        label: guideMatch[1].trim(),
        description: guideMatch[2].trim(),
      });
      continue;
    }
    const criteriaMatch = item.match(CRITERIA_RE);
    if (criteriaMatch) {
      auditCriteria.push({
        label: criteriaMatch[1].trim(),
        description: criteriaMatch[2].trim(),
      });
      continue;
    }
    supportMaterials.push(item);
  }

  evidences.sort((a, b) => a.number - b.number);

  return { supportMaterials, evidences, investigationGuide, auditCriteria };
}

/** Quebra um texto corrido em no máximo `max` parágrafos curtos (chunking). */
export function chunkIntoParagraphs(text: string, max = 2): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= max) return [text];

  const perParagraph = Math.ceil(sentences.length / max);
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += perParagraph) {
    paragraphs.push(sentences.slice(i, i + perParagraph).join(" "));
  }
  return paragraphs.slice(0, max);
}

/**
 * Quebra um texto de reflexão em perguntas individuais (reconhece o
 * "?" de fechamento) — usado na Reflexão Final para apresentar uma
 * pergunta metacognitiva por vez, em vez de um parágrafo único.
 */
export function splitQuestions(text: string): string[] {
  return text.split(/(?<=\?)\s+/).filter(Boolean);
}
