/**
 * IPE — IAH Pedagogical Engine. SÓ CONTRATOS, nenhuma IA implementada
 * (decisão explícita da Sprint M07 — Mission Studio).
 *
 * O IPE atuará como COAUTOR pedagógico: sugere conteúdo campo a campo,
 * o professor decide. Invariantes que qualquer implementação futura
 * deve respeitar (mesmo princípio da Avaliação Assistida, D-024):
 *  - toda sugestão é rotulada como sugestão (`requiresTeacherReview: true`);
 *  - o IPE nunca grava numa missão — devolve sugestões, quem salva é o
 *    professor através do editor;
 *  - a proveniência (qual campo, qual justificativa) é sempre registrada.
 */

import type { StudioMission } from "./studio-mission";

/** Campos que o IPE poderá sugerir — exatamente os campos editáveis. */
export type IpeSuggestableField = keyof Pick<
  StudioMission,
  | "title"
  | "description"
  | "guidingQuestion"
  | "objectives"
  | "competencies"
  | "caseStudies"
  | "challenge"
  | "expectedProduction"
  | "reflectionPrompt"
  | "rubric"
  | "evaluationCriteria"
  | "supportMaterials"
  | "bibliography"
>;

export interface IpeFieldSuggestion {
  field: IpeSuggestableField;
  /** Conteúdo sugerido (string única ou lista, conforme o campo). */
  suggestion: string | string[];
  /** Por que o IPE sugere isso — proveniência pedagógica, sempre presente. */
  rationale: string;
  /** Invariante: nunca é aplicado sem decisão explícita do professor. */
  requiresTeacherReview: true;
}

export interface IpePedagogicalEngine {
  readonly isConfigured: boolean;
  /** Sugere conteúdo para um campo, dado o estado atual da missão. */
  suggestField(
    mission: StudioMission,
    field: IpeSuggestableField,
  ): Promise<IpeFieldSuggestion>;
  /** Revisão pedagógica completa: sugestões para os campos que precisam. */
  reviewMission(mission: StudioMission): Promise<IpeFieldSuggestion[]>;
}

/** Stub (padrão D-019): fixa o contrato; lança se chamado. */
export const ipeNotConfigured: IpePedagogicalEngine = {
  isConfigured: false,
  async suggestField() {
    throw new Error(
      "IPE ainda não está disponível — esta Sprint criou apenas os contratos (docs/MISSION_STUDIO.md).",
    );
  },
  async reviewMission() {
    throw new Error(
      "IPE ainda não está disponível — esta Sprint criou apenas os contratos (docs/MISSION_STUDIO.md).",
    );
  },
};
