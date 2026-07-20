/**
 * Implementação DATABASE dos contratos de persistência — Supabase/
 * PostgreSQL (M22 — Fundação de Produção; schema em app/db/migrations/).
 *
 * SÓ código de servidor: usa o client administrativo (service role) —
 * o navegador nunca fala com o banco (RLS deny-by-default, D-041).
 * Toda query filtra por institution_id, espelhando o contrato que exige
 * o tenant como primeiro parâmetro de todo método.
 *
 * Estas queries ainda NÃO foram exercitadas contra um projeto Supabase
 * real (nenhuma credencial existe neste ambiente) — a primeira execução
 * real deve seguir o roteiro de ativação de docs/PERSISTENCE.md.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AcademicYear,
  Classroom,
  ClassroomIntegration,
  ClassroomSyncState,
  Enrollment,
  Institution,
  MissionProgress,
  MissionRecord,
  MissionReview,
  Production,
  Reflection,
  Student,
  Teacher,
} from "../../domain/entities";
import type { MissionAssignment } from "../../domain/mission-delivery";
import type { PlatformRepositories } from "../../domain/repositories";
import { getSupabaseAdminClient } from "./admin-client";

type Row = Record<string, unknown>;

function fail(operation: string, message: string): never {
  throw new Error(`Banco de dados: falha em ${operation} — ${message}`);
}

async function selectRows(
  db: SupabaseClient,
  operation: string,
  build: (from: ReturnType<SupabaseClient["from"]>) => PromiseLike<{
    data: Row[] | null;
    error: { message: string } | null;
  }>,
  table: string,
): Promise<Row[]> {
  const { data, error } = await build(db.from(table));
  if (error) fail(operation, error.message);
  return data ?? [];
}

async function upsertRow(
  db: SupabaseClient,
  operation: string,
  table: string,
  row: Row,
  onConflict = "id",
): Promise<void> {
  const { error } = await db.from(table).upsert(row, { onConflict });
  if (error) fail(operation, error.message);
}

const toInstitution = (r: Row): Institution => ({
  id: r.id as string,
  slug: (r.slug as string) ?? "",
  name: r.name as string,
  domain: (r.domain as string) ?? "",
  logoUrl: (r.logo_url as string | null) ?? null,
  colors: (r.colors as Institution["colors"]) ?? null,
  timezone: (r.timezone as string) ?? "America/Sao_Paulo",
  status: r.status as Institution["status"],
  createdAt: r.created_at as string,
});

const toAcademicYear = (r: Row): AcademicYear => ({
  id: r.id as string,
  institutionId: r.institution_id as string,
  label: r.label as string,
  startsOn: r.starts_on as string,
  endsOn: r.ends_on as string,
  status: r.status as AcademicYear["status"],
});

const toTeacher = (r: Row): Teacher => ({
  id: r.id as string,
  institutionId: r.institution_id as string,
  name: r.name as string,
  email: r.email as string,
});

const toStudent = (r: Row): Student => ({
  id: r.id as string,
  institutionId: r.institution_id as string,
  name: r.name as string,
  email: (r.email as string | null) ?? null,
});

const toEnrollment = (r: Row): Enrollment => ({
  id: r.id as string,
  institutionId: r.institution_id as string,
  classroomId: r.classroom_id as string,
  studentId: r.student_id as string,
  status: r.status as Enrollment["status"],
  enrolledAt: r.enrolled_at as string,
});

const toMissionRecord = (r: Row): MissionRecord => ({
  id: r.id as string,
  number: r.number as number,
  title: r.title as string,
  module: r.module as string,
  status: r.status as MissionRecord["status"],
  version: r.version as number,
});

const toMissionProgress = (r: Row): MissionProgress => ({
  id: r.id as string,
  institutionId: r.institution_id as string,
  classroomId: r.classroom_id as string,
  studentId: r.student_id as string,
  missionId: r.mission_id as string,
  status: r.status as MissionProgress["status"],
  lastAccessAt: (r.last_access_at as string | null) ?? null,
});

const toProduction = (r: Row): Production => ({
  id: r.id as string,
  institutionId: r.institution_id as string,
  classroomId: r.classroom_id as string,
  studentId: r.student_id as string,
  missionId: r.mission_id as string,
  startedAt: (r.started_at as string | null) ?? null,
  content: r.content as string,
  status: r.status as Production["status"],
  deliveredAt: (r.delivered_at as string | null) ?? null,
  updatedAt: r.updated_at as string,
});

const toReflection = (r: Row): Reflection => ({
  id: r.id as string,
  institutionId: r.institution_id as string,
  classroomId: r.classroom_id as string,
  studentId: r.student_id as string,
  missionId: r.mission_id as string,
  text: r.text as string,
  recordedAt: (r.recorded_at as string | null) ?? null,
  visibility: r.visibility as Reflection["visibility"],
});

const toAssignment = (r: Row): MissionAssignment => ({
  id: r.id as string,
  institutionId: r.institution_id as string,
  classroomId: r.classroom_id as string,
  missionId: r.mission_id as string,
  lessonId: (r.lesson_id as string | null) ?? null,
  missionVersion: r.mission_version as number,
  publishedAt: r.published_at as string,
  dueAt: (r.due_at as string | null) ?? null,
  status: r.status as MissionAssignment["status"],
  closedAt: (r.closed_at as string | null) ?? null,
  externalAssignmentId: (r.external_assignment_id as string | null) ?? null,
});

const toReview = (r: Row): MissionReview => ({
  id: r.id as string,
  institutionId: r.institution_id as string,
  classroomId: r.classroom_id as string,
  studentId: r.student_id as string,
  missionId: r.mission_id as string,
  grade: r.grade as string,
  observedCriteria: (r.observed_criteria as string[]) ?? [],
  feedback: r.feedback as string,
  reviewerId: r.reviewer_id as string,
  reviewerName: r.reviewer_name as string,
  reviewedAt: r.reviewed_at as string,
});

const toIntegration = (r: Row): ClassroomIntegration => ({
  id: r.id as string,
  institutionId: r.institution_id as string,
  provider: r.provider as ClassroomIntegration["provider"],
  status: r.status as ClassroomIntegration["status"],
  externalCourseMap:
    (r.external_course_map as Record<string, string>) ?? {},
  lastSyncAt: (r.last_sync_at as string | null) ?? null,
});

const toSyncState = (r: Row): ClassroomSyncState => ({
  id: r.id as string,
  institutionId: r.institution_id as string,
  classroomId: r.classroom_id as string,
  provider: r.provider as ClassroomSyncState["provider"],
  externalCourseId: r.external_course_id as string,
  status: r.status as ClassroomSyncState["status"],
  lastSyncAt: (r.last_sync_at as string | null) ?? null,
  studentCount: (r.student_count as number) ?? 0,
  assignmentCount: (r.assignment_count as number) ?? 0,
  lastError: (r.last_error as string | null) ?? null,
});

export function createDatabaseRepositories(): PlatformRepositories {
  const db = getSupabaseAdminClient();

  return {
    institutions: {
      async getById(id) {
        const rows = await selectRows(
          db,
          "institutions.getById",
          (from) => from.select("*").eq("id", id).limit(1),
          "institutions",
        );
        return rows[0] ? toInstitution(rows[0]) : null;
      },
      async list() {
        const rows = await selectRows(
          db,
          "institutions.list",
          (from) => from.select("*").order("name"),
          "institutions",
        );
        return rows.map(toInstitution);
      },
    },

    academicYears: {
      async listByInstitution(institutionId) {
        const rows = await selectRows(
          db,
          "academicYears.listByInstitution",
          (from) =>
            from.select("*").eq("institution_id", institutionId).order("label"),
          "academic_years",
        );
        return rows.map(toAcademicYear);
      },
    },

    teachers: {
      async listByInstitution(institutionId) {
        const rows = await selectRows(
          db,
          "teachers.listByInstitution",
          (from) =>
            from.select("*").eq("institution_id", institutionId).order("name"),
          "teachers",
        );
        return rows.map(toTeacher);
      },
    },

    classrooms: {
      async listByInstitution(institutionId, academicYearId) {
        const rows = await selectRows(
          db,
          "classrooms.listByInstitution",
          (from) => {
            let query = from
              .select("*, classroom_teachers ( teacher_id )")
              .eq("institution_id", institutionId);
            if (academicYearId) {
              query = query.eq("academic_year_id", academicYearId);
            }
            return query.order("name");
          },
          "classrooms",
        );
        return rows.map(mapClassroom);
      },
      async getById(institutionId, id) {
        const rows = await selectRows(
          db,
          "classrooms.getById",
          (from) =>
            from
              .select("*, classroom_teachers ( teacher_id )")
              .eq("institution_id", institutionId)
              .eq("id", id)
              .limit(1),
          "classrooms",
        );
        return rows[0] ? mapClassroom(rows[0]) : null;
      },
      async create(institutionId, classroom) {
        await upsertRow(db, "classrooms.create", "classrooms", {
          id: classroom.id,
          institution_id: institutionId,
          academic_year_id: classroom.academicYearId,
          name: classroom.name,
          grade: classroom.grade,
        });
      },
    },

    students: {
      async listByClassroom(institutionId, classroomId) {
        const rows = await selectRows(
          db,
          "students.listByClassroom",
          (from) =>
            from
              .select("students!inner(*)")
              .eq("institution_id", institutionId)
              .eq("classroom_id", classroomId)
              .eq("status", "active"),
          "enrollments",
        );
        return rows
          .map((r) => toStudent(r.students as Row))
          .sort((a, b) => a.name.localeCompare(b.name));
      },
      async findByEmail(institutionId, email) {
        const rows = await selectRows(
          db,
          "students.findByEmail",
          (from) =>
            from
              .select("*")
              .eq("institution_id", institutionId)
              .eq("email", email)
              .limit(1),
          "students",
        );
        return rows[0] ? toStudent(rows[0]) : null;
      },
      async create(institutionId, student) {
        await upsertRow(db, "students.create", "students", {
          id: student.id,
          institution_id: institutionId,
          name: student.name,
          email: student.email,
        });
      },
    },

    enrollments: {
      async listByClassroom(institutionId, classroomId) {
        const rows = await selectRows(
          db,
          "enrollments.listByClassroom",
          (from) =>
            from
              .select("*")
              .eq("institution_id", institutionId)
              .eq("classroom_id", classroomId),
          "enrollments",
        );
        return rows.map(toEnrollment);
      },
      async create(institutionId, enrollment) {
        await upsertRow(db, "enrollments.create", "enrollments", {
          id: enrollment.id,
          institution_id: institutionId,
          classroom_id: enrollment.classroomId,
          student_id: enrollment.studentId,
          status: enrollment.status,
          enrolled_at: enrollment.enrolledAt,
        });
      },
    },

    missions: {
      async list() {
        const rows = await selectRows(
          db,
          "missions.list",
          (from) => from.select("*").order("number"),
          "missions",
        );
        return rows.map(toMissionRecord);
      },
    },

    missionProgress: {
      async listByClassroomMission(institutionId, classroomId, missionId) {
        const rows = await selectRows(
          db,
          "missionProgress.listByClassroomMission",
          (from) =>
            from
              .select("*")
              .eq("institution_id", institutionId)
              .eq("classroom_id", classroomId)
              .eq("mission_id", missionId),
          "mission_progress",
        );
        return rows.map(toMissionProgress);
      },
      async save(institutionId, progress) {
        await upsertRow(
          db,
          "missionProgress.save",
          "mission_progress",
          {
            id: progress.id,
            institution_id: institutionId,
            classroom_id: progress.classroomId,
            student_id: progress.studentId,
            mission_id: progress.missionId,
            status: progress.status,
            last_access_at: progress.lastAccessAt,
          },
          "classroom_id,student_id,mission_id",
        );
      },
    },

    productions: {
      async listByStudent(institutionId, studentId) {
        const rows = await selectRows(
          db,
          "productions.listByStudent",
          (from) =>
            from
              .select("*")
              .eq("institution_id", institutionId)
              .eq("student_id", studentId),
          "productions",
        );
        return rows.map(toProduction);
      },
      async listByClassroomMission(institutionId, classroomId, missionId) {
        const rows = await selectRows(
          db,
          "productions.listByClassroomMission",
          (from) =>
            from
              .select("*")
              .eq("institution_id", institutionId)
              .eq("classroom_id", classroomId)
              .eq("mission_id", missionId),
          "productions",
        );
        return rows.map(toProduction);
      },
      async save(institutionId, production) {
        await upsertRow(
          db,
          "productions.save",
          "productions",
          {
            id: production.id,
            institution_id: institutionId,
            classroom_id: production.classroomId,
            student_id: production.studentId,
            mission_id: production.missionId,
            started_at: production.startedAt,
            content: production.content,
            status: production.status,
            delivered_at: production.deliveredAt,
            updated_at: production.updatedAt,
          },
          "classroom_id,student_id,mission_id",
        );
      },
    },

    reflections: {
      async listByStudent(institutionId, studentId) {
        const rows = await selectRows(
          db,
          "reflections.listByStudent",
          (from) =>
            from
              .select("*")
              .eq("institution_id", institutionId)
              .eq("student_id", studentId)
              .order("recorded_at", { ascending: false }),
          "reflections",
        );
        return rows.map(toReflection);
      },
      async listByClassroomMission(institutionId, classroomId, missionId) {
        const rows = await selectRows(
          db,
          "reflections.listByClassroomMission",
          (from) =>
            from
              .select("*")
              .eq("institution_id", institutionId)
              .eq("classroom_id", classroomId)
              .eq("mission_id", missionId),
          "reflections",
        );
        return rows.map(toReflection);
      },
      async save(institutionId, reflection) {
        await upsertRow(
          db,
          "reflections.save",
          "reflections",
          {
            id: reflection.id,
            institution_id: institutionId,
            classroom_id: reflection.classroomId,
            student_id: reflection.studentId,
            mission_id: reflection.missionId,
            text: reflection.text,
            visibility: reflection.visibility,
            recorded_at: reflection.recordedAt,
          },
          "classroom_id,student_id,mission_id",
        );
      },
    },

    classroomIntegrations: {
      async listByInstitution(institutionId) {
        const rows = await selectRows(
          db,
          "classroomIntegrations.listByInstitution",
          (from) => from.select("*").eq("institution_id", institutionId),
          "classroom_integrations",
        );
        return rows.map(toIntegration);
      },
    },

    classroomSyncStates: {
      async listByInstitution(institutionId) {
        const rows = await selectRows(
          db,
          "classroomSyncStates.listByInstitution",
          (from) => from.select("*").eq("institution_id", institutionId),
          "classroom_sync_states",
        );
        return rows.map(toSyncState);
      },
      async getByClassroom(institutionId, classroomId) {
        const rows = await selectRows(
          db,
          "classroomSyncStates.getByClassroom",
          (from) =>
            from
              .select("*")
              .eq("institution_id", institutionId)
              .eq("classroom_id", classroomId)
              .limit(1),
          "classroom_sync_states",
        );
        return rows[0] ? toSyncState(rows[0]) : null;
      },
      async save(institutionId, state) {
        await upsertRow(db, "classroomSyncStates.save", "classroom_sync_states", {
          id: state.id,
          institution_id: institutionId,
          classroom_id: state.classroomId,
          provider: state.provider,
          external_course_id: state.externalCourseId,
          status: state.status,
          last_sync_at: state.lastSyncAt,
          student_count: state.studentCount,
          assignment_count: state.assignmentCount,
          last_error: state.lastError,
        });
      },
    },

    missionAssignments: {
      async listByClassroom(institutionId, classroomId) {
        const rows = await selectRows(
          db,
          "missionAssignments.listByClassroom",
          (from) =>
            from
              .select("*")
              .eq("institution_id", institutionId)
              .eq("classroom_id", classroomId)
              .order("published_at", { ascending: false }),
          "mission_assignments",
        );
        return rows.map(toAssignment);
      },
      async getById(institutionId, id) {
        const rows = await selectRows(
          db,
          "missionAssignments.getById",
          (from) =>
            from
              .select("*")
              .eq("institution_id", institutionId)
              .eq("id", id)
              .limit(1),
          "mission_assignments",
        );
        return rows[0] ? toAssignment(rows[0]) : null;
      },
      async save(institutionId, assignment) {
        await upsertRow(db, "missionAssignments.save", "mission_assignments", {
          id: assignment.id,
          institution_id: institutionId,
          classroom_id: assignment.classroomId,
          mission_id: assignment.missionId,
          lesson_id: assignment.lessonId,
          mission_version: assignment.missionVersion,
          status: assignment.status,
          published_at: assignment.publishedAt,
          due_at: assignment.dueAt,
          closed_at: assignment.closedAt,
          external_assignment_id: assignment.externalAssignmentId,
        });
      },
    },

    missionReviews: {
      async listByClassroomMission(institutionId, classroomId, missionId) {
        const rows = await selectRows(
          db,
          "missionReviews.listByClassroomMission",
          (from) =>
            from
              .select("*")
              .eq("institution_id", institutionId)
              .eq("classroom_id", classroomId)
              .eq("mission_id", missionId),
          "mission_reviews",
        );
        return rows.map(toReview);
      },
      async listByStudent(institutionId, studentId) {
        const rows = await selectRows(
          db,
          "missionReviews.listByStudent",
          (from) =>
            from
              .select("*")
              .eq("institution_id", institutionId)
              .eq("student_id", studentId),
          "mission_reviews",
        );
        return rows.map(toReview);
      },
      async save(institutionId, review) {
        await upsertRow(
          db,
          "missionReviews.save",
          "mission_reviews",
          {
            id: review.id,
            institution_id: institutionId,
            classroom_id: review.classroomId,
            student_id: review.studentId,
            mission_id: review.missionId,
            grade: review.grade,
            observed_criteria: review.observedCriteria,
            feedback: review.feedback,
            reviewer_id: review.reviewerId,
            reviewer_name: review.reviewerName,
            reviewed_at: review.reviewedAt,
          },
          "classroom_id,student_id,mission_id",
        );
      },
    },
  };
}

function mapClassroom(r: Row): Classroom {
  const teacherLinks = (r.classroom_teachers as Row[] | null) ?? [];
  return {
    id: r.id as string,
    institutionId: r.institution_id as string,
    academicYearId: r.academic_year_id as string,
    name: r.name as string,
    grade: (r.grade as string | null) ?? null,
    teacherIds: teacherLinks.map((link) => link.teacher_id as string),
  };
}
