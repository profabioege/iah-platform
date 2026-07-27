/**
 * Implementação DATABASE da persistência do Mentor IAH — Supabase/
 * PostgreSQL (`supabase/migrations/20260727000100_mentor_sessions.sql`).
 *
 * SÓ código de servidor: usa o client administrativo (service role) —
 * o navegador nunca fala com o banco (RLS deny-by-default, D-041).
 * Toda query filtra por institution_id.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdminClient } from "@/modules/platform/infrastructure/database/admin-client";

import type { MentorMessageRecord, MentorSession } from "../../domain/mentor-session.ts";
import type { MentorRepositories } from "../../domain/repositories.ts";

type Row = Record<string, unknown>;

function fail(operation: string, message: string): never {
  throw new Error(`Banco de dados: falha em ${operation} — ${message}`);
}

async function selectRows(
  db: SupabaseClient,
  operation: string,
  table: string,
  build: (from: ReturnType<SupabaseClient["from"]>) => PromiseLike<{
    data: Row[] | null;
    error: { message: string } | null;
  }>,
): Promise<Row[]> {
  const { data, error } = await build(db.from(table));
  if (error) fail(operation, error.message);
  return data ?? [];
}

const toSession = (r: Row): MentorSession => ({
  id: r.id as string,
  institutionId: r.institution_id as string,
  missionId: r.mission_id as string,
  assignmentId: r.assignment_id as string,
  studentId: r.student_id as string,
  mentorVersion: r.mentor_version as string,
  status: r.status as MentorSession["status"],
  startedAt: r.started_at as string,
  updatedAt: r.updated_at as string,
  completedAt: (r.completed_at as string | null) ?? null,
  maximumSupportLevel: (r.maximum_support_level as string | null) ?? null,
  requiresTeacherIntervention: r.requires_teacher_intervention as boolean,
  createdAt: r.created_at as string,
});

const toMessage = (r: Row): MentorMessageRecord => ({
  id: r.id as string,
  sessionId: r.session_id as string,
  role: r.role as MentorMessageRecord["role"],
  content: r.content as string,
  pedagogicalStage: (r.pedagogical_stage as string | null) ?? null,
  supportLevel: (r.support_level as string | null) ?? null,
  createdAt: r.created_at as string,
  sequenceNumber: r.sequence_number as number,
});

export function createDatabaseMentorRepositories(): MentorRepositories {
  const db = getSupabaseAdminClient();

  return {
    sessions: {
      async findActiveByAssignment(institutionId, assignmentId, studentId) {
        const rows = await selectRows(
          db,
          "mentorSessions.findActiveByAssignment",
          "mentor_sessions",
          (from) =>
            from
              .select("*")
              .eq("institution_id", institutionId)
              .eq("assignment_id", assignmentId)
              .eq("student_id", studentId)
              .eq("status", "active")
              .limit(1),
        );
        return rows[0] ? toSession(rows[0]) : null;
      },
      async create(institutionId, session) {
        // Idempotente por id: só insere se ainda não existir — nunca
        // sobrescreve uma sessão já em andamento (ex.: retry de "abrir
        // o Mentor" duas vezes seguidas).
        const { error } = await db.from("mentor_sessions").insert({
          id: session.id,
          institution_id: institutionId,
          mission_id: session.missionId,
          assignment_id: session.assignmentId,
          student_id: session.studentId,
          mentor_version: session.mentorVersion,
          status: session.status,
          started_at: session.startedAt,
          updated_at: session.updatedAt,
          completed_at: session.completedAt,
          maximum_support_level: session.maximumSupportLevel,
          requires_teacher_intervention: session.requiresTeacherIntervention,
          created_at: session.createdAt,
        });
        // 23505 = unique_violation (Postgres) — a sessão já existe, ok ignorar.
        if (error && (error as { code?: string }).code !== "23505") {
          fail("mentorSessions.create", error.message);
        }
      },
      async touch(institutionId, sessionId, updatedAt) {
        const { error } = await db
          .from("mentor_sessions")
          .update({ updated_at: updatedAt })
          .eq("institution_id", institutionId)
          .eq("id", sessionId);
        if (error) fail("mentorSessions.touch", error.message);
      },
    },

    messages: {
      async listBySession(institutionId, sessionId) {
        const rows = await selectRows(
          db,
          "mentorMessages.listBySession",
          "mentor_messages",
          (from) =>
            from
              .select("*")
              .eq("institution_id", institutionId)
              .eq("session_id", sessionId)
              .order("sequence_number", { ascending: true }),
        );
        return rows.map(toMessage);
      },
      async append(institutionId, message) {
        const existingRows = await selectRows(
          db,
          "mentorMessages.append.checkExisting",
          "mentor_messages",
          (from) =>
            from
              .select("*")
              .eq("institution_id", institutionId)
              .eq("id", message.id)
              .limit(1),
        );
        if (existingRows[0]) return toMessage(existingRows[0]);

        const currentMax = await selectRows(
          db,
          "mentorMessages.append.maxSequence",
          "mentor_messages",
          (from) =>
            from
              .select("sequence_number")
              .eq("institution_id", institutionId)
              .eq("session_id", message.sessionId)
              .order("sequence_number", { ascending: false })
              .limit(1),
        );
        const sequenceNumber = ((currentMax[0]?.sequence_number as number) ?? 0) + 1;
        const createdAt = new Date().toISOString();

        const { error } = await db.from("mentor_messages").insert({
          id: message.id,
          institution_id: institutionId,
          session_id: message.sessionId,
          role: message.role,
          content: message.content,
          pedagogical_stage: message.pedagogicalStage,
          support_level: message.supportLevel,
          created_at: createdAt,
          sequence_number: sequenceNumber,
        });
        if (error) {
          // Corrida rara (duas escritas concorrentes pro mesmo id):
          // a outra já resolveu — devolve a linha persistida por ela.
          if ((error as { code?: string }).code === "23505") {
            const rows = await selectRows(
              db,
              "mentorMessages.append.afterConflict",
              "mentor_messages",
              (from) =>
                from
                  .select("*")
                  .eq("institution_id", institutionId)
                  .eq("id", message.id)
                  .limit(1),
            );
            if (rows[0]) return toMessage(rows[0]);
          }
          fail("mentorMessages.append", error.message);
        }

        return {
          ...message,
          sequenceNumber,
          createdAt,
        };
      },
    },
  };
}
