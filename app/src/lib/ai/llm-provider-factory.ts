import type { LlmProvider } from "./llm-provider";
import { demoLlmProvider } from "./providers/demo-llm-provider.ts";

/**
 * Provedor de LLM em uso pelo Gateway — hoje sempre o demonstrativo
 * (decisão da Fase 0, sem chamada externa). Trocar por um provedor
 * real (OpenAI/Anthropic/Google) é mudar só esta função — nenhuma
 * tela ou Server Action muda.
 */
export function getLlmProvider(): LlmProvider {
  return demoLlmProvider;
}
