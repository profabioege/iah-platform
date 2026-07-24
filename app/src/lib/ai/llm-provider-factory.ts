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

/**
 * Timeout por capability (achado do gate de 2026-07-24: 10s abortou uma
 * geração real em andamento). 25s — dentro da faixa avaliada (20–30s),
 * sem exagerar: o professor já vê um estado de carregamento, e o
 * wrapper resiliente ainda faz 1 retry em cima disso para falha
 * transitória, nunca para 4xx permanente (payment/auth/request/model).
 */
const CAPABILITY_TIMEOUT_MS: Record<string, number> = {
  [DEEPSEEK_CAPABILITY]: 25_000,
};
const DEFAULT_CAPABILITY_TIMEOUT_MS = 25_000;

/** Exportado só para teste direto (Etapa 6, item 13) — evita esperar 25s num teste para provar que o valor é esse. */
export function getTimeoutMsForCapability(capability: string): number {
  return CAPABILITY_TIMEOUT_MS[capability] ?? DEFAULT_CAPABILITY_TIMEOUT_MS;
}

export class AiProviderConfigurationError extends Error {}

function isDeepSeekEnabled(): boolean {
  return process.env.IAH_AI_DEEPSEEK_ENABLED === "true";
}

function getDeepSeekProvider(capability: string): LlmProvider {
  return createDeepSeekProvider({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    // Nome de modelo vigente na documentação DeepSeek no momento desta implementação —
    // verificar antes de ativar em produção (docs/AI_PROVIDER_GATEWAY.md, nota de honestidade).
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    timeoutMs: getTimeoutMsForCapability(capability),
  });
}

export function getLlmProvider(capability: string): LlmProvider {
  if (capability !== DEEPSEEK_CAPABILITY || !isDeepSeekEnabled()) {
    return demoLlmProvider;
  }

  const deepseek = getDeepSeekProvider(capability);
  if (!deepseek.isConfigured) {
    // IAH_AI_DEEPSEEK_ENABLED=true exige DeepSeek explicitamente — configuração ausente
    // aqui é erro de operação, não cai silenciosamente no demonstrativo (Fase 6).
    throw new AiProviderConfigurationError(
      "IAH_AI_DEEPSEEK_ENABLED está ativo, mas DEEPSEEK_API_KEY não está configurada. " +
        "Defina a chave em app/.env.local ou desative a flag.",
    );
  }

  return createResilientProvider({
    // Circuito isolado por provider + capability (achado do gate de
    // 2026-07-24) — hoje só uma capability usa a DeepSeek, mas a chave
    // já evita que uma 2ª capability real futura contamine esta.
    providerId: `deepseek:${capability}`,
    primary: deepseek,
    fallback: demoLlmProvider,
  });
}
