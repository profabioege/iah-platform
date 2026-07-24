/**
 * Persistência do DocentIAH (D-047) — enxuta, reutilizando o padrão de
 * `modules/assessment`. `"slides"` (Apresentação de slides) e
 * `"laboratory_lesson"` (Conexões IAH → Aula de laboratório
 * correlacionada, `modules/conexoes-iah`) reaproveitam este mesmo
 * agregado; os demais cards do DocentIAH (Avaliação, Plano de aula,
 * Adaptar material) reaproveitam quando ganharem geração real.
 */

/**
 * "lesson_plan" | "infographic" | "mind_map" — novos tipos do
 * Planejador Conversacional (rascunho estruturado, MVP). O CHECK
 * constraint de `generated_materials` no banco real só permite
 * `'slides'` hoje — a migration que amplia isso
 * (`app/supabase/migrations/20260724001500_docentiah_planner_materials.sql`)
 * existe no repositório mas NÃO foi aplicada; salvar estes tipos contra
 * o banco real falha até essa migration ser executada por decisão
 * explícita (nunca automática). Contra o repositório seed/demo (padrão
 * sem Supabase configurado), funciona normalmente — é TypeScript puro.
 */
export type GeneratedMaterialType = "slides" | "laboratory_lesson" | "lesson_plan" | "infographic" | "mind_map";

/** "draft" — novo status do Planejador Conversacional; mesma ressalva de CHECK constraint da migration acima. */
export type GeneratedMaterialStatus = "generated" | "saved" | "draft";

export interface GeneratedMaterial {
  id: string;
  institutionId: string;
  teacherId: string;
  type: GeneratedMaterialType;
  title: string;
  subjectId: string | null;
  classroomId: string | null;
  status: GeneratedMaterialStatus;
  /** Entrada do formulário (`DocentiahSlidesGenerationInput`) — JSON, para reprodutibilidade. */
  inputData: unknown;
  /** Saída validada (`DocentiahSlidesGenerationOutput`) — JSON. */
  outputData: unknown;
  promptVersion: string;
  provider: string;
  model: string;
  webSearchUsed: boolean;
  pdfUsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type GenerationUsageStatus = "success" | "error";

export interface GenerationUsage {
  id: string;
  institutionId: string;
  userId: string;
  capability: string;
  provider: string;
  model: string;
  promptVersion: string;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCost: number | null;
  status: GenerationUsageStatus;
  createdAt: string;
}

export type AttachedContextType = "pdf";

export interface AttachedContext {
  id: string;
  materialId: string;
  type: AttachedContextType;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number;
  extractedCharacterCount: number;
  truncated: boolean;
  createdAt: string;
}
