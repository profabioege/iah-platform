import type { ZodType } from "zod";

/**
 * Template de prompt versionado — nunca strings de prompt espalhadas
 * pelos componentes. Cada capacidade (`docentiah.generate_slides`,
 * `docentiah.improve_text`...) registra suas versões aqui; o Gateway
 * sempre usa a mais recente por padrão.
 */
export interface PromptTemplate<TInput, TContext, TOutput> {
  id: string;
  version: string;
  capability: string;
  systemInstructions: string;
  buildUserPrompt(input: TInput, context: TContext): string;
  outputSchema: ZodType<TOutput>;
  createdAt: string;
  changeNotes: string;
}

/** Alguns templates (ex.: "melhorar com IA") não têm schema de saída estruturado — só texto. */
export interface TextPromptTemplate<TInput, TContext> {
  id: string;
  version: string;
  capability: string;
  systemInstructions: string;
  buildUserPrompt(input: TInput, context: TContext): string;
  createdAt: string;
  changeNotes: string;
}

export interface PromptTemplateRegistry {
  register<TInput, TContext, TOutput>(
    template: PromptTemplate<TInput, TContext, TOutput>,
  ): void;
  registerText<TInput, TContext>(template: TextPromptTemplate<TInput, TContext>): void;
  getLatest(capability: string): PromptTemplate<unknown, unknown, unknown>;
  getLatestText(capability: string): TextPromptTemplate<unknown, unknown>;
}

const structuredTemplates = new Map<string, PromptTemplate<unknown, unknown, unknown>[]>();
const textTemplates = new Map<string, TextPromptTemplate<unknown, unknown>[]>();

export const promptTemplateRegistry: PromptTemplateRegistry = {
  register(template) {
    const list = structuredTemplates.get(template.capability) ?? [];
    list.push(template as PromptTemplate<unknown, unknown, unknown>);
    structuredTemplates.set(template.capability, list);
  },
  registerText(template) {
    const list = textTemplates.get(template.capability) ?? [];
    list.push(template as TextPromptTemplate<unknown, unknown>);
    textTemplates.set(template.capability, list);
  },
  getLatest(capability) {
    const list = structuredTemplates.get(capability);
    const latest = list?.at(-1);
    if (!latest) throw new Error(`Nenhum prompt registrado para a capacidade "${capability}".`);
    return latest;
  },
  getLatestText(capability) {
    const list = textTemplates.get(capability);
    const latest = list?.at(-1);
    if (!latest) throw new Error(`Nenhum prompt de texto registrado para a capacidade "${capability}".`);
    return latest;
  },
};
