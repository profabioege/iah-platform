import type { ZodError } from "zod";

import { ensurePromptsRegistered } from "./register-prompts.ts";
import { getLlmProvider } from "./llm-provider-factory.ts";
import type { LlmProvider } from "./llm-provider";
import { promptTemplateRegistry, type PromptTemplate, type TextPromptTemplate } from "./prompt-template-registry.ts";

/**
 * IAH AI Gateway — único ponto de chamada de IA do produto. Nenhum
 * componente ou Server Action fala com um provedor diretamente; tudo
 * passa por `iahAiGateway.execute(capability, input, context)`. Busca
 * o template versionado da capacidade, monta o prompt, chama o
 * `LlmProvider` configurado, valida a saída com Zod e permite **uma**
 * tentativa de reparo estrutural — nunca devolve JSON quebrado para a
 * interface.
 */

export class AiGenerationError extends Error {}

export interface AiExecutionResult<TOutput> {
  output: TOutput;
  provider: string;
  model: string;
  promptVersion: string;
}

export interface AiTextExecutionResult {
  text: string;
  provider: string;
  model: string;
  promptVersion: string;
}

function safeParseJson(raw: string): { success: true; data: unknown } | { success: false } {
  try {
    return { success: true, data: JSON.parse(raw) };
  } catch {
    return { success: false };
  }
}

function formatZodError(error: ZodError<unknown>): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "(raiz)"}: ${issue.message}`).join("; ");
}

export const iahAiGateway = {
  /**
   * Capacidades com saída estruturada (validada por Zod), ex.:
   * "docentiah.generate_slides". `providerOverride` existe só para
   * teste (injeta um `LlmProvider` fake sem depender do provedor
   * demonstrativo real) — em produção nunca é passado, o Gateway usa
   * `getLlmProvider()`.
   */
  async execute<TInput, TContext, TOutput>(
    capability: string,
    input: TInput,
    context: TContext,
    providerOverride?: LlmProvider,
  ): Promise<AiExecutionResult<TOutput>> {
    ensurePromptsRegistered();
    const template = promptTemplateRegistry.getLatest(capability) as unknown as PromptTemplate<
      TInput,
      TContext,
      TOutput
    >;
    const provider = providerOverride ?? getLlmProvider();
    const userPrompt = template.buildUserPrompt(input, context);

    async function attempt(repairNote?: string) {
      return provider.complete({
        capability,
        systemInstructions: repairNote
          ? `${template.systemInstructions}\n\n${repairNote}`
          : template.systemInstructions,
        userPrompt,
        structuredInput: input,
        structuredContext: context,
      });
    }

    let result = await attempt();
    let parsedJson = safeParseJson(result.raw);
    let validation = parsedJson.success ? template.outputSchema.safeParse(parsedJson.data) : null;

    if (!parsedJson.success || !validation?.success) {
      const problem = !parsedJson.success ? "o texto devolvido não era um JSON válido" : formatZodError(validation!.error as ZodError<unknown>);
      result = await attempt(
        `O JSON anterior estava inválido (${problem}). Responda de novo, apenas com um JSON válido que respeite integralmente o schema — sem nenhum texto fora do JSON.`,
      );
      parsedJson = safeParseJson(result.raw);
      validation = parsedJson.success ? template.outputSchema.safeParse(parsedJson.data) : null;
    }

    if (!parsedJson.success || !validation?.success) {
      throw new AiGenerationError(
        "Não foi possível gerar um resultado estruturado válido para esta solicitação. Tente novamente.",
      );
    }

    return {
      output: validation.data as TOutput,
      provider: result.provider,
      model: result.model,
      promptVersion: template.version,
    };
  },

  /** Capacidades de texto livre (sem schema de saída), ex.: "docentiah.improve_text". */
  async executeText<TInput, TContext>(
    capability: string,
    input: TInput,
    context: TContext,
    providerOverride?: LlmProvider,
  ): Promise<AiTextExecutionResult> {
    ensurePromptsRegistered();
    const template = promptTemplateRegistry.getLatestText(capability) as unknown as TextPromptTemplate<
      TInput,
      TContext
    >;
    const provider = providerOverride ?? getLlmProvider();
    const userPrompt = template.buildUserPrompt(input, context);
    const result = await provider.complete({
      capability,
      systemInstructions: template.systemInstructions,
      userPrompt,
      structuredInput: input,
      structuredContext: context,
    });
    return {
      text: result.raw.trim(),
      provider: result.provider,
      model: result.model,
      promptVersion: template.version,
    };
  },
};
