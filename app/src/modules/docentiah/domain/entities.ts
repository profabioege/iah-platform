/**
 * Persistência do DocentIAH (D-047) — enxuta, reutilizando o padrão de
 * `modules/assessment`. `type: "slides"` é o único material hoje
 * (Apresentação de slides); os outros três cards do DocentIAH
 * (Avaliação, Plano de aula, Adaptar material) reaproveitam o mesmo
 * agregado quando ganharem geração real.
 */

export type GeneratedMaterialType = "slides";

export type GeneratedMaterialStatus = "generated" | "saved";

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
