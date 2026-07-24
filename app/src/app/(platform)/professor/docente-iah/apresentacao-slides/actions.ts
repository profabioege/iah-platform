"use server";

import { fetchInstitutionalRoster } from "@/lib/ai/anonymization/institution-roster";
import type { AnonymizationResult } from "@/lib/ai/data-anonymizer";
import { dataAnonymizer, guardBeforeExternalCall } from "@/lib/ai/data-anonymizer";
import { AiGenerationError, iahAiGateway } from "@/lib/ai/gateway";
import { AiProviderConfigurationError } from "@/lib/ai/llm-provider-factory";
import { pdfParseTextExtractor, PdfValidationError, type PdfExtractionResult } from "@/lib/ai/pdf-text-extractor";
import { docentiahImproveContextInputSchema, type DocentiahImproveContextOutput } from "@/lib/ai/prompts/docentiah/improve-context";
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
  usage?: { inputTokens: number; outputTokens: number; estimatedCostUsd: number },
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
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    estimatedCost: usage?.estimatedCostUsd ?? null,
    status,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Metadados de auditoria de provedor (§8 da auditoria — "qual provedor
 * processou cada solicitação"). Log estruturado, nunca o texto do
 * prompt/resposta — `ProviderAuditLog` persistido (tabela própria) fica
 * para quando um segundo provider/capability real entrar; por ora isto
 * é o rastro mínimo em log de servidor.
 */
function recordProviderAudit(event: {
  institutionId: string;
  capability: string;
  provider: string;
  usedFallback: boolean;
  latencyMs: number;
  status: "success" | "error";
  errorCode?: string;
}) {
  console.info("[iah-ai-provider-audit]", JSON.stringify(event));
}

export interface ImproveContextParams {
  text: string;
  subject?: string;
  educationLevel?: DocentiahSlidesGenerationInput["educationLevel"];
  grade?: string;
}

export type ImproveContextResult =
  | (DocentiahImproveContextOutput & { usedFallback: boolean })
  | { error: string };

export type PrepareImproveContextResult =
  | { status: "blocked"; message: string }
  | { status: "needs_review"; sanitizedTextPreview: string }
  | { status: "ready" }
  | { error: string };

/**
 * Roda a política de anonimização em camadas (Camadas 1–3,
 * docs/AI_PROVIDER_GATEWAY.md §8) sobre o texto validado — nunca acessa
 * o Gateway. Reaproveitada por `prepareImproveContextAction` (prévia,
 * sem chamar IA) e `improveContextAction` (chama de novo antes da IA,
 * defesa em profundidade — nunca confia que o cliente já mandou o texto
 * anonimizado).
 */
async function analyzeImproveContextText(
  workspace: WorkspaceContext,
  text: string,
): Promise<{ analysis: AnonymizationResult; guard: ReturnType<typeof guardBeforeExternalCall> }> {
  const roster = await fetchInstitutionalRoster(workspace.institution.id, workspace.classrooms);
  const analysis = dataAnonymizer.analyze(text, { knownNames: roster });
  return { analysis, guard: guardBeforeExternalCall(analysis) };
}

/**
 * Prévia obrigatória antes de qualquer chamada de IA (Camada 4) — nunca
 * chama o Gateway. `blocked`: dado pessoal não resolvido, professor
 * precisa editar o texto. `needs_review`: anonimização automática
 * ocorreu, mostrar a prévia e pedir confirmação. `ready`: nada a
 * anonimizar, segue o fluxo direto (sem etapa extra).
 */
export async function prepareImproveContextAction(params: ImproveContextParams): Promise<PrepareImproveContextResult> {
  let workspace: WorkspaceContext;
  try {
    workspace = await requireWorkspace();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sessão inválida." };
  }

  const parsedInput = docentiahImproveContextInputSchema.safeParse({
    text: params.text.trim(),
    subject: params.subject,
    educationLevel: params.educationLevel || undefined,
    grade: params.grade,
  });
  if (!parsedInput.success) {
    const issue = parsedInput.error.issues[0];
    return { error: issue?.message ?? "Escreva algum texto antes de pedir para melhorar." };
  }

  const { analysis, guard } = await analyzeImproveContextText(workspace, parsedInput.data.text);
  if (!guard.allowed) {
    recordProviderAudit({
      institutionId: workspace.institution.id,
      capability: "docentiah.improve_context",
      provider: "none",
      usedFallback: false,
      latencyMs: 0,
      status: "error",
      errorCode: "blocked_personal_data",
    });
    return { status: "blocked", message: guard.message };
  }
  if (analysis.replacements.length > 0) {
    return { status: "needs_review", sanitizedTextPreview: analysis.sanitizedText };
  }
  return { status: "ready" };
}

/**
 * "Melhorar com IA" — reescreve só o texto de "Detalhes adicionais",
 * capacidade separada da geração dos slides. Primeira capability do
 * produto que pode rodar num provedor real (DeepSeek, atrás de
 * `IAH_AI_DEEPSEEK_ENABLED`) — desligada, o comportamento é idêntico ao
 * de antes (motor demonstrativo).
 *
 * Não aceita arquivo, não recebe contexto de aluno solto — o professor
 * digita livremente, e o texto passa pela política de anonimização em
 * camadas (Camadas 1–3) antes de qualquer chamada externa, real ou
 * demonstrativa. Se a política bloquear (`safeToSend=false`), esta
 * função nunca chama o Gateway.
 */
export async function improveContextAction(params: ImproveContextParams): Promise<ImproveContextResult> {
  let workspace: WorkspaceContext;
  try {
    workspace = await requireWorkspace();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sessão inválida." };
  }

  const parsedInput = docentiahImproveContextInputSchema.safeParse({
    text: params.text.trim(),
    subject: params.subject,
    educationLevel: params.educationLevel || undefined,
    grade: params.grade,
  });
  if (!parsedInput.success) {
    const issue = parsedInput.error.issues[0];
    return { error: issue?.message ?? "Escreva algum texto antes de pedir para melhorar." };
  }

  const { analysis, guard } = await analyzeImproveContextText(workspace, parsedInput.data.text);
  if (!guard.allowed) {
    // Bloqueado pela Camada 3 — nunca chama o Gateway, nunca usa fallback externo, texto original preservado só no cliente.
    recordProviderAudit({
      institutionId: workspace.institution.id,
      capability: "docentiah.improve_context",
      provider: "none",
      usedFallback: false,
      latencyMs: 0,
      status: "error",
      errorCode: "blocked_personal_data",
    });
    return { error: guard.message };
  }

  const sanitizedInput = { ...parsedInput.data, text: analysis.sanitizedText };
  const startedAt = Date.now();
  const wasDeepSeekRequested = process.env.IAH_AI_DEEPSEEK_ENABLED === "true";

  try {
    const result = await iahAiGateway.execute<
      typeof sanitizedInput,
      Record<string, never>,
      DocentiahImproveContextOutput
    >("docentiah.improve_context", sanitizedInput, {});

    const usedFallback = wasDeepSeekRequested && result.provider !== "deepseek";
    await logUsage(
      workspace,
      "docentiah.improve_context",
      result.provider,
      result.model,
      result.promptVersion,
      "success",
      result.usage,
    );
    recordProviderAudit({
      institutionId: workspace.institution.id,
      capability: "docentiah.improve_context",
      provider: result.provider,
      usedFallback,
      latencyMs: Date.now() - startedAt,
      status: "success",
    });

    return { ...result.output, usedFallback };
  } catch (error) {
    if (error instanceof AiProviderConfigurationError) {
      // Erro claro no log do servidor, nunca exposto ao professor (Fase 6) — sem valor de segredo na mensagem.
      console.error("[iah-ai-provider-config]", error.message);
    }
    await logUsage(workspace, "docentiah.improve_context", "iah-demo", "docentiah-demo-v1", "v1", "error");
    recordProviderAudit({
      institutionId: workspace.institution.id,
      capability: "docentiah.improve_context",
      provider: "iah-demo",
      usedFallback: false,
      latencyMs: Date.now() - startedAt,
      status: "error",
      errorCode: error instanceof AiGenerationError ? "ai_generation_error" : "unknown_error",
    });
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
