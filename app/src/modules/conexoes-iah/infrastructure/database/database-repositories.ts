import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdminClient } from "@/modules/platform/infrastructure/database/admin-client";

import type { CorrelatedLesson, CurriculumConnection } from "../../domain/entities";
import type { ConexoesIahRepositories } from "../../domain/repositories";

type Row = Record<string, unknown>;

function fail(operation: string, message: string): never {
  throw new Error(`Banco de dados: falha em ${operation} — ${message}`);
}

async function rows(
  db: SupabaseClient,
  table: string,
  operation: string,
  build: (query: ReturnType<SupabaseClient["from"]>) => PromiseLike<{
    data: Row[] | null;
    error: { message: string } | null;
  }>,
): Promise<Row[]> {
  const { data, error } = await build(db.from(table));
  if (error) fail(operation, error.message);
  return data ?? [];
}

async function upsert(db: SupabaseClient, table: string, operation: string, value: Row | Row[]) {
  const { error } = await db.from(table).upsert(value, { onConflict: "id" });
  if (error) fail(operation, error.message);
}

const toConnection = (row: Row): CurriculumConnection => ({
  id: row.id as string,
  institutionId: row.institution_id as string,
  classroomId: (row.classroom_id as string | null) ?? null,
  createdByTeacherId: row.created_by_teacher_id as string,
  sourceSubjectId: row.source_subject_id as string,
  sourceTeacherId: (row.source_teacher_id as string | null) ?? null,
  educationLevel: row.education_level as CurriculumConnection["educationLevel"],
  grade: row.grade as string,
  academicPeriod: (row.academic_period as string | null) ?? null,
  sourceTopic: row.source_topic as string,
  sourceConcept: (row.source_concept as string | null) ?? null,
  identifiedContext: row.identified_context as CurriculumConnection["identifiedContext"],
  selectedReferenceIds: (row.selected_reference_ids as string[] | null) ?? [],
  iahAxisIds: (row.iah_axis_ids as string[] | null) ?? [],
  selectedConnections: (row.selected_connections as CurriculumConnection["selectedConnections"] | null) ?? [],
  guidingQuestion: row.guiding_question as string,
  pedagogicalRationale: row.pedagogical_rationale as string,
  confidence: Number(row.confidence),
  status: row.status as CurriculumConnection["status"],
  promptVersion: row.prompt_version as string,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const toCorrelatedLesson = (row: Row): CorrelatedLesson => ({
  id: row.id as string,
  curriculumConnectionId: row.curriculum_connection_id as string,
  generatedMaterialId: row.generated_material_id as string,
  status: row.status as CorrelatedLesson["status"],
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

export function createDatabaseConexoesIahRepositories(): ConexoesIahRepositories {
  const db = getSupabaseAdminClient();

  return {
    connections: {
      async getById(institutionId, id) {
        const source = await rows(db, "curriculum_connections", "connections.getById", (query) =>
          query.select("*").eq("institution_id", institutionId).eq("id", id).limit(1),
        );
        return source[0] ? toConnection(source[0]) : null;
      },
      async listByTeacher(institutionId, teacherId) {
        return (
          await rows(db, "curriculum_connections", "connections.listByTeacher", (query) =>
            query
              .select("*")
              .eq("institution_id", institutionId)
              .eq("created_by_teacher_id", teacherId)
              .order("updated_at", { ascending: false }),
          )
        ).map(toConnection);
      },
      async save(institutionId, connection) {
        await upsert(db, "curriculum_connections", "connections.save", {
          id: connection.id,
          institution_id: institutionId,
          classroom_id: connection.classroomId,
          created_by_teacher_id: connection.createdByTeacherId,
          source_subject_id: connection.sourceSubjectId,
          source_teacher_id: connection.sourceTeacherId,
          education_level: connection.educationLevel,
          grade: connection.grade,
          academic_period: connection.academicPeriod,
          source_topic: connection.sourceTopic,
          source_concept: connection.sourceConcept,
          identified_context: connection.identifiedContext,
          selected_reference_ids: connection.selectedReferenceIds,
          iah_axis_ids: connection.iahAxisIds,
          selected_connections: connection.selectedConnections,
          guiding_question: connection.guidingQuestion,
          pedagogical_rationale: connection.pedagogicalRationale,
          confidence: connection.confidence,
          status: connection.status,
          prompt_version: connection.promptVersion,
          created_at: connection.createdAt,
          updated_at: connection.updatedAt,
        });
      },
    },
    correlatedLessons: {
      async getByConnectionId(curriculumConnectionId) {
        const source = await rows(db, "correlated_lessons", "correlatedLessons.getByConnectionId", (query) =>
          query.select("*").eq("curriculum_connection_id", curriculumConnectionId).limit(1),
        );
        return source[0] ? toCorrelatedLesson(source[0]) : null;
      },
      async getByGeneratedMaterialId(generatedMaterialId) {
        const source = await rows(db, "correlated_lessons", "correlatedLessons.getByGeneratedMaterialId", (query) =>
          query.select("*").eq("generated_material_id", generatedMaterialId).limit(1),
        );
        return source[0] ? toCorrelatedLesson(source[0]) : null;
      },
      async save(lesson) {
        await upsert(db, "correlated_lessons", "correlatedLessons.save", {
          id: lesson.id,
          curriculum_connection_id: lesson.curriculumConnectionId,
          generated_material_id: lesson.generatedMaterialId,
          status: lesson.status,
          created_at: lesson.createdAt,
          updated_at: lesson.updatedAt,
        });
      },
    },
  };
}
