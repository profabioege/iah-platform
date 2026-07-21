import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdminClient } from "@/modules/platform/infrastructure/database/admin-client";

import type { AttachedContext, GeneratedMaterial, GenerationUsage } from "../../domain/entities";
import type { DocentiahRepositories } from "../../domain/repositories";

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

const toMaterial = (row: Row): GeneratedMaterial => ({
  id: row.id as string,
  institutionId: row.institution_id as string,
  teacherId: row.teacher_id as string,
  type: row.type as GeneratedMaterial["type"],
  title: row.title as string,
  subjectId: (row.subject_id as string | null) ?? null,
  classroomId: (row.classroom_id as string | null) ?? null,
  status: row.status as GeneratedMaterial["status"],
  inputData: row.input_data,
  outputData: row.output_data,
  promptVersion: row.prompt_version as string,
  provider: row.provider as string,
  model: row.model as string,
  webSearchUsed: Boolean(row.web_search_used),
  pdfUsed: Boolean(row.pdf_used),
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const toUsage = (row: Row): GenerationUsage => ({
  id: row.id as string,
  institutionId: row.institution_id as string,
  userId: row.user_id as string,
  capability: row.capability as string,
  provider: row.provider as string,
  model: row.model as string,
  promptVersion: row.prompt_version as string,
  inputTokens: row.input_tokens === null ? null : Number(row.input_tokens),
  outputTokens: row.output_tokens === null ? null : Number(row.output_tokens),
  estimatedCost: row.estimated_cost === null ? null : Number(row.estimated_cost),
  status: row.status as GenerationUsage["status"],
  createdAt: row.created_at as string,
});

const toAttachedContext = (row: Row): AttachedContext => ({
  id: row.id as string,
  materialId: row.material_id as string,
  type: row.type as AttachedContext["type"],
  originalFilename: row.original_filename as string,
  mimeType: row.mime_type as string,
  sizeBytes: Number(row.size_bytes),
  pageCount: Number(row.page_count),
  extractedCharacterCount: Number(row.extracted_character_count),
  truncated: Boolean(row.truncated),
  createdAt: row.created_at as string,
});

export function createDatabaseDocentiahRepositories(): DocentiahRepositories {
  const db = getSupabaseAdminClient();

  return {
    materials: {
      async listByTeacher(institutionId, teacherId) {
        return (
          await rows(db, "generated_materials", "materials.listByTeacher", (query) =>
            query
              .select("*")
              .eq("institution_id", institutionId)
              .eq("teacher_id", teacherId)
              .order("updated_at", { ascending: false }),
          )
        ).map(toMaterial);
      },
      async getById(institutionId, id) {
        const source = await rows(db, "generated_materials", "materials.getById", (query) =>
          query.select("*").eq("institution_id", institutionId).eq("id", id).limit(1),
        );
        return source[0] ? toMaterial(source[0]) : null;
      },
      async save(institutionId, material) {
        await upsert(db, "generated_materials", "materials.save", {
          id: material.id,
          institution_id: institutionId,
          teacher_id: material.teacherId,
          type: material.type,
          title: material.title,
          subject_id: material.subjectId,
          classroom_id: material.classroomId,
          status: material.status,
          input_data: material.inputData,
          output_data: material.outputData,
          prompt_version: material.promptVersion,
          provider: material.provider,
          model: material.model,
          web_search_used: material.webSearchUsed,
          pdf_used: material.pdfUsed,
          created_at: material.createdAt,
          updated_at: material.updatedAt,
        });
      },
    },
    usage: {
      async listByInstitution(institutionId) {
        return (
          await rows(db, "generation_usage", "usage.listByInstitution", (query) =>
            query.select("*").eq("institution_id", institutionId).order("created_at", { ascending: false }),
          )
        ).map(toUsage);
      },
      async save(institutionId, usage) {
        await upsert(db, "generation_usage", "usage.save", {
          id: usage.id,
          institution_id: institutionId,
          user_id: usage.userId,
          capability: usage.capability,
          provider: usage.provider,
          model: usage.model,
          prompt_version: usage.promptVersion,
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          estimated_cost: usage.estimatedCost,
          status: usage.status,
          created_at: usage.createdAt,
        });
      },
    },
    attachedContext: {
      async listByMaterial(materialId) {
        return (
          await rows(db, "attached_context", "attachedContext.listByMaterial", (query) =>
            query.select("*").eq("material_id", materialId).order("created_at"),
          )
        ).map(toAttachedContext);
      },
      async save(context) {
        await upsert(db, "attached_context", "attachedContext.save", {
          id: context.id,
          material_id: context.materialId,
          type: context.type,
          original_filename: context.originalFilename,
          mime_type: context.mimeType,
          size_bytes: context.sizeBytes,
          page_count: context.pageCount,
          extracted_character_count: context.extractedCharacterCount,
          truncated: context.truncated,
          created_at: context.createdAt,
        });
      },
    },
  };
}
