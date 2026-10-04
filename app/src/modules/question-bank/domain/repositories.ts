import type {
  AdaptiveCircuit,
  AdaptiveUnlock,
  AttemptAnswer,
  AttemptFeedback,
  ClassroomRef,
  ContentSource,
  CurriculumArea,
  CurriculumComponent,
  CurriculumPlanEntry,
  CurriculumSkill,
  GradeCode,
  ListAttempt,
  PracticeList,
  PracticeListItem,
  PracticeListKind,
  Question,
  QuestionKey,
  QuestionOption,
  QuestionReview,
  QuestionVersion,
  QuestionAssetMeta,
  ReviewChecklist,
  SkillSuggestion,
  SuggestionStatus,
  ContentFormat,
  SourceKind,
  StudentRef,
  EditorialDifficulty,
} from "./entities";

/**
 * Contrato de persistência do banco de questões. A implementação real
 * fala com o PostgREST no papel `iah_app` — quem decide o que o ator
 * alcança são as policies das migrations 0016/0017; este contrato só
 * descreve as operações. Nenhum método recebe papel ou permissão: isso
 * vem do token do ator, nunca do chamador.
 */
export interface QuestionBankRepositories {
  // ----- matriz curricular -----
  listAreas(): Promise<CurriculumArea[]>;
  listComponents(): Promise<CurriculumComponent[]>;
  listSkills(ids?: string[]): Promise<CurriculumSkill[]>;
  listPlan(filter: {
    academicYearId: string;
    gradeCode?: GradeCode | null;
    componentId?: string;
  }): Promise<CurriculumPlanEntry[]>;
  listClassrooms(): Promise<ClassroomRef[]>;
  listStudentsOfClassroom(classroomId: string): Promise<StudentRef[]>;

  // ----- fontes, questões, versões, revisão -----
  insertSource(input: {
    id: string;
    institutionId: string;
    kind: SourceKind;
    title: string;
    rightsHolder: string;
    license: string;
    licenseUrl: string | null;
    evidence: string | null;
    createdBy: string;
  }): Promise<void>;
  verifySource(id: string, verifiedBy: string, evidence: string | null): Promise<void>;
  listSources(ids?: string[]): Promise<ContentSource[]>;

  insertQuestion(question: Question): Promise<void>;
  insertVersion(input: {
    id: string;
    institutionId: string;
    questionId: string;
    version: number;
    stem: string;
    options: QuestionOption[];
    editorialDifficulty: EditorialDifficulty | null;
    sourceId: string;
    authorship: string;
    createdBy: string;
    contentFormat?: ContentFormat;
  }): Promise<void>;
  upsertKey(input: QuestionKey & { institutionId: string }): Promise<void>;
  /** Habilidade oficial (e componente, se a habilidade exigir) — só quem criou, só antes da 1ª aprovação. */
  updateQuestionSkill(questionId: string, skillId: string, componentId?: string): Promise<void>;
  /** Metadados das figuras (sem o conteúdo binário). */
  listAssets(versionIds: string[]): Promise<QuestionAssetMeta[]>;
  /** Conteúdo PNG de uma figura — sob a mesma RLS da versão. */
  getAssetContent(versionId: string, n: number): Promise<Uint8Array | null>;
  /** Grava figura em versão RASCUNHO do próprio autor (trigger/policy da 0018). */
  insertAsset(input: {
    institutionId: string;
    versionId: string;
    n: number;
    content: Uint8Array;
    width: number | null;
    height: number | null;
    altText: string | null;
  }): Promise<void>;
  listSuggestionsBySkill(skillId: string, statuses: SuggestionStatus[]): Promise<SkillSuggestion[]>;
  listSuggestionsByQuestions(questionIds: string[]): Promise<SkillSuggestion[]>;
  setSuggestionStatus(id: string, status: "confirmada" | "rejeitada", reviewedBy: string): Promise<void>;
  submitVersion(versionId: string): Promise<void>;
  insertReview(input: {
    id: string;
    institutionId: string;
    versionId: string;
    reviewerId: string;
    decision: "aprovada" | "devolvida";
    checklist: ReviewChecklist;
    comment: string | null;
  }): Promise<void>;
  listReviews(versionId: string): Promise<QuestionReview[]>;

  listQuestionsBySkill(skillId: string): Promise<Question[]>;
  listQuestionsByIds(ids: string[]): Promise<Question[]>;
  listVersions(filter: {
    ids?: string[];
    questionIds?: string[];
    status?: QuestionVersion["status"];
    statuses?: QuestionVersion["status"][];
    /** Só versões deste inquilino (exclui o catálogo legível pela escola). */
    institutionId?: string;
  }): Promise<QuestionVersion[]>;
  listKeys(versionIds: string[]): Promise<QuestionKey[]>;

  // ----- listas -----
  insertList(input: {
    id: string;
    institutionId: string;
    classroomId: string;
    componentId: string;
    kind: PracticeListKind;
    title: string;
    instructions: string;
    curriculumProvisional: boolean;
    createdBy: string;
    targetSkillId?: string | null;
  }): Promise<void>;
  insertListItems(items: Array<{
    id: string;
    institutionId: string;
    listId: string;
    position: number;
    questionVersionId: string;
  }>): Promise<void>;
  setListStatus(listId: string, status: "publicada" | "encerrada"): Promise<void>;
  getList(listId: string): Promise<PracticeList | null>;
  listLists(filter: { classroomIds?: string[]; status?: PracticeList["status"][] }): Promise<PracticeList[]>;
  listItems(listId: string): Promise<PracticeListItem[]>;
  listItemsForLists(listIds: string[]): Promise<PracticeListItem[]>;

  // ----- tentativas, respostas, devolutivas -----
  getAttempt(listId: string, studentId: string): Promise<ListAttempt | null>;
  listAttempts(listId: string): Promise<ListAttempt[]>;
  /** Tentativas ENTREGUES das listas (evidência do circuito). */
  listSubmittedAttempts(listIds: string[]): Promise<ListAttempt[]>;
  /** Cria a tentativa se ainda não existir (idempotente; unique no banco). */
  ensureAttempt(input: {
    id: string;
    institutionId: string;
    classroomId: string;
    listId: string;
    studentId: string;
  }): Promise<ListAttempt>;
  /** Grava ou troca a resposta do item (idempotente; unique no banco). */
  upsertAnswer(input: {
    id: string;
    institutionId: string;
    attemptId: string;
    listItemId: string;
    studentId: string;
    selectedKey: string;
  }): Promise<void>;
  submitAttempt(attemptId: string): Promise<ListAttempt>;
  listAnswers(attemptIds: string[]): Promise<AttemptAnswer[]>;
  upsertFeedback(input: {
    attemptId: string;
    institutionId: string;
    classroomId: string;
    studentId: string;
    teacherUserId: string;
    comment: string;
  }): Promise<void>;
  listFeedback(attemptIds: string[]): Promise<AttemptFeedback[]>;

  // ----- circuito adaptativo (0019) -----
  getCircuit(classroomId: string): Promise<AdaptiveCircuit | null>;
  insertCircuit(input: { id: string; institutionId: string; classroomId: string; roundSize: number; createdBy: string }): Promise<void>;
  setCircuitStatus(circuitId: string, status: AdaptiveCircuit["status"]): Promise<void>;
  listUnlocks(circuitId: string): Promise<AdaptiveUnlock[]>;
  insertUnlocks(rows: Array<{
    id: string;
    institutionId: string;
    circuitId: string;
    studentId: string;
    skillId: string;
    reason: AdaptiveUnlock["reason"];
    unlockedBy: string;
  }>): Promise<void>;
  /** Pede a rodada ao banco (`iah_circuit_next_round`): ele escolhe e confere. Devolve o id da lista. */
  nextCircuitRound(circuitId: string, skillId: string, level: "apoio" | "regular" | "desafio"): Promise<string>;
}
