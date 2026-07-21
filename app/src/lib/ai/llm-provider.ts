/**
 * Porto do provedor de LLM do IAH AI Gateway — nenhum componente chama
 * um provedor de IA diretamente (nunca `callOpenAI()` num componente);
 * tudo passa por `LlmProvider`, injetado nos capabilities do Gateway
 * (`gateway.ts`). Mesmo espírito de `modules/mentor/domain/mentor-provider.ts`
 * (porta de conversa do Mentor IAH) — este é o porto de geração
 * estruturada usado pelas capacidades do DocentIAH.
 */

export interface LlmCompletionRequest {
  /** Capacidade que está chamando — ex.: "docentiah.generate_slides". */
  capability: string;
  systemInstructions: string;
  userPrompt: string;
  /**
   * Dados estruturados originais (input + contexto), opcionais — um
   * provedor real (OpenAI/Anthropic/Google) ignora e usa só o texto
   * acima; só o provedor demonstrativo os lê diretamente, porque não
   * interpreta linguagem natural.
   */
  structuredInput?: unknown;
  structuredContext?: unknown;
}

export interface LlmCompletionResult {
  /** Texto bruto devolvido pelo provedor — o Gateway valida/repara antes de expor. */
  raw: string;
  provider: string;
  model: string;
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  readonly isConfigured: boolean;
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResult>;
}
