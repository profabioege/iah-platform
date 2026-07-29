/**
 * Trilhas de aprendizagem — reorganização pedagógica para turmas mistas
 * (docs/product/iah-trilhas-implantacao-piloto.md).
 *
 * Contrato de domínio da Micro Missão 1: só a Trilha em si. Nenhuma
 * mudança em Classroom/Student, nenhuma variante de Missão, nenhum seed
 * de conteúdo pedagógico — isso fica para missões futuras.
 *
 * `suggestedSchoolRange` é sempre referência pedagógica, nunca uma regra
 * de acesso: nada nesta validação impede uma turma mista de 8º e 9º ano
 * de pertencer à mesma Trilha, e nada aqui lê `Classroom.grade` ou
 * `Student` para decidir se uma Trilha é válida.
 */

export const TRILHA_COMPLEXITY_LEVELS = [
  "foundational",
  "intermediate",
  "advanced",
] as const;
export type TrilhaComplexityLevel = (typeof TRILHA_COMPLEXITY_LEVELS)[number];

export const TRILHA_LANGUAGE_STYLES = [
  "concrete",
  "investigative",
  "conceptual",
] as const;
export type TrilhaLanguageStyle = (typeof TRILHA_LANGUAGE_STYLES)[number];

export const TRILHA_AUTONOMY_LEVELS = [
  "guided",
  "supported",
  "autonomous",
] as const;
export type TrilhaAutonomyLevel = (typeof TRILHA_AUTONOMY_LEVELS)[number];

export const TRILHA_STATUSES = ["draft", "active", "archived"] as const;
export type TrilhaStatus = (typeof TRILHA_STATUSES)[number];

/** Faixa escolar sugerida — só referência pedagógica (ex.: {from: "6º ano", to: "7º ano"}). */
export interface SchoolRange {
  from: string;
  to: string;
}

export interface TrilhaObjective {
  id: string;
  description: string;
}

export interface Trilha {
  id: string;
  institutionId: string;
  academicYearId: string;
  code: string;
  name: string;
  description: string;
  suggestedSchoolRange: SchoolRange;
  complexityLevel: TrilhaComplexityLevel;
  recommendedLanguage: TrilhaLanguageStyle;
  autonomyLevel: TrilhaAutonomyLevel;
  objectives: TrilhaObjective[];
  status: TrilhaStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrilhaInput {
  id: string;
  institutionId: string;
  academicYearId: string;
  code: string;
  name: string;
  description: string;
  suggestedSchoolRange: SchoolRange;
  complexityLevel: TrilhaComplexityLevel;
  recommendedLanguage: TrilhaLanguageStyle;
  autonomyLevel: TrilhaAutonomyLevel;
  objectives: TrilhaObjective[];
  status?: TrilhaStatus;
  version?: number;
}

const CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

/** Normaliza para minúsculas/trim — mesma forma que a constraint `code = lower(code)` da migration exige. */
export function normalizeTrilhaCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidTrilhaComplexityLevel(
  value: string,
): value is TrilhaComplexityLevel {
  return (TRILHA_COMPLEXITY_LEVELS as readonly string[]).includes(value);
}

export function isValidTrilhaLanguageStyle(
  value: string,
): value is TrilhaLanguageStyle {
  return (TRILHA_LANGUAGE_STYLES as readonly string[]).includes(value);
}

export function isValidTrilhaAutonomyLevel(
  value: string,
): value is TrilhaAutonomyLevel {
  return (TRILHA_AUTONOMY_LEVELS as readonly string[]).includes(value);
}

export function isValidTrilhaStatus(value: string): value is TrilhaStatus {
  return (TRILHA_STATUSES as readonly string[]).includes(value);
}

/**
 * Cria uma Trilha (estado inicial `draft`, salvo indicação contrária).
 * Lança erro com mensagem em português quando um parâmetro mínimo é
 * inválido — mesmo padrão de guarda usado em `assertRole`
 * (`modules/assessment/domain/authorization.ts`) e `createAsyncJob`
 * (`modules/jobs/domain/entities.ts`).
 */
export function createTrilha(input: CreateTrilhaInput, now: string): Trilha {
  if (!isNonEmptyString(input.institutionId)) {
    throw new Error("Trilha requer institutionId.");
  }
  if (!isNonEmptyString(input.academicYearId)) {
    throw new Error("Trilha requer academicYearId.");
  }
  if (!isNonEmptyString(input.name)) {
    throw new Error("Trilha requer name não vazio.");
  }
  if (!isNonEmptyString(input.description)) {
    throw new Error("Trilha requer description não vazia.");
  }

  const code = normalizeTrilhaCode(input.code);
  if (!isNonEmptyString(code) || !CODE_PATTERN.test(code)) {
    throw new Error(
      `code inválido: "${input.code}" — use minúsculas e hífen (ex.: "trilha-1").`,
    );
  }

  if (!isValidTrilhaComplexityLevel(input.complexityLevel)) {
    throw new Error(`complexityLevel inválido: "${input.complexityLevel}".`);
  }
  if (!isValidTrilhaLanguageStyle(input.recommendedLanguage)) {
    throw new Error(
      `recommendedLanguage inválido: "${input.recommendedLanguage}".`,
    );
  }
  if (!isValidTrilhaAutonomyLevel(input.autonomyLevel)) {
    throw new Error(`autonomyLevel inválido: "${input.autonomyLevel}".`);
  }

  const status = input.status ?? "draft";
  if (!isValidTrilhaStatus(status)) {
    throw new Error(`status inválido: "${status}".`);
  }

  const version = input.version ?? 1;
  if (version <= 0) {
    throw new Error("version deve ser maior que zero.");
  }

  return {
    id: input.id,
    institutionId: input.institutionId,
    academicYearId: input.academicYearId,
    code,
    name: input.name,
    description: input.description,
    suggestedSchoolRange: input.suggestedSchoolRange,
    complexityLevel: input.complexityLevel,
    recommendedLanguage: input.recommendedLanguage,
    autonomyLevel: input.autonomyLevel,
    objectives: input.objectives,
    status,
    version,
    createdAt: now,
    updatedAt: now,
  };
}

/** Um estado terminal (`archived`) nunca volta a `draft`/`active`. */
export function canTransitionTrilhaStatus(
  from: TrilhaStatus,
  to: TrilhaStatus,
): boolean {
  if (from === to) return true;
  return (
    (from === "draft" && to === "active") ||
    (from === "active" && to === "archived")
  );
}
