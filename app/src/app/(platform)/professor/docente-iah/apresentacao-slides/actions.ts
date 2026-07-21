"use server";

import { AiGenerationError, iahAiGateway } from "@/lib/ai/gateway";
import { pdfParseTextExtractor, PdfValidationError, type PdfExtractionResult } from "@/lib/ai/pdf-text-extractor";
import {
  docentiahSlidesGenerationInputSchema,
  type DocentiahSlidesGenerationInput,
  type DocentiahSlidesGenerationOutput,
} from "@/lib/ai/prompts/docentiah/slides";
import type { DocentiahSlidesEnrichedContext } from "@/lib/ai/prompts/docentiah/slides/v1";
import { getWebSearchProvider } from "@/lib/ai/web-search-provider-factory";
import { assertMaterialOwnership, getDefaultDocentiahRepositories, type GeneratedMaterial } from "@/modules/docentiah";
import { getWorkspaceContext, type WorkspaceContext } from "@/modules/workspace";

/**
 * Server Actions do wizard de Apresentação de slides — o único ponto
 * de contato entre a UI e o IAH AI Gateway/repositórios. Nenhum
 * componente chama IA ou banco diretamente.
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

async function logUsage(
  workspace: WorkspaceContext,
  capability: string,
  provider: string,
  model: string,
  promptVersion: string,
  status: "success" | "error",
) {
  const repositories = getDefaultDocentiahRepositories();
  await repositories.usage.save(workspace.institution.id, {
    id: crypto.randomUUID(),
    institutionId: workspace.institution.id,
    userId: workspace.user.id,
    capability,
    provider,
    model,
    promptVersion,
    inputTokens: null,
    outputTokens: null,
    estimatedCost: null,
    status,
    createdAt: new Date().toISOString(),
  });
}

/** "Melhorar com IA" — reescreve só o texto de "Detalhes adicionais", capacidade separada da geração dos slides. */
export async function improveContextAction(
  text: string,
): Promise<{ improvedText: string } | { error: string }> {
  let workspace: WorkspaceContext;
  try {
    workspace = await requireWorkspace();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sessão inválida." };
  }

  const trimmed = text.trim();
  if (!trimmed) return { error: "Escreva algum texto antes de pedir para melhorar." };

  try {
    const result = await iahAiGateway.executeText("docentiah.improve_text", { text: trimmed }, {});
    await logUsage(workspace, "docentiah.improve_text", result.provider, result.model, result.promptVersion, "success");
    return { improvedText: result.text };
  } catch {
    await logUsage(workspace, "docentiah.improve_text", "iah-demo", "docentiah-demo-v1", "v1", "error");
    return { error: "Não foi possível melhorar o texto agora. Tente novamente." };
  }
}

/** Busca simples na web — um único ciclo, no máximo 5 resultados (ver `web-search-provider.ts`). */
export async function searchWebAction(query: {
  subject: string;
  grade: string;
  topic: string;
}): Promise<{ results: Array<{ title: string; summary: string; url: string; publishedAt: string | null }>; configured: boolean }> {
  try {
    await requireWorkspace();
  } catch {
    return { results: [], configured: false };
  }
  const provider = getWebSearchProvider();
  const response = await provider.search(query);
  return { results: response.results.slice(0, 5), configured: response.configured };
}

/** Extrai texto de um PDF anexado — 100% em memória, nunca gravado em disco, descartado após a resposta. */
export async function extractPdfAction(
  formData: FormData,
): Promise<PdfExtractionResult | { error: string }> {
  try {
    await requireWorkspace();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sessão inválida." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Nenhum arquivo recebido." };
  if (file.type && file.type !== "application/pdf") {
    return { error: "Só arquivos PDF são aceitos." };
  }

  try {
    const buffer = await file.arrayBuffer();
    return await pdfParseTextExtractor.extract({ name: file.name, type: file.type, buffer });
  } catch (error) {
    if (error instanceof PdfValidationError) return { error: error.message };
    return { error: "Não foi possível processar este PDF. Tente outro arquivo." };
  }
}

export interface GenerateSlidesParams {
  input: DocentiahSlidesGenerationInput;
  webSearchEnabled: boolean;
  pdfContext: { text: string; truncated: boolean; extraction: PdfExtractionResult } | null;
}

export async function generateSlidesAction(
  params: GenerateSlidesParams,
): Promise<{ material: GeneratedMaterial; output: DocentiahSlidesGenerationOutput } | { error: string }> {
  let workspace: WorkspaceContext & { user: { teacherId: string } };
  try {
    workspace = await requireTeacherWorkspace();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sessão inválida." };
  }

  const parsedInput = docentiahSlidesGenerationInputSchema.safeParse(params.input);
  if (!parsedInput.success) {
    return { error: "Alguns campos do formulário não são válidos. Revise as etapas anteriores." };
  }

  const enrichedContext: DocentiahSlidesEnrichedContext = {
    webResults: [],
    webSearchConfigured: false,
    pdfText: params.pdfContext?.text ?? null,
    pdfTruncated: params.pdfContext?.truncated ?? false,
  };

  try {
    if (params.webSearchEnabled) {
      const searchResult = await searchWebAction({
        subject: parsedInput.data.subject,
        grade: parsedInput.data.grade,
        topic: parsedInput.data.topic,
      });
      enrichedContext.webResults = searchResult.results;
      enrichedContext.webSearchConfigured = searchResult.configured;
    }

    const result = await iahAiGateway.execute<
      DocentiahSlidesGenerationInput,
      DocentiahSlidesEnrichedContext,
      DocentiahSlidesGenerationOutput
    >("docentiah.generate_slides", parsedInput.data, enrichedContext);

    await logUsage(workspace, "docentiah.generate_slides", result.provider, result.model, result.promptVersion, "success");

    const now = new Date().toISOString();
    const material: GeneratedMaterial = {
      id: crypto.randomUUID(),
      institutionId: workspace.institution.id,
      teacherId: workspace.user.teacherId,
      type: "slides",
      title: result.output.title,
      subjectId: null,
      classroomId: null,
      status: "generated",
      inputData: parsedInput.data,
      outputData: result.output,
      promptVersion: result.promptVersion,
      provider: result.provider,
      model: result.model,
      webSearchUsed: params.webSearchEnabled,
      pdfUsed: Boolean(params.pdfContext),
      createdAt: now,
      updatedAt: now,
    };

    const repositories = getDefaultDocentiahRepositories();
    await repositories.materials.save(workspace.institution.id, material);

    if (params.pdfContext) {
      await repositories.attachedContext.save({
        id: crypto.randomUUID(),
        materialId: material.id,
        type: "pdf",
        originalFilename: params.pdfContext.extraction.originalFilename,
        mimeType: "application/pdf",
        sizeBytes: 0,
        pageCount: params.pdfContext.extraction.pageCount,
        extractedCharacterCount: params.pdfContext.extraction.extractedCharacterCount,
        truncated: params.pdfContext.extraction.truncated,
        createdAt: now,
      });
    }

    return { material, output: result.output };
  } catch (error) {
    await logUsage(workspace, "docentiah.generate_slides", "iah-demo", "docentiah-demo-v1", "v1", "error");
    if (error instanceof AiGenerationError) return { error: error.message };
    return { error: "Não foi possível gerar a apresentação agora. Tente novamente." };
  }
}

export async function saveMaterialAction(
  materialId: string,
  edits: { title: string; outputData: DocentiahSlidesGenerationOutput },
): Promise<{ success: true } | { error: string }> {
  let workspace: WorkspaceContext & { user: { teacherId: string } };
  try {
    workspace = await requireTeacherWorkspace();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sessão inválida." };
  }

  const repositories = getDefaultDocentiahRepositories();
  const material = await repositories.materials.getById(workspace.institution.id, materialId);
  if (!material) return { error: "Material não encontrado." };

  try {
    assertMaterialOwnership(material, workspace.institution.id, workspace.user.teacherId);
  } catch {
    return { error: "Você não tem acesso a este material." };
  }

  await repositories.materials.save(workspace.institution.id, {
    ...material,
    title: edits.title,
    outputData: edits.outputData,
    status: "saved",
    updatedAt: new Date().toISOString(),
  });

  return { success: true };
}
