import type { SupabaseClient } from "@supabase/supabase-js";

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
  Question,
  QuestionKey,
  QuestionReview,
  QuestionVersion,
  QuestionAssetMeta,
  SkillSuggestion,
} from "../domain/entities";
import type { QuestionBankRepositories } from "../domain/repositories";

/**
 * Implementação PostgREST do banco de questões. Recebe o cliente JÁ
 * escopado (papel `iah_app`, claims do ator — `scoped-client.ts`); as
 * policies das migrations 0016/0017 aplicam escola, papel, turma e dono.
 * Aqui não há filtro de segurança "por precaução": o que a policy
 * esconde simplesmente não volta.
 */

type Row = Record<string, unknown>;

function fail(operation: string, error: { message: string; code?: string } | null): void {
  if (error) {
    const wrapped = new Error(`${operation}: ${error.message}`) as Error & { code?: string };
    wrapped.code = error.code;
    throw wrapped;
  }
}

const str = (v: unknown) => (v == null ? null : String(v));

const toArea = (r: Row): CurriculumArea => ({ id: String(r.id), code: String(r.code), name: String(r.name) });

const toComponent = (r: Row): CurriculumComponent => ({
  id: String(r.id),
  institutionId: str(r.institution_id),
  areaId: String(r.area_id),
  name: String(r.name),
});

const toSkill = (r: Row): CurriculumSkill => ({
  id: String(r.id),
  institutionId: str(r.institution_id),
  framework: r.framework as CurriculumSkill["framework"],
  areaId: String(r.area_id),
  componentId: str(r.component_id),
  code: String(r.code),
  description: String(r.description),
  sourceReference: String(r.source_reference),
});

const toPlan = (r: Row): CurriculumPlanEntry => ({
  id: String(r.id),
  institutionId: String(r.institution_id),
  academicYearId: String(r.academic_year_id),
  gradeCode: r.grade_code as GradeCode,
  periodOrder: Number(r.period_order),
  periodLabel: String(r.period_label),
  componentId: String(r.component_id),
  skillId: String(r.skill_id),
  status: r.status as CurriculumPlanEntry["status"],
});

const toSource = (r: Row): ContentSource => ({
  id: String(r.id),
  institutionId: String(r.institution_id),
  kind: r.kind as ContentSource["kind"],
  title: String(r.title),
  rightsHolder: String(r.rights_holder),
  license: String(r.license),
  rightsStatus: r.rights_status as ContentSource["rightsStatus"],
});

const toQuestion = (r: Row): Question => ({
  id: String(r.id),
  institutionId: String(r.institution_id),
  componentId: String(r.component_id),
  skillId: String(r.skill_id),
  createdBy: String(r.created_by),
  externalRef: (r.external_ref as Record<string, unknown> | null) ?? null,
});

const toSuggestion = (r: Row): SkillSuggestion => ({
  id: String(r.id),
  questionId: String(r.question_id),
  skillId: String(r.skill_id),
  origin: r.origin as SkillSuggestion["origin"],
  confidence: r.confidence as SkillSuggestion["confidence"],
  rationale: String(r.rationale),
  status: r.status as SkillSuggestion["status"],
});

/** bytea via PostgREST chega como texto hexadecimal "\\x89504e47…". */
function decodeBytea(value: unknown): Uint8Array | null {
  if (typeof value !== "string") return null;
  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  if (!/^[0-9a-f]*$/i.test(hex) || hex.length % 2) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const QUESTION_COLS = "id, institution_id, component_id, skill_id, created_by, external_ref";

const toVersion = (r: Row): QuestionVersion => ({
  id: String(r.id),
  institutionId: String(r.institution_id),
  questionId: String(r.question_id),
  version: Number(r.version),
  stem: String(r.stem),
  options: (r.options as QuestionVersion["options"]) ?? [],
  editorialDifficulty: (r.editorial_difficulty as QuestionVersion["editorialDifficulty"]) ?? null,
  sourceId: String(r.source_id),
  authorship: String(r.authorship),
  status: r.status as QuestionVersion["status"],
  createdBy: String(r.created_by),
  decidedBy: str(r.decided_by),
  decidedAt: str(r.decided_at),
  contentFormat: (r.content_format as QuestionVersion["contentFormat"]) ?? "texto",
});

const toKey = (r: Row): QuestionKey => ({
  versionId: String(r.version_id),
  answerKey: String(r.answer_key),
  resolution: String(r.resolution),
});

const toReview = (r: Row): QuestionReview => ({
  id: String(r.id),
  versionId: String(r.version_id),
  reviewerId: String(r.reviewer_id),
  decision: r.decision as QuestionReview["decision"],
  checklist: r.checklist as QuestionReview["checklist"],
  comment: str(r.comment),
  createdAt: String(r.created_at),
});

const toList = (r: Row): PracticeList => ({
  id: String(r.id),
  institutionId: String(r.institution_id),
  classroomId: String(r.classroom_id),
  componentId: String(r.component_id),
  kind: r.kind as PracticeList["kind"],
  title: String(r.title),
  instructions: String(r.instructions ?? ""),
  status: r.status as PracticeList["status"],
  curriculumProvisional: Boolean(r.curriculum_provisional),
  createdBy: String(r.created_by),
  publishedAt: str(r.published_at),
  targetStudentId: str(r.target_student_id),
  targetSkillId: str(r.target_skill_id),
  createdAt: String(r.created_at ?? ""),
});

const LIST_COLS =
  "id, institution_id, classroom_id, component_id, kind, title, instructions, status, curriculum_provisional, created_by, published_at, target_student_id, target_skill_id, created_at";

const toCircuit = (r: Row): AdaptiveCircuit => ({
  id: String(r.id),
  institutionId: String(r.institution_id),
  classroomId: String(r.classroom_id),
  roundSize: Number(r.round_size),
  status: r.status as AdaptiveCircuit["status"],
  createdBy: String(r.created_by),
});

const toUnlock = (r: Row): AdaptiveUnlock => ({
  id: String(r.id),
  circuitId: String(r.circuit_id),
  studentId: String(r.student_id),
  skillId: String(r.skill_id),
  reason: r.reason as AdaptiveUnlock["reason"],
  unlockedBy: String(r.unlocked_by),
  unlockedAt: String(r.unlocked_at),
});

const toItem = (r: Row): PracticeListItem => ({
  id: String(r.id),
  listId: String(r.list_id),
  position: Number(r.position),
  questionVersionId: String(r.question_version_id),
  skillId: String(r.skill_id),
});

const toAttempt = (r: Row): ListAttempt => ({
  id: String(r.id),
  institutionId: String(r.institution_id),
  classroomId: String(r.classroom_id),
  listId: String(r.list_id),
  studentId: String(r.student_id),
  status: r.status as ListAttempt["status"],
  startedAt: String(r.started_at),
  submittedAt: str(r.submitted_at),
  scoreCorrect: r.score_correct == null ? null : Number(r.score_correct),
  scoreTotal: r.score_total == null ? null : Number(r.score_total),
});

const toAnswer = (r: Row): AttemptAnswer => ({
  id: String(r.id),
  attemptId: String(r.attempt_id),
  listItemId: String(r.list_item_id),
  studentId: String(r.student_id),
  selectedKey: String(r.selected_key),
  isCorrect: r.is_correct == null ? null : Boolean(r.is_correct),
});

const toFeedback = (r: Row): AttemptFeedback => ({
  attemptId: String(r.attempt_id),
  studentId: String(r.student_id),
  teacherUserId: String(r.teacher_user_id),
  comment: String(r.comment),
  updatedAt: String(r.updated_at),
});

export function createDatabaseQuestionBankRepositories(
  db: SupabaseClient,
): QuestionBankRepositories {
  const repositories: QuestionBankRepositories = {
    async listAreas() {
      const { data, error } = await db.from("curriculum_areas").select("id, code, name").order("id");
      fail("curriculum_areas", error);
      return (data ?? []).map(toArea);
    },

    async listComponents() {
      const { data, error } = await db
        .from("curriculum_components")
        .select("id, institution_id, area_id, name")
        .eq("status", "active")
        .order("name");
      fail("curriculum_components", error);
      return (data ?? []).map(toComponent);
    },

    async listSkills(ids) {
      let query = db
        .from("curriculum_skills")
        .select("id, institution_id, framework, area_id, component_id, code, description, source_reference")
        .eq("status", "active");
      if (ids) {
        if (ids.length === 0) return [];
        query = query.in("id", ids);
      }
      const { data, error } = await query.order("code");
      fail("curriculum_skills", error);
      return (data ?? []).map(toSkill);
    },

    async listPlan({ academicYearId, gradeCode, componentId }) {
      let query = db
        .from("school_curriculum_plans")
        .select("id, institution_id, academic_year_id, grade_code, period_order, period_label, component_id, skill_id, status")
        .eq("academic_year_id", academicYearId)
        .neq("status", "retired");
      if (gradeCode) query = query.eq("grade_code", gradeCode);
      if (componentId) query = query.eq("component_id", componentId);
      const { data, error } = await query.order("period_order");
      fail("school_curriculum_plans", error);
      return (data ?? []).map(toPlan);
    },

    async listClassrooms() {
      const { data, error } = await db
        .from("classrooms")
        .select("id, name, grade_code, academic_year_id")
        .order("name");
      fail("classrooms", error);
      return (data ?? []).map((r: Row) => ({
        id: String(r.id),
        name: String(r.name),
        gradeCode: (r.grade_code as GradeCode | null) ?? null,
        academicYearId: String(r.academic_year_id),
      })) satisfies ClassroomRef[];
    },

    async listStudentsOfClassroom(classroomId) {
      const { data, error } = await db
        .from("enrollments")
        .select("student_id, students(id, name)")
        .eq("classroom_id", classroomId)
        .eq("status", "active");
      fail("enrollments", error);
      return (data ?? [])
        .map((r: Row) => {
          const s = r.students as Row | null;
          return s ? { id: String(s.id), name: String(s.name) } : null;
        })
        .filter((s): s is { id: string; name: string } => s !== null)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    },

    async insertSource(input) {
      const { error } = await db.from("content_sources").insert({
        id: input.id,
        institution_id: input.institutionId,
        kind: input.kind,
        title: input.title,
        rights_holder: input.rightsHolder,
        license: input.license,
        license_url: input.licenseUrl,
        evidence: input.evidence,
        created_by: input.createdBy,
      });
      fail("content_sources.insert", error);
    },

    async verifySource(id, verifiedBy, evidence) {
      const patch: Row = {
        rights_status: "verificado",
        rights_verified_by: verifiedBy,
        rights_verified_at: new Date().toISOString(),
      };
      if (evidence !== null) patch.evidence = evidence;
      const { data, error } = await db.from("content_sources").update(patch).eq("id", id).select("id");
      fail("content_sources.verify", error);
      if (!data?.length) throw new Error("Fonte não encontrada ou fora do seu alcance.");
    },

    async listSources(ids) {
      let query = db
        .from("content_sources")
        .select("id, institution_id, kind, title, rights_holder, license, rights_status");
      if (ids) {
        if (ids.length === 0) return [];
        query = query.in("id", ids);
      }
      const { data, error } = await query;
      fail("content_sources", error);
      return (data ?? []).map(toSource);
    },

    async insertQuestion(q) {
      const { error } = await db.from("questions").insert({
        id: q.id,
        institution_id: q.institutionId,
        component_id: q.componentId,
        skill_id: q.skillId,
        created_by: q.createdBy,
      });
      fail("questions.insert", error);
    },

    async insertVersion(v) {
      const { error } = await db.from("question_versions").insert({
        id: v.id,
        institution_id: v.institutionId,
        question_id: v.questionId,
        version: v.version,
        stem: v.stem,
        options: v.options,
        editorial_difficulty: v.editorialDifficulty,
        source_id: v.sourceId,
        authorship: v.authorship,
        created_by: v.createdBy,
        content_format: v.contentFormat ?? "texto",
      });
      fail("question_versions.insert", error);
    },

    async upsertKey(k) {
      const { error } = await db.from("question_version_keys").upsert(
        {
          version_id: k.versionId,
          institution_id: k.institutionId,
          answer_key: k.answerKey,
          resolution: k.resolution,
        },
        { onConflict: "version_id" },
      );
      fail("question_version_keys.upsert", error);
    },

    async listAssets(versionIds) {
      if (versionIds.length === 0) return [];
      const { data, error } = await db
        .from("question_assets")
        .select("version_id, n, width, height, alt_text")
        .in("version_id", versionIds)
        .order("n");
      fail("question_assets", error);
      return (data ?? []).map((r: Row) => ({
        versionId: String(r.version_id),
        n: Number(r.n),
        width: r.width == null ? null : Number(r.width),
        height: r.height == null ? null : Number(r.height),
        altText: str(r.alt_text),
      })) satisfies QuestionAssetMeta[];
    },

    async getAssetContent(versionId, n) {
      const { data, error } = await db
        .from("question_assets")
        .select("content")
        .eq("version_id", versionId)
        .eq("n", n)
        .maybeSingle();
      fail("question_assets.content", error);
      return data ? decodeBytea((data as Row).content) : null;
    },

    async listSuggestionsBySkill(skillId, statuses) {
      const { data, error } = await db
        .from("question_skill_suggestions")
        .select("id, question_id, skill_id, origin, confidence, rationale, status")
        .eq("skill_id", skillId)
        .in("status", statuses);
      fail("question_skill_suggestions", error);
      return (data ?? []).map(toSuggestion);
    },

    async listSuggestionsByQuestions(questionIds) {
      if (questionIds.length === 0) return [];
      const { data, error } = await db
        .from("question_skill_suggestions")
        .select("id, question_id, skill_id, origin, confidence, rationale, status")
        .in("question_id", questionIds);
      fail("question_skill_suggestions", error);
      return (data ?? []).map(toSuggestion);
    },

    async setSuggestionStatus(id, status, reviewedBy) {
      const { data, error } = await db
        .from("question_skill_suggestions")
        .update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
        .eq("id", id)
        .select("id");
      fail("question_skill_suggestions.status", error);
      if (!data?.length) throw new Error("Sugestão não encontrada ou fora do seu alcance.");
    },

    async submitVersion(versionId) {
      const { data, error } = await db
        .from("question_versions")
        .update({ status: "em_revisao" })
        .eq("id", versionId)
        .select("id");
      fail("question_versions.submit", error);
      if (!data?.length) throw new Error("Rascunho não encontrado ou fora do seu alcance.");
    },

    async insertReview(r) {
      const { error } = await db.from("question_reviews").insert({
        id: r.id,
        institution_id: r.institutionId,
        version_id: r.versionId,
        reviewer_id: r.reviewerId,
        decision: r.decision,
        checklist: r.checklist,
        comment: r.comment,
      });
      fail("question_reviews.insert", error);
    },

    async listReviews(versionId) {
      const { data, error } = await db
        .from("question_reviews")
        .select("id, version_id, reviewer_id, decision, checklist, comment, created_at")
        .eq("version_id", versionId)
        .order("created_at");
      fail("question_reviews", error);
      return (data ?? []).map(toReview);
    },

    async listQuestionsBySkill(skillId) {
      const { data, error } = await db
        .from("questions")
        .select(QUESTION_COLS)
        .eq("skill_id", skillId)
        .is("retired_at", null);
      fail("questions", error);
      return (data ?? []).map(toQuestion);
    },

    async listQuestionsByIds(ids) {
      if (ids.length === 0) return [];
      const { data, error } = await db
        .from("questions")
        .select(QUESTION_COLS)
        .in("id", ids);
      fail("questions", error);
      return (data ?? []).map(toQuestion);
    },

    async listVersions({ ids, questionIds, status }) {
      let query = db
        .from("question_versions")
        .select("id, institution_id, question_id, version, stem, options, editorial_difficulty, source_id, authorship, status, created_by, decided_by, decided_at, content_format");
      if (ids) {
        if (ids.length === 0) return [];
        query = query.in("id", ids);
      }
      if (questionIds) {
        if (questionIds.length === 0) return [];
        query = query.in("question_id", questionIds);
      }
      if (status) query = query.eq("status", status);
      const { data, error } = await query.order("version");
      fail("question_versions", error);
      return (data ?? []).map(toVersion);
    },

    async listKeys(versionIds) {
      if (versionIds.length === 0) return [];
      const { data, error } = await db
        .from("question_version_keys")
        .select("version_id, answer_key, resolution")
        .in("version_id", versionIds);
      fail("question_version_keys", error);
      return (data ?? []).map(toKey);
    },

    async insertList(l) {
      const { error } = await db.from("practice_lists").insert({
        id: l.id,
        institution_id: l.institutionId,
        classroom_id: l.classroomId,
        component_id: l.componentId,
        kind: l.kind,
        title: l.title,
        instructions: l.instructions,
        curriculum_provisional: l.curriculumProvisional,
        created_by: l.createdBy,
        target_skill_id: l.targetSkillId ?? null,
      });
      fail("practice_lists.insert", error);
    },

    async insertListItems(items) {
      if (items.length === 0) return;
      const { error } = await db.from("practice_list_items").insert(
        items.map((i) => ({
          id: i.id,
          institution_id: i.institutionId,
          list_id: i.listId,
          position: i.position,
          question_version_id: i.questionVersionId,
          // skill_id NÃO é enviado: o banco copia a habilidade da questão
          // (trigger da migration 0017) — o cliente não escolhe.
        })),
      );
      fail("practice_list_items.insert", error);
    },

    async setListStatus(listId, status) {
      const { data, error } = await db
        .from("practice_lists")
        .update({ status })
        .eq("id", listId)
        .select("id");
      fail("practice_lists.status", error);
      if (!data?.length) throw new Error("Lista não encontrada ou fora do seu alcance.");
    },

    async getList(listId) {
      const { data, error } = await db
        .from("practice_lists")
        .select(LIST_COLS)
        .eq("id", listId)
        .maybeSingle();
      fail("practice_lists", error);
      return data ? toList(data) : null;
    },

    async listLists({ classroomIds, status }) {
      let query = db
        .from("practice_lists")
        .select(LIST_COLS);
      if (classroomIds) {
        if (classroomIds.length === 0) return [];
        query = query.in("classroom_id", classroomIds);
      }
      if (status) query = query.in("status", status);
      const { data, error } = await query.order("created_at", { ascending: false });
      fail("practice_lists", error);
      return (data ?? []).map(toList);
    },

    async listItemsForLists(listIds) {
      if (listIds.length === 0) return [];
      const { data, error } = await db
        .from("practice_list_items")
        .select("id, list_id, position, question_version_id, skill_id")
        .in("list_id", listIds);
      fail("practice_list_items", error);
      return (data ?? []).map(toItem);
    },

    async listItems(listId) {
      const { data, error } = await db
        .from("practice_list_items")
        .select("id, list_id, position, question_version_id, skill_id")
        .eq("list_id", listId)
        .order("position");
      fail("practice_list_items", error);
      return (data ?? []).map(toItem);
    },

    async getAttempt(listId, studentId) {
      const { data, error } = await db
        .from("list_attempts")
        .select("id, institution_id, classroom_id, list_id, student_id, status, started_at, submitted_at, score_correct, score_total")
        .eq("list_id", listId)
        .eq("student_id", studentId)
        .maybeSingle();
      fail("list_attempts", error);
      return data ? toAttempt(data) : null;
    },

    async listAttempts(listId) {
      const { data, error } = await db
        .from("list_attempts")
        .select("id, institution_id, classroom_id, list_id, student_id, status, started_at, submitted_at, score_correct, score_total")
        .eq("list_id", listId);
      fail("list_attempts", error);
      return (data ?? []).map(toAttempt);
    },

    async listSubmittedAttempts(listIds) {
      if (listIds.length === 0) return [];
      const { data, error } = await db
        .from("list_attempts")
        .select("id, institution_id, classroom_id, list_id, student_id, status, started_at, submitted_at, score_correct, score_total")
        .in("list_id", listIds)
        .eq("status", "entregue");
      fail("list_attempts", error);
      return (data ?? []).map(toAttempt);
    },

    async ensureAttempt(a) {
      const { error } = await db.from("list_attempts").upsert(
        {
          id: a.id,
          institution_id: a.institutionId,
          classroom_id: a.classroomId,
          list_id: a.listId,
          student_id: a.studentId,
        },
        // Árbitro = id determinístico (`attemptIdFor`): cliques simultâneos
        // geram o MESMO id, então a corrida cai aqui e vira "não faz nada".
        // Arbitrar por (list_id, student_id) deixava a colisão estourar na
        // chave primária (achado do teste de concorrência). A unicidade
        // aluno × lista continua garantida pela constraint do banco.
        { onConflict: "id", ignoreDuplicates: true },
      );
      fail("list_attempts.ensure", error);
      const attempt = await repositories.getAttempt(a.listId, a.studentId);
      if (!attempt) throw new Error("Tentativa não pôde ser aberta.");
      return attempt;
    },

    async upsertAnswer(a) {
      const { error } = await db.from("attempt_answers").upsert(
        {
          id: a.id,
          institution_id: a.institutionId,
          attempt_id: a.attemptId,
          list_item_id: a.listItemId,
          student_id: a.studentId,
          selected_key: a.selectedKey,
        },
        { onConflict: "id" },
      );
      fail("attempt_answers.upsert", error);
    },

    async submitAttempt(attemptId) {
      const { data, error } = await db
        .from("list_attempts")
        .update({ status: "entregue" })
        .eq("id", attemptId)
        .select("id, institution_id, classroom_id, list_id, student_id, status, started_at, submitted_at, score_correct, score_total");
      fail("list_attempts.submit", error);
      if (!data?.length) throw new Error("Tentativa não encontrada ou fora do seu alcance.");
      return toAttempt(data[0]);
    },

    async listAnswers(attemptIds) {
      if (attemptIds.length === 0) return [];
      const { data, error } = await db
        .from("attempt_answers")
        .select("id, attempt_id, list_item_id, student_id, selected_key, is_correct")
        .in("attempt_id", attemptIds);
      fail("attempt_answers", error);
      return (data ?? []).map(toAnswer);
    },

    async upsertFeedback(f) {
      const { error } = await db.from("attempt_feedback").upsert(
        {
          attempt_id: f.attemptId,
          institution_id: f.institutionId,
          classroom_id: f.classroomId,
          student_id: f.studentId,
          teacher_user_id: f.teacherUserId,
          comment: f.comment,
        },
        { onConflict: "attempt_id" },
      );
      fail("attempt_feedback.upsert", error);
    },

    async listFeedback(attemptIds) {
      if (attemptIds.length === 0) return [];
      const { data, error } = await db
        .from("attempt_feedback")
        .select("attempt_id, student_id, teacher_user_id, comment, updated_at")
        .in("attempt_id", attemptIds);
      fail("attempt_feedback", error);
      return (data ?? []).map(toFeedback);
    },

    async getCircuit(classroomId) {
      const { data, error } = await db
        .from("adaptive_circuits")
        .select("id, institution_id, classroom_id, round_size, status, created_by")
        .eq("classroom_id", classroomId)
        .maybeSingle();
      fail("adaptive_circuits", error);
      return data ? toCircuit(data) : null;
    },

    async insertCircuit(c) {
      const { error } = await db.from("adaptive_circuits").insert({
        id: c.id,
        institution_id: c.institutionId,
        classroom_id: c.classroomId,
        round_size: c.roundSize,
        created_by: c.createdBy,
      });
      fail("adaptive_circuits.insert", error);
    },

    async setCircuitStatus(circuitId, status) {
      const { data, error } = await db
        .from("adaptive_circuits")
        .update({ status })
        .eq("id", circuitId)
        .select("id");
      fail("adaptive_circuits.status", error);
      if (!data?.length) throw new Error("Circuito não encontrado ou fora do seu alcance.");
    },

    async listUnlocks(circuitId) {
      const { data, error } = await db
        .from("adaptive_unlocks")
        .select("id, circuit_id, student_id, skill_id, reason, unlocked_by, unlocked_at")
        .eq("circuit_id", circuitId);
      fail("adaptive_unlocks", error);
      return (data ?? []).map(toUnlock);
    },

    async insertUnlocks(rows) {
      if (rows.length === 0) return;
      // Liberar de novo a mesma habilidade não cria segunda linha (unique no banco).
      const { error } = await db.from("adaptive_unlocks").upsert(
        rows.map((r) => ({
          id: r.id,
          institution_id: r.institutionId,
          circuit_id: r.circuitId,
          student_id: r.studentId,
          skill_id: r.skillId,
          reason: r.reason,
          unlocked_by: r.unlockedBy,
        })),
        { onConflict: "circuit_id,student_id,skill_id", ignoreDuplicates: true },
      );
      fail("adaptive_unlocks.insert", error);
    },

    async nextCircuitRound(circuitId, skillId, level) {
      const { data, error } = await db.rpc("iah_circuit_next_round", {
        p_circuit: circuitId,
        p_skill: skillId,
        p_level: level,
      });
      if (error) throw new Error(error.message);
      return String(data);
    },
  };
  return repositories;
}
