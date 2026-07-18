/**
 * Entidade do Mission Studio — o MissionTemplate de docs/AUTHORING_MODEL.md
 * materializado como documento editável, estendido com os metadados
 * pedidos na Sprint M07 (ano escolar, disciplina, carga horária,
 * dificuldade, tempo estimado, descrição).
 *
 * NÃO substitui o `Mission` runtime (modules/library), que segue
 * servindo o aluno a partir de arquivos de conteúdo — a ponte
 * Estúdio → runtime é etapa futura (docs/MISSION_STUDIO.md).
 */

/** Ciclo de vida editorial (AUTHORING_MODEL.md). */
export type StudioMissionStatus = "draft" | "review" | "published" | "archived";

export type StudioMissionDifficulty =
  | "introdutorio"
  | "intermediario"
  | "avancado";

/** Referência de material/arquivo — nome + URL (upload real exige storage). */
export interface StudioResourceRef {
  label: string;
  url: string;
}

export interface StudioMission {
  /** Id desta versão específica (imutável). */
  id: string;
  /** Identidade da missão através das versões (linhagem). */
  lineageId: string;
  version: number;
  status: StudioMissionStatus;

  // Identificação
  title: string;
  description: string;
  schoolYear: string;
  subject: string;
  workloadHours: number | null;
  difficulty: StudioMissionDifficulty;
  estimatedMinutes: number | null;

  // Pedagogia
  guidingQuestion: string;
  objectives: string[];
  competencies: string[];

  // Investigação
  caseStudies: string[];
  challenge: string;
  expectedProduction: string;
  reflectionPrompt: string;

  // Avaliação
  rubric: string;
  evaluationCriteria: string[];

  // Materiais
  supportMaterials: string[];
  links: StudioResourceRef[];
  files: StudioResourceRef[];
  bibliography: string[];

  // Auditoria
  author: string;
  createdAt: string;
  /** Última revisão (qualquer salvamento atualiza). */
  updatedAt: string;
}

export const STATUS_LABEL: Record<StudioMissionStatus, string> = {
  draft: "Rascunho",
  review: "Em revisão",
  published: "Publicada",
  archived: "Arquivada",
};

export const DIFFICULTY_LABEL: Record<StudioMissionDifficulty, string> = {
  introdutorio: "Introdutório",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

/** Missão nova, em branco, rascunho v1. */
export function createEmptyStudioMission(author: string): StudioMission {
  const now = new Date().toISOString();
  const lineageId = crypto.randomUUID();
  return {
    id: crypto.randomUUID(),
    lineageId,
    version: 1,
    status: "draft",
    title: "",
    description: "",
    schoolYear: "",
    subject: "Inteligência Artificial & Humanidades",
    workloadHours: null,
    difficulty: "introdutorio",
    estimatedMinutes: null,
    guidingQuestion: "",
    objectives: [],
    competencies: [],
    caseStudies: [],
    challenge: "",
    expectedProduction: "",
    reflectionPrompt: "",
    rubric: "",
    evaluationCriteria: [],
    supportMaterials: [],
    links: [],
    files: [],
    bibliography: [],
    author,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Pré-condições mínimas de publicação (checklist de MISSION_TEMPLATE.md,
 * reduzido ao essencial verificável por máquina). Devolve a lista de
 * pendências; vazia = publicável.
 */
export function publishBlockers(mission: StudioMission): string[] {
  const blockers: string[] = [];
  if (!mission.title.trim()) blockers.push("Título é obrigatório.");
  if (!mission.guidingQuestion.trim())
    blockers.push("Pergunta norteadora é obrigatória.");
  if (!mission.challenge.trim()) blockers.push("Desafio é obrigatório.");
  if (!mission.expectedProduction.trim())
    blockers.push("Produção esperada é obrigatória.");
  return blockers;
}
