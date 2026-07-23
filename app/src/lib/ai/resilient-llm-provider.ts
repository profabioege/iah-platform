import { circuitBreaker } from "./circuit-breaker.ts";
import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from "./llm-provider";
import { ProviderTransportError } from "./provider-transport-error.ts";

/**
 * Combina `FallbackPolicy` + `RetryPolicy` + `CircuitBreaker` propostos na
 * auditoria num único wrapper pragmático — a única capability real hoje
 * (`docentiah.improve_context`) não precisa do `CapabilityRouter`/
 * `ProviderRegistry` genéricos ainda; isso volta quando um segundo
 * provider/capability real entrar (ver docs/AI_PROVIDER_GATEWAY.md §11).
 *
 * Política: 1 tentativa no `primary` → se falha de transporte (timeout,
 * rede, 429, 5xx, resposta vazia ou corpo que nem é JSON), 1 nova
 * tentativa → se falhar de novo, registra a falha no circuit breaker e
 * cai no `fallback` (nunca lança erro cru para o professor). Falha de
 * validação/autenticação (ex.: chave inválida) não é `ProviderTransportError`
 * — propaga direto, sem retry nem fallback (política da Fase 6).
 */
export function createResilientProvider(options: {
  providerId: string;
  primary: LlmProvider;
  fallback: LlmProvider;
}): LlmProvider {
  const { providerId, primary, fallback } = options;

  async function attemptPrimary(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const result = await primary.complete(request);
    if (!isParseableJson(result.raw)) {
      throw new ProviderTransportError("empty_response", providerId, "Resposta não é um JSON válido.");
    }
    return result;
  }

  return {
    name: primary.name,
    model: primary.model,
    isConfigured: primary.isConfigured,

    async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
      if (circuitBreaker.stateFor(providerId) === "open") {
        return fallback.complete(request);
      }

      try {
        const result = await attemptPrimary(request);
        circuitBreaker.reportSuccess(providerId);
        return result;
      } catch (error) {
        if (!(error instanceof ProviderTransportError)) throw error;

        try {
          const retryResult = await attemptPrimary(request);
          circuitBreaker.reportSuccess(providerId);
          return retryResult;
        } catch (retryError) {
          if (!(retryError instanceof ProviderTransportError)) throw retryError;
          circuitBreaker.reportFailure(providerId);
          return fallback.complete(request);
        }
      }
    },
  };
}

function isParseableJson(raw: string): boolean {
  if (!raw || !raw.trim()) return false;
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}
