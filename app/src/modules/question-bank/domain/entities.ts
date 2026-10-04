/**
 * Banco de questões e matriz curricular do Ensino Médio — entidades
 * (reformulação, incremento 1; migrations 0016/0017, D-049).
 *
 * O vocabulário segue o banco. Duas regras de apresentação valem para
 * toda tela que use estes tipos:
 *  - `editorialDifficulty` é um RÓTULO EDITORIAL de quem escreveu e
 *    revisou a questão. Não é parâmetro da TRI e não deve ser mostrado
 *    como "dificuldade TRI", "proficiência" ou similar;
 *  - planejamento com `status: "provisional"` precisa ser identificado
 *    como recorte provisório até a escola validar o próprio currículo.
 */

export type GradeCode = "em1" | "em2" | "em3";

export const GRADE_LABEL: Record<GradeCode, string> = {
  em1: "1ª série",
  em2: "2ª série",
  em3: "3ª série",
};

export interface CurriculumArea {
  id: string;
  code: string;
  name: string;
}

export interface CurriculumComponent {
  id: string;
  /** `null` = referência comum a todas as escolas. */
  institutionId: string | null;
  areaId: string;
  name: string;
}

export interface CurriculumSkill {
  id: string;
  /** `null` = referência comum (BNCC ou Matriz do Enem). */
  institutionId: string | null;
  framework: "bncc" | "enem_matriz" | "escola";
  areaId: string;
  componentId: string | null;
  code: string;
  description: string;
  sourceReference: string;
}

export type CurriculumPlanStatus = "provisional" | "approved" | "retired";

export interface CurriculumPlanEntry {
  id: string;
  institutionId: string;
  academicYearId: string;
  gradeCode: GradeCode;
  periodOrder: number;
  periodLabel: string;
  componentId: string;
  skillId: string;
  status: CurriculumPlanStatus;
}

export type SourceKind =
  | "autoral_escola"
  | "autoral_iah"
  | "licenciado"
  | "dominio_publico"
  | "licenca_aberta";

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  autoral_escola: "Autoral da escola",
  autoral_iah: "Autoral IAH",
  licenciado: "Licenciado (contrato)",
  dominio_publico: "Domínio público",
  licenca_aberta: "Licença aberta",
};

export type RightsStatus = "pendente" | "verificado" | "recusado";

export interface ContentSource {
  id: string;
  institutionId: string;
  kind: SourceKind;
  title: string;
  rightsHolder: string;
  license: string;
  rightsStatus: RightsStatus;
  evidence?: string | null;
}

export type EditorialDifficulty = "facil" | "media" | "dificil";

/** Rótulo para tela — deliberadamente sem a palavra "TRI". */
export const EDITORIAL_DIFFICULTY_LABEL: Record<EditorialDifficulty, string> = {
  facil: "Fácil (rótulo editorial)",
  media: "Média (rótulo editorial)",
  dificil: "Difícil (rótulo editorial)",
};

export type QuestionVersionStatus =
  | "rascunho"
  | "em_revisao"
  | "aprovada"
  | "devolvida"
  | "substituida";

export interface QuestionOption {
  key: string;
  text: string;
}

export interface Question {
  id: string;
  institutionId: string;
  componentId: string;
  skillId: string;
  createdBy: string;
  /** Procedência externa (ex.: Enem: ano, dia, caderno, posição, parâmetros TRI oficiais). */
  externalRef?: Record<string, unknown> | null;
}

/** Texto puro ou marcação mínima (sub/sup/em/strong/small + {{figura:N}}). */
export type ContentFormat = "texto" | "marcacao_v1" | "marcacao_v2";

export interface QuestionAssetMeta {
  versionId: string;
  n: number;
  width: number | null;
  height: number | null;
  altText: string | null;
}

export type SuggestionStatus = "sugerida" | "confirmada" | "rejeitada";

/** Correspondência proposta (IA ou equipe) entre questão e habilidade — não é a habilidade oficial. */
export interface SkillSuggestion {
  id: string;
  questionId: string;
  skillId: string;
  origin: "ia" | "equipe";
  confidence: "alta" | "media" | "baixa";
  rationale: string;
  status: SuggestionStatus;
}

export interface QuestionVersion {
  id: string;
  institutionId: string;
  questionId: string;
  version: number;
  stem: string;
  options: QuestionOption[];
  editorialDifficulty: EditorialDifficulty | null;
  sourceId: string;
  authorship: string;
  status: QuestionVersionStatus;
  createdBy: string;
  decidedBy: string | null;
  decidedAt: string | null;
  contentFormat: ContentFormat;
}

/** Gabarito e resolução — o aluno só recebe depois de entregar. */
export interface QuestionKey {
  versionId: string;
  answerKey: string;
  /** Pode faltar em rascunho importado; a aprovação exige. */
  resolution: string | null;
  /** Devolutiva por alternativa (letra → texto), liberada ao aluno com o gabarito. */
  optionFeedback?: Record<string, string> | null;
}

export interface ReviewChecklist {
  gabarito: boolean;
  habilidade: boolean;
  direitos: boolean;
  linguagem: boolean;
}

export interface QuestionReview {
  id: string;
  versionId: string;
  reviewerId: string;
  decision: "aprovada" | "devolvida";
  checklist: ReviewChecklist;
  comment: string | null;
  createdAt: string;
}

export type PracticeListKind = "diagnostica" | "periodica" | "revisao" | "circuito";
export type PracticeListStatus = "rascunho" | "publicada" | "encerrada";

export const PRACTICE_LIST_KIND_LABEL: Record<PracticeListKind, string> = {
  diagnostica: "Diagnóstica",
  periodica: "Periódica",
  revisao: "Revisão",
  circuito: "Circuito adaptativo",
};

export const PRACTICE_LIST_STATUS_LABEL: Record<PracticeListStatus, string> = {
  rascunho: "Rascunho",
  publicada: "Publicada",
  encerrada: "Encerrada",
};

export interface PracticeList {
  id: string;
  institutionId: string;
  classroomId: string;
  componentId: string;
  kind: PracticeListKind;
  title: string;
  instructions: string;
  status: PracticeListStatus;
  curriculumProvisional: boolean;
  createdBy: string;
  publishedAt: string | null;
  /** Rodada do circuito: o único aluno que a alcança. */
  targetStudentId: string | null;
  /** Habilidade-alvo (rodada do circuito ou escolhida pelo professor). */
  targetSkillId: string | null;
  createdAt: string;
}

/** Circuito adaptativo da turma (D-051). */
export interface AdaptiveCircuit {
  id: string;
  institutionId: string;
  classroomId: string;
  roundSize: number;
  status: "ativo" | "pausado";
  createdBy: string;
}

/** Habilidade liberada pelo professor para um aluno no circuito. */
export interface AdaptiveUnlock {
  id: string;
  circuitId: string;
  studentId: string;
  skillId: string;
  reason: "inicio" | "avanco";
  unlockedBy: string;
  unlockedAt: string;
}

export interface PracticeListItem {
  id: string;
  listId: string;
  position: number;
  questionVersionId: string;
  skillId: string;
}

export interface ListAttempt {
  id: string;
  institutionId: string;
  classroomId: string;
  listId: string;
  studentId: string;
  status: "em_andamento" | "entregue";
  startedAt: string;
  submittedAt: string | null;
  scoreCorrect: number | null;
  scoreTotal: number | null;
}

export interface AttemptAnswer {
  id: string;
  attemptId: string;
  listItemId: string;
  studentId: string;
  selectedKey: string;
  /** Calculado pelo banco na entrega; `null` antes. */
  isCorrect: boolean | null;
}

export interface AttemptFeedback {
  attemptId: string;
  studentId: string;
  teacherUserId: string;
  comment: string;
  updatedAt: string;
}

/** Turma como o banco de questões precisa dela. */
export interface ClassroomRef {
  id: string;
  name: string;
  gradeCode: GradeCode | null;
  academicYearId: string;
}

export interface StudentRef {
  id: string;
  name: string;
}
