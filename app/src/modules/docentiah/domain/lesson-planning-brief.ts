/**
 * DocentIAH — Planejador Conversacional (achado desta rodada: substitui
 * o ponto de entrada em grade por um chat guiado). `LessonPlanningBrief`
 * é o estado estruturado que o chat preenche progressivamente — o
 * histórico de mensagens nunca é a única fonte de verdade, sempre este
 * objeto (ver `docs/AI_PROVIDER_GATEWAY.md` para a capability
 * `docentiah.build_lesson_brief`, hoje só transporte mockado).
 */

import type { EducationLevel } from "../../conexoes-iah/domain/entities.ts";

export type LessonPlanningStatus =
  | "collecting_context"
  | "awaiting_confirmation"
  | "curriculum_review"
  | "material_selection"
  | "generating"
  | "ready_for_review"
  | "saved"
  | "cancelled";

export type SupportMaterialType = "lesson_plan" | "slides" | "infographic" | "mind_map";

export const CLASS_PROFILE_TAGS = [
  { id: "participativa", label: "Participativa" },
  { id: "dispersa", label: "Dispersa" },
  { id: "heterogenea", label: "Heterogênea" },
  { id: "dificuldade_leitura", label: "Dificuldade de leitura" },
  { id: "dificuldade_interpretacao", label: "Dificuldade de interpretação" },
  { id: "precisa_mais_exemplos", label: "Precisa de mais exemplos" },
  { id: "alunos_neurodivergentes", label: "Possui alunos neurodivergentes" },
  { id: "aula_laboratorio", label: "Aula em laboratório" },
] as const;
export type ClassProfileTagId = (typeof CLASS_PROFILE_TAGS)[number]["id"];

/**
 * Nunca contém `code` inventado — só quando uma fonte curricular real
 * (`modules/curriculum`) tiver uma correspondência. `document`/`version`
 * descrevem a fonte real consultada, nunca uma referência presumida à BNCC.
 */
export interface CurriculumSkillSuggestion {
  id: string;
  code: string | null;
  description: string;
  document: string;
  version: string | null;
  matchReason: string;
  confidence: number;
}

export interface IahConnectionSuggestion {
  id: string;
  title: string;
  rationale: string;
  confidence: number;
  custom: boolean;
}

export interface LessonPlanningBrief {
  institutionId: string;
  teacherId: string;
  classroomId?: string;
  subject?: string;
  educationLevel?: EducationLevel;
  grade?: string;
  topic?: string;
  specificConcept?: string;
  lessonDurationMinutes?: number;
  teacherGoal?: string;
  classProfile: string[];
  selectedCurriculumSkills: CurriculumSkillSuggestion[];
  iahConnection?: IahConnectionSuggestion;
  methodology?: string;
  supportMaterialType?: SupportMaterialType;
  visualTheme?: string;
  additionalContext?: string;
  sourceReferences: string[];
  confidence: number;
  status: LessonPlanningStatus;
}

export function createEmptyLessonPlanningBrief(institutionId: string, teacherId: string): LessonPlanningBrief {
  return {
    institutionId,
    teacherId,
    classProfile: [],
    selectedCurriculumSkills: [],
    sourceReferences: [],
    confidence: 0,
    status: "collecting_context",
  };
}

/** Campos mínimos para sair de "collecting_context" — o resto é sempre opcional. */
export function requiredFieldsMissing(brief: LessonPlanningBrief): Array<"subject" | "gradeInfo" | "topic"> {
  const missing: Array<"subject" | "gradeInfo" | "topic"> = [];
  if (!brief.subject) missing.push("subject");
  if (!brief.educationLevel || !brief.grade) missing.push("gradeInfo");
  if (!brief.topic) missing.push("topic");
  return missing;
}
