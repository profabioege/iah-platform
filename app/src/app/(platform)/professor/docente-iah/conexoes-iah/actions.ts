"use server";

import {
  assertConnectionOwnership,
  getCurriculumConnectionProvider,
  getDefaultConexoesIahRepositories,
  type CorrelatedLessonContent,
  type CurriculumConnection,
  type CurriculumConnectionStatus,
  type EducationLevel,
  type IdentifiedContextSnapshot,
  type KnowledgeReference,
  type SelectedConnection,
} from "@/modules/conexoes-iah";
import { CATALOG_DISCIPLINES } from "@/modules/conexoes-iah";
import { getDefaultDocentiahRepositories, type GeneratedMaterial } from "@/modules/docentiah";
import { getWorkspaceContext, type WorkspaceContext } from "@/modules/workspace";

import { createConexoesKnowledgeSources } from "@/modules/conexoes-iah/infrastructure/knowledge-sources";

/**
 * Server Actions de Conexões IAH — único ponto de contato entre a UI e
 * o provedor/repositórios. Mesma disciplina de `apresentacao-slides/actions.ts`:
 * toda checagem de sessão fica dentro do próprio try/catch de cada ação.
 */

async function requireWorkspace(): Promise<WorkspaceContext> {
  const workspace = await getWorkspaceContext();
  if (!workspace) throw new Error("Sessão inválida.");
  return workspace;
}

async function requireTeacherWorkspace(): Promise<WorkspaceContext & { user: { teacherId: string } }> {
  const workspace = await requireWorkspace();
  if (!workspace.user.teacherId) {
    throw new Error("Esta ação está disponível apenas para professores.");
  }
  return workspace as WorkspaceContext & { user: { teacherId: string } };
}

export async function listTopicsAction(
  disciplineSlug: string,
  educationLevel: EducationLevel,
  grade: string,
): Promise<{ topics: { id: string; topic: string }[] } | { error: string }> {
  try {
    await requireWorkspace();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sessão inválida." };
  }
  const sources = createConexoesKnowledgeSources();
  const entries = await sources.curriculum.listTopics(disciplineSlug, educationLevel, grade);
  const topics = entries.slice(0, 7).map((entry) => ({ id: entry.id, topic: entry.topic }));
  return { topics };
}

export interface IdentifyContextParams {
  term: string;
  disciplineSlug: string;
  educationLevel: EducationLevel;
  grade: string;
}

export async function identifyContextAction(
  params: IdentifyContextParams,
): Promise<{ context: IdentifiedContextSnapshot; references: KnowledgeReference[] } | { error: string }> {
  try {
    await requireWorkspace();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sessão inválida." };
  }

  const term = params.term.trim();
  if (!term) return { error: "Informe um tema ou conceito." };

  try {
    const provider = getCurriculumConnectionProvider();
    return await provider.identifyConceptContext({
      term,
      disciplineSlug: params.disciplineSlug,
      educationLevel: params.educationLevel,
      grade: params.grade,
    });
  } catch {
    return { error: "Não foi possível identificar o contexto agora. Tente novamente." };
  }
}

export async function suggestConnectionsAction(
  context: IdentifiedContextSnapshot,
  limit: number,
): Promise<{ connections: SelectedConnection[]; references: KnowledgeReference[] } | { error: string }> {
  try {
    await requireWorkspace();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sessão inválida." };
  }

  try {
    const provider = getCurriculumConnectionProvider();
    return await provider.suggestIahConnections({ context, limit });
  } catch {
    return { error: "Não foi possível sugerir conexões agora. Tente novamente." };
  }
}

export interface GenerateLessonParams {
  classroomId: string | null;
  disciplineSlug: string;
  educationLevel: EducationLevel;
  grade: string;
  academicPeriod: string | null;
  sourceTopic: string;
  sourceConcept: string | null;
  context: IdentifiedContextSnapshot;
  selectedConnections: SelectedConnection[];
  guidingQuestion: string;
}

const PROMPT_VERSION = "v1";

export async function generateLessonAction(
  params: GenerateLessonParams,
): Promise<{ connection: CurriculumConnection; material: GeneratedMaterial; lesson: CorrelatedLessonContent } | { error: string }> {
  let workspace: WorkspaceContext & { user: { teacherId: string } };
  try {
    workspace = await requireTeacherWorkspace();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sessão inválida." };
  }

  if (params.selectedConnections.length === 0) {
    return { error: "Selecione ao menos uma conexão, ou escreva uma conexão própria, antes de gerar a aula." };
  }

  const disciplineName =
    CATALOG_DISCIPLINES.find((d) => d.slug === params.disciplineSlug)?.name ?? params.disciplineSlug;

  try {
    const provider = getCurriculumConnectionProvider();
    const { lesson } = await provider.generateCorrelatedLesson({
      sourceSubjectName: disciplineName,
      sourceTopic: params.sourceTopic,
      sourceConcept: params.sourceConcept,
      educationLevel: params.educationLevel,
      grade: params.grade,
      context: params.context,
      selectedConnections: params.selectedConnections,
      guidingQuestion: params.guidingQuestion,
    });

    const now = new Date().toISOString();
    const connectionId = crypto.randomUUID();

    const connection: CurriculumConnection = {
      id: connectionId,
      institutionId: workspace.institution.id,
      classroomId: params.classroomId,
      createdByTeacherId: workspace.user.teacherId,
      sourceSubjectId: params.disciplineSlug,
      sourceTeacherId: null,
      educationLevel: params.educationLevel,
      grade: params.grade,
      academicPeriod: params.academicPeriod,
      sourceTopic: params.sourceTopic,
      sourceConcept: params.sourceConcept,
      identifiedContext: params.context,
      selectedReferenceIds: lesson.references.map((r) => r.id),
      iahAxisIds: Array.from(new Set(params.selectedConnections.map((c) => c.iahAxisId))),
      selectedConnections: params.selectedConnections,
      guidingQuestion: lesson.guidingQuestion,
      pedagogicalRationale: lesson.pedagogicalRationale,
      confidence: params.context.confidence,
      status: "sugerida",
      promptVersion: PROMPT_VERSION,
      createdAt: now,
      updatedAt: now,
    };

    const material: GeneratedMaterial = {
      id: crypto.randomUUID(),
      institutionId: workspace.institution.id,
      teacherId: workspace.user.teacherId,
      type: "laboratory_lesson",
      title: lesson.title,
      subjectId: null,
      classroomId: params.classroomId,
      status: "generated",
      inputData: params,
      outputData: lesson,
      promptVersion: PROMPT_VERSION,
      provider: "iah-demo",
      model: "conexoes-iah-demo-v1",
      webSearchUsed: false,
      pdfUsed: false,
      createdAt: now,
      updatedAt: now,
    };

    const repositories = getDefaultConexoesIahRepositories();
    const materialRepositories = getDefaultDocentiahRepositories();

    await materialRepositories.materials.save(workspace.institution.id, material);
    await repositories.connections.save(workspace.institution.id, connection);
    await repositories.correlatedLessons.save({
      id: crypto.randomUUID(),
      curriculumConnectionId: connection.id,
      generatedMaterialId: material.id,
      status: "sugerida",
      createdAt: now,
      updatedAt: now,
    });

    return { connection, material, lesson };
  } catch {
    return { error: "Não foi possível gerar a aula de laboratório agora. Tente novamente." };
  }
}

export async function saveLessonDraftAction(
  connectionId: string,
  materialId: string,
  edits: { title: string; guidingQuestion: string; lesson: CorrelatedLessonContent },
): Promise<{ success: true } | { error: string }> {
  let workspace: WorkspaceContext & { user: { teacherId: string } };
  try {
    workspace = await requireTeacherWorkspace();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sessão inválida." };
  }

  const conexoesRepositories = getDefaultConexoesIahRepositories();
  const materialRepositories = getDefaultDocentiahRepositories();

  const connection = await conexoesRepositories.connections.getById(workspace.institution.id, connectionId);
  const material = await materialRepositories.materials.getById(workspace.institution.id, materialId);
  if (!connection || !material) return { error: "Conexão não encontrada." };

  try {
    assertConnectionOwnership(connection, workspace.institution.id, workspace.user.teacherId);
  } catch {
    return { error: "Você não tem acesso a esta conexão." };
  }

  const now = new Date().toISOString();
  const nextStatus: CurriculumConnectionStatus = "rascunho";

  await materialRepositories.materials.save(workspace.institution.id, {
    ...material,
    title: edits.title,
    outputData: { ...edits.lesson, guidingQuestion: edits.guidingQuestion, title: edits.title },
    status: "saved",
    updatedAt: now,
  });

  await conexoesRepositories.connections.save(workspace.institution.id, {
    ...connection,
    guidingQuestion: edits.guidingQuestion,
    status: nextStatus,
    updatedAt: now,
  });

  const correlatedLesson = await conexoesRepositories.correlatedLessons.getByConnectionId(connectionId);
  if (correlatedLesson) {
    await conexoesRepositories.correlatedLessons.save({ ...correlatedLesson, status: nextStatus, updatedAt: now });
  }

  return { success: true };
}
