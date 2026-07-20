"use server";

/**
 * Server Actions da Lesson no modo REAL (M22) — persistência em
 * Supabase/PostgreSQL (tabela `lessons`, migration 0005), chamáveis
 * diretamente de componentes "use client" (LessonWizard, TurmasExplorer,
 * MyLessonCard, Curriculum Explorer). `institutionId` nunca vem do
 * cliente: é sempre derivado da sessão autenticada.
 *
 * O shape `Lesson` (`modules/lesson/domain/lesson.ts`) não carrega
 * `institutionId` — é um detalhe da persistência, aplicado só aqui.
 */

import { getWorkspaceContext } from "@/modules/workspace";
import { getSupabaseAdminClient } from "@/modules/platform/infrastructure/database/admin-client";

import type { Lesson, LessonFormat } from "../../domain/lesson";

type LessonRow = {
  id: string;
  author: string;
  grade: string;
  classroom_id: string | null;
  classroom_label: string;
  estimated_minutes: number | null;
  topic: string;
  objective: string;
  planning_axis: string;
  bncc_competencies: string[];
  bncc_computacao_competencies: string[];
  format: LessonFormat | null;
  knowledge_document_ids: string[];
  mission_id: string | null;
  assessment_notes: string | null;
  created_at: string;
  updated_at: string;
  saved_at: string | null;
};

function toLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    author: row.author,
    grade: row.grade,
    classroomId: row.classroom_id,
    classroomLabel: row.classroom_label,
    estimatedMinutes: row.estimated_minutes,
    topic: row.topic,
    objective: row.objective,
    planningAxis: row.planning_axis,
    bnccCompetencies: row.bncc_competencies ?? [],
    bnccComputacaoCompetencies: row.bncc_computacao_competencies ?? [],
    format: row.format,
    knowledgeDocumentIds: row.knowledge_document_ids ?? [],
    missionId: row.mission_id,
    assessmentNotes: row.assessment_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    savedAt: row.saved_at,
  };
}

/** Instituição do usuário autenticado — nunca aceita do cliente. */
async function requireInstitutionId(): Promise<string> {
  const workspace = await getWorkspaceContext();
  if (!workspace) throw new Error("Sessão expirada — entre novamente.");
  return workspace.institution.id;
}

export async function listLessonsRemote(): Promise<Lesson[]> {
  const institutionId = await requireInstitutionId();
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("lessons")
    .select("*")
    .eq("institution_id", institutionId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Falha ao listar Lessons: ${error.message}`);
  return (data ?? []).map((row) => toLesson(row as LessonRow));
}

export async function getLessonRemote(id: string): Promise<Lesson | null> {
  const institutionId = await requireInstitutionId();
  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from("lessons")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Falha ao abrir a Lesson: ${error.message}`);
  return data ? toLesson(data as LessonRow) : null;
}

export async function saveLessonRemote(lesson: Lesson): Promise<void> {
  const institutionId = await requireInstitutionId();
  const workspace = await getWorkspaceContext();
  if (workspace?.role === "student") {
    throw new Error("Apenas a equipe pedagógica pode montar Lessons.");
  }
  // Turma (quando definida) precisa pertencer ao escopo do professor —
  // mesma checagem já aplicada em professor/turmas/actions.ts.
  if (
    lesson.classroomId &&
    workspace &&
    !workspace.classrooms.some((c) => c.id === lesson.classroomId)
  ) {
    throw new Error("Turma fora do contexto institucional atual.");
  }

  const db = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await db.from("lessons").upsert(
    {
      id: lesson.id,
      institution_id: institutionId,
      author: lesson.author,
      grade: lesson.grade,
      classroom_id: lesson.classroomId,
      classroom_label: lesson.classroomLabel,
      estimated_minutes: lesson.estimatedMinutes,
      topic: lesson.topic,
      objective: lesson.objective,
      planning_axis: lesson.planningAxis,
      bncc_competencies: lesson.bnccCompetencies,
      bncc_computacao_competencies: lesson.bnccComputacaoCompetencies,
      format: lesson.format,
      knowledge_document_ids: lesson.knowledgeDocumentIds,
      mission_id: lesson.missionId,
      assessment_notes: lesson.assessmentNotes,
      updated_at: now,
      saved_at: lesson.savedAt,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`Falha ao salvar a Lesson: ${error.message}`);
}
