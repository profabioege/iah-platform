import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Diagnostic,
  DiagnosticBlock,
  StudyPlan,
  StudyPlanEvent,
  StudyPlanItem,
  StudyRepositories,
} from "../domain/entities";

/**
 * Implementação PostgREST do diagnóstico e do plano semanal (0022).
 * Recebe o cliente JÁ escopado (papel `iah_app`); escola, turma, dono e
 * orçamento de minutos são impostos pelas policies e triggers.
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

const DIAG_COLS =
  "id, institution_id, classroom_id, title, grade_code, status, demonstrative, curriculum_provisional, created_by, created_at, published_at";
const toDiagnostic = (r: Row): Diagnostic => ({
  id: String(r.id),
  institutionId: String(r.institution_id),
  classroomId: String(r.classroom_id),
  title: String(r.title),
  gradeCode: (r.grade_code as Diagnostic["gradeCode"]) ?? null,
  status: r.status as Diagnostic["status"],
  demonstrative: Boolean(r.demonstrative),
  curriculumProvisional: Boolean(r.curriculum_provisional),
  createdBy: String(r.created_by),
  createdAt: String(r.created_at ?? ""),
  publishedAt: str(r.published_at),
});

const BLOCK_COLS = "id, institution_id, diagnostic_id, position, list_id, skill_id";
const toBlock = (r: Row): DiagnosticBlock => ({
  id: String(r.id),
  institutionId: String(r.institution_id),
  diagnosticId: String(r.diagnostic_id),
  position: Number(r.position),
  listId: String(r.list_id),
  skillId: String(r.skill_id),
});

const PLAN_COLS =
  "id, institution_id, classroom_id, student_id, week_start, available_days, minutes_per_day, rule_version, created_by, created_at, updated_at";
const toPlan = (r: Row): StudyPlan => ({
  id: String(r.id),
  institutionId: String(r.institution_id),
  classroomId: String(r.classroom_id),
  studentId: String(r.student_id),
  weekStart: String(r.week_start),
  availableDays: ((r.available_days as number[]) ?? []).map(Number),
  minutesPerDay: Number(r.minutes_per_day),
  ruleVersion: String(r.rule_version),
  createdBy: String(r.created_by),
  createdAt: String(r.created_at ?? ""),
  updatedAt: String(r.updated_at ?? ""),
});

const ITEM_COLS =
  "id, institution_id, plan_id, student_id, classroom_id, day, kind, ref_id, skill_id, title, minutes, reason, rule, origin, status, created_by, updated_at";
const toItem = (r: Row): StudyPlanItem => ({
  id: String(r.id),
  institutionId: String(r.institution_id),
  planId: String(r.plan_id),
  studentId: String(r.student_id),
  classroomId: String(r.classroom_id),
  day: String(r.day),
  kind: r.kind as StudyPlanItem["kind"],
  refId: str(r.ref_id),
  skillId: str(r.skill_id),
  title: String(r.title),
  minutes: Number(r.minutes),
  reason: String(r.reason),
  rule: String(r.rule ?? ""),
  origin: r.origin as StudyPlanItem["origin"],
  status: r.status as StudyPlanItem["status"],
  createdBy: String(r.created_by),
  updatedAt: String(r.updated_at ?? ""),
});

const EVENT_COLS =
  "id, institution_id, plan_id, item_id, student_id, classroom_id, action, from_day, to_day, note, actor_user_id, actor_role, created_at";
const toEvent = (r: Row): StudyPlanEvent => ({
  id: String(r.id),
  institutionId: String(r.institution_id),
  planId: String(r.plan_id),
  itemId: str(r.item_id),
  studentId: String(r.student_id),
  classroomId: String(r.classroom_id),
  action: r.action as StudyPlanEvent["action"],
  fromDay: str(r.from_day),
  toDay: str(r.to_day),
  note: String(r.note ?? ""),
  actorUserId: String(r.actor_user_id),
  actorRole: r.actor_role as StudyPlanEvent["actorRole"],
  createdAt: String(r.created_at ?? ""),
});

export function createDatabaseStudyRepositories(db: SupabaseClient): StudyRepositories {
  return {
    async listDiagnostics(classroomIds, status) {
      if (classroomIds.length === 0) return [];
      let query = db.from("diagnostics").select(DIAG_COLS).in("classroom_id", classroomIds);
      if (status) query = query.in("status", status);
      const { data, error } = await query.order("created_at", { ascending: false });
      fail("diagnostics", error);
      return (data ?? []).map(toDiagnostic);
    },

    async getDiagnostic(id) {
      const { data, error } = await db.from("diagnostics").select(DIAG_COLS).eq("id", id).maybeSingle();
      fail("diagnostics", error);
      return data ? toDiagnostic(data) : null;
    },

    async insertDiagnostic(input) {
      const { error } = await db.from("diagnostics").insert({
        id: input.id,
        institution_id: input.institutionId,
        classroom_id: input.classroomId,
        title: input.title,
        grade_code: input.gradeCode,
        created_by: input.createdBy,
      });
      fail("diagnostics.insert", error);
    },

    async setDiagnosticStatus(id, status) {
      const { data, error } = await db.from("diagnostics").update({ status }).eq("id", id).select(DIAG_COLS);
      fail("diagnostics.status", error);
      if (!data?.length) throw new Error("Diagnóstico não encontrado ou fora do seu alcance.");
      return toDiagnostic(data[0]);
    },

    async listBlocks(diagnosticIds) {
      if (diagnosticIds.length === 0) return [];
      const { data, error } = await db
        .from("diagnostic_blocks")
        .select(BLOCK_COLS)
        .in("diagnostic_id", diagnosticIds)
        .order("position");
      fail("diagnostic_blocks", error);
      return (data ?? []).map(toBlock);
    },

    async insertBlocks(blocks) {
      if (blocks.length === 0) return;
      const { error } = await db.from("diagnostic_blocks").insert(
        blocks.map((b) => ({
          id: b.id,
          institution_id: b.institutionId,
          diagnostic_id: b.diagnosticId,
          position: b.position,
          list_id: b.listId,
          skill_id: b.skillId,
        })),
      );
      fail("diagnostic_blocks.insert", error);
    },

    async getBlockByList(listId) {
      const { data, error } = await db.from("diagnostic_blocks").select(BLOCK_COLS).eq("list_id", listId).maybeSingle();
      fail("diagnostic_blocks", error);
      return data ? toBlock(data) : null;
    },

    async getPlan(studentId, classroomId, weekStart) {
      const { data, error } = await db
        .from("study_plans")
        .select(PLAN_COLS)
        .eq("student_id", studentId)
        .eq("classroom_id", classroomId)
        .eq("week_start", weekStart)
        .maybeSingle();
      fail("study_plans", error);
      return data ? toPlan(data) : null;
    },

    async getPlanById(planId) {
      const { data, error } = await db.from("study_plans").select(PLAN_COLS).eq("id", planId).maybeSingle();
      fail("study_plans", error);
      return data ? toPlan(data) : null;
    },

    async listPlans(classroomId, weekStart) {
      const { data, error } = await db
        .from("study_plans")
        .select(PLAN_COLS)
        .eq("classroom_id", classroomId)
        .eq("week_start", weekStart);
      fail("study_plans", error);
      return (data ?? []).map(toPlan);
    },

    async insertPlan(plan) {
      const { data, error } = await db
        .from("study_plans")
        .insert({
          id: plan.id,
          institution_id: plan.institutionId,
          classroom_id: plan.classroomId,
          student_id: plan.studentId,
          week_start: plan.weekStart,
          available_days: plan.availableDays,
          minutes_per_day: plan.minutesPerDay,
          rule_version: plan.ruleVersion,
          created_by: plan.createdBy,
        })
        .select(PLAN_COLS);
      fail("study_plans.insert", error);
      return toPlan(data![0]);
    },

    async updatePlanAvailability(planId, availableDays, minutesPerDay, ruleVersion) {
      const { data, error } = await db
        .from("study_plans")
        .update({ available_days: availableDays, minutes_per_day: minutesPerDay, rule_version: ruleVersion })
        .eq("id", planId)
        .select(PLAN_COLS);
      fail("study_plans.update", error);
      if (!data?.length) throw new Error("Plano não encontrado ou fora do seu alcance.");
      return toPlan(data[0]);
    },

    async listPlanItems(planIds) {
      if (planIds.length === 0) return [];
      const { data, error } = await db
        .from("study_plan_items")
        .select(ITEM_COLS)
        .in("plan_id", planIds)
        .order("day")
        .order("created_at");
      fail("study_plan_items", error);
      return (data ?? []).map(toItem);
    },

    async getPlanItem(id) {
      const { data, error } = await db.from("study_plan_items").select(ITEM_COLS).eq("id", id).maybeSingle();
      fail("study_plan_items", error);
      return data ? toItem(data) : null;
    },

    async insertPlanItems(items) {
      if (items.length === 0) return;
      // Uma por vez: a conferência de minutos do dia (trigger) vê as anteriores.
      for (const i of items) {
        const { error } = await db.from("study_plan_items").insert({
          id: i.id,
          institution_id: i.institutionId,
          plan_id: i.planId,
          student_id: i.studentId,
          classroom_id: i.classroomId,
          day: i.day,
          kind: i.kind,
          ref_id: i.refId,
          skill_id: i.skillId,
          title: i.title,
          minutes: i.minutes,
          reason: i.reason,
          rule: i.rule,
          origin: i.origin,
          status: i.status,
          created_by: i.createdBy,
        });
        fail("study_plan_items.insert", error);
      }
    },

    async updatePlanItem(id, patch) {
      const row: Row = {};
      if (patch.day !== undefined) row.day = patch.day;
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.minutes !== undefined) row.minutes = patch.minutes;
      const { data, error } = await db.from("study_plan_items").update(row).eq("id", id).select(ITEM_COLS);
      fail("study_plan_items.update", error);
      if (!data?.length) throw new Error("Atividade não encontrada ou fora do seu alcance.");
      return toItem(data[0]);
    },

    async insertPlanEvents(events) {
      if (events.length === 0) return;
      const { error } = await db.from("study_plan_events").insert(
        events.map((e) => ({
          id: e.id,
          institution_id: e.institutionId,
          plan_id: e.planId,
          item_id: e.itemId,
          student_id: e.studentId,
          classroom_id: e.classroomId,
          action: e.action,
          from_day: e.fromDay,
          to_day: e.toDay,
          note: e.note,
          actor_user_id: e.actorUserId,
          actor_role: e.actorRole,
        })),
      );
      fail("study_plan_events.insert", error);
    },

    async listPlanEvents(planId) {
      const { data, error } = await db
        .from("study_plan_events")
        .select(EVENT_COLS)
        .eq("plan_id", planId)
        .order("created_at", { ascending: false });
      fail("study_plan_events", error);
      return (data ?? []).map(toEvent);
    },
  };
}
