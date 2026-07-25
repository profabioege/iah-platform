"use server";

import { buildLessonBrief, type BuildLessonBriefOutput } from "@/lib/docentiah/lesson-brief-extractor";
import { findCurriculumSkillSuggestions } from "@/lib/docentiah/curriculum-skill-matcher";
import {
  generateInfographicDraft,
  generateLessonPlanDraft,
  generateMindMapDraft,
  type LessonPlanRewriteSection,
} from "@/lib/docentiah/material-generators";
import { getCurriculumConnectionProvider, type EducationLevel } from "@/modules/conexoes-iah";
import { getDefaultCurriculumRepositories } from "@/modules/curriculum";
import {
  getDefaultDocentiahRepositories,
  type IahConnectionSuggestion,
  type InfographicDraft,
  type LessonPlanDraft,
  type LessonPlanningBrief,
  type MindMapDraft,
  type SupportMaterialType,
} from "@/modules/docentiah";
import { getWorkspaceContext, type WorkspaceContext } from "@/modules/workspace";

/**
 * Server Actions do Planejador Conversacional — capability arquitetural
 * `docentiah.build_lesson_brief` (transporte mockado, sem chamada de IA
 * real nesta entrega) + ponte para Conexões IAH e Currículo, já
 * existentes. Só professores acessam (`requireTeacherWorkspace`).
 */

async function requireTeacherWorkspace(): Promise<WorkspaceContext & { user: { teacherId: string } }> {
  const workspace = await getWorkspaceContext();
  if (!workspace) throw new Error("Sessão inválida.");
  if (!workspace.user.teacherId) throw new Error("Esta ação está disponível apenas para professores.");
  return workspace as WorkspaceContext & { user: { teacherId: string } };
}

export interface ChatTurnResult extends BuildLessonBriefOutput {
  error?: string;
}

/** Um turno do chat — extrai o que der do texto do professor sobre o brief atual. Nunca chama IA real nesta entrega. */
export async function sendChatMessageAction(message: string, currentBrief: LessonPlanningBrief): Promise<ChatTurnResult> {
  try {
    await requireTeacherWorkspace();
  } catch (error) {
    return {
      extractedFields: {},
      missingFields: [],
      confirmationSummary: null,
      nextQuestion: null,
      suggestedActions: [],
      warnings: [],
      confidence: 0,
      error: error instanceof Error ? error.message : "Sessão inválida.",
    };
  }
  return buildLessonBrief({ message, currentBrief });
}

export interface CurriculumContextResult {
  skills: Awaited<ReturnType<typeof findCurriculumSkillSuggestions>>;
  connections: IahConnectionSuggestion[];
  skillsHonestMessage: string | null;
}

/** Habilidades curriculares reais (nunca inventadas) + até 3 Conexões IAH, a partir do brief já confirmado. */
export async function fetchCurriculumContextAction(brief: LessonPlanningBrief): Promise<CurriculumContextResult | { error: string }> {
  try {
    await requireTeacherWorkspace();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sessão inválida." };
  }
  if (!brief.topic) return { error: "Informe o conteúdo da aula antes de buscar habilidades e conexões." };

  const curriculumRepositories = getDefaultCurriculumRepositories();
  const skills = await findCurriculumSkillSuggestions(curriculumRepositories, {
    subject: brief.subject,
    topic: brief.topic,
    specificConcept: brief.specificConcept,
  });

  let connections: IahConnectionSuggestion[] = [];
  if (brief.educationLevel && brief.grade) {
    const provider = getCurriculumConnectionProvider();
    const { context } = await provider.identifyConceptContext({
      term: brief.specificConcept ?? brief.topic,
      educationLevel: brief.educationLevel as EducationLevel,
      grade: brief.grade,
    });
    if (context.hasReliableMatch) {
      const { connections: found } = await provider.suggestIahConnections({ context, limit: 3 });
      connections = found.map((c) => ({
        id: c.sourceConnectionEntryId ?? `custom-${c.title}`,
        title: c.title,
        rationale: c.rationale,
        confidence: c.confidence,
        custom: c.custom,
      }));
    }
  }

  return {
    skills,
    connections,
    skillsHonestMessage:
      skills.length === 0
        ? "Não encontramos uma habilidade curricular diretamente correspondente na base atual. Você pode continuar sem selecioná-la ou adicionar uma referência."
        : null,
  };
}

export type GeneratedMaterialDraft =
  | { materialType: "lesson_plan"; draft: LessonPlanDraft }
  | { materialType: "infographic"; draft: InfographicDraft }
  | { materialType: "mind_map"; draft: MindMapDraft }
  | { materialType: "slides"; redirectToSlides: true };

/** Roteia para o gerador certo — slides reaproveita o wizard existente (redirecionamento com prefill), os demais geram rascunho aqui mesmo. */
export async function generateLessonMaterialAction(
  brief: LessonPlanningBrief,
  materialType: SupportMaterialType,
): Promise<GeneratedMaterialDraft | { error: string }> {
  try {
    await requireTeacherWorkspace();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sessão inválida." };
  }
  if (!brief.topic) return { error: "Informe o conteúdo da aula antes de gerar o material." };

  if (materialType === "slides") return { materialType: "slides", redirectToSlides: true };
  if (materialType === "lesson_plan") return { materialType: "lesson_plan", draft: generateLessonPlanDraft(brief) };
  if (materialType === "infographic") return { materialType: "infographic", draft: generateInfographicDraft(brief) };
  return { materialType: "mind_map", draft: generateMindMapDraft(brief) };
}

export type LessonPlanSection = LessonPlanRewriteSection;

/**
 * Reescreve só a seção pedida do Plano de aula (nunca o rascunho
 * inteiro) — chama o mesmo gerador determinístico e o chamador
 * descarta as demais seções do resultado, preservando as edições do
 * professor nas outras partes.
 */
export async function rewriteLessonPlanSectionAction(
  brief: LessonPlanningBrief,
  section: LessonPlanSection,
): Promise<{ success: true; draft: LessonPlanDraft } | { error: string }> {
  try {
    await requireTeacherWorkspace();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sessão inválida." };
  }
  if (!brief.topic) return { error: "Informe o conteúdo da aula antes de reescrever." };
  // `section` decide, do lado do cliente, qual parte do rascunho é substituída
  // (`mergeLessonPlanSection`) — o gerador em si é sempre determinístico e
  // barato, então recria o rascunho inteiro e descarta o que não foi pedido.
  void section;
  return { success: true, draft: generateLessonPlanDraft(brief) };
}

/**
 * Salva como rascunho ("draft") — status novo, `type` também pode ser
 * novo ("lesson_plan"/"infographic"/"mind_map"). Contra o banco real
 * (Supabase), só funciona depois que a migration
 * `20260724001500_docentiah_planner_materials.sql` for aplicada
 * (não é automático); contra o repositório seed/demo, funciona já.
 */
export async function saveLessonDraftAction(
  brief: LessonPlanningBrief,
  materialType: SupportMaterialType,
  draft: LessonPlanDraft | InfographicDraft | MindMapDraft,
  title: string,
): Promise<{ success: true; materialId: string } | { error: string }> {
  let workspace: WorkspaceContext & { user: { teacherId: string } };
  try {
    workspace = await requireTeacherWorkspace();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sessão inválida." };
  }

  const repositories = getDefaultDocentiahRepositories();
  const now = new Date().toISOString();
  const materialId = crypto.randomUUID();
  try {
    await repositories.materials.save(workspace.institution.id, {
      id: materialId,
      institutionId: workspace.institution.id,
      teacherId: workspace.user.teacherId,
      type: materialType,
      title,
      subjectId: null,
      classroomId: brief.classroomId ?? null,
      status: "draft",
      inputData: brief,
      outputData: draft,
      promptVersion: "lesson-brief-extractor.v1",
      provider: "iah-demo",
      model: "docentiah-planner-demo-v1",
      webSearchUsed: false,
      pdfUsed: false,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível salvar o rascunho agora." };
  }
  return { success: true, materialId };
}
