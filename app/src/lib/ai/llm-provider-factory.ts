import type { LlmProvider } from "./llm-provider";
import { createDeepSeekProvider } from "./providers/deepseek-provider.ts";
import { demoLlmProvider } from "./providers/demo-llm-provider.ts";
import { createResilientProvider } from "./resilient-llm-provider.ts";

/**
 * Único ponto de troca de provider do Gateway — mesmo espírito de sempre
 * (D-016/M0), agora com roteamento por capability (`CapabilityRouter`
 * mínimo, ver docs/AI_PROVIDER_GATEWAY.md §11): só
 * `docentiah.improve_context` pode ir para a DeepSeek; toda outra
 * capability continua no demonstrativo sem nenhuma mudança de
 * comportamento.
 */

const DEEPSEEK_CAPABILITY = "docentiah.improve_context";

export class AiProviderConfigurationError extends Error {}

function isDeepSeekEnabled(): boolean {
  return process.env.IAH_AI_DEEPSEEK_ENABLED === "true";
}

function getDeepSeekProvider(): LlmProvider {
  return createDeepSeekProvider({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    // Nome de modelo vigente na documentação DeepSeek no momento desta implementação —
    // verificar antes de ativar em produção (docs/AI_PROVIDER_GATEWAY.md, nota de honestidade).
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  });
}

export function getLlmProvider(capability: string): LlmProvider {
  if (capability !== DEEPSEEK_CAPABILITY || !isDeepSeekEnabled()) {
    return demoLlmProvider;
  }

  const deepseek = getDeepSeekProvider();
  if (!deepseek.isConfigured) {
    // IAH_AI_DEEPSEEK_ENABLED=true exige DeepSeek explicitamente — configuração ausente
    // aqui é erro de operação, não cai silenciosamente no demonstrativo (Fase 6).
    throw new AiProviderConfigurationError(
      "IAH_AI_DEEPSEEK_ENABLED está ativo, mas DEEPSEEK_API_KEY não está configurada. " +
        "Defina a chave em app/.env.local ou desative a flag.",
    );
  }

  return createResilientProvider({
    providerId: "deepseek",
    primary: deepseek,
    fallback: demoLlmProvider,
  });
}
