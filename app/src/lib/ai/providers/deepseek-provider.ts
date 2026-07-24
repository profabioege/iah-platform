import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from "../llm-provider";
import { classifyClientErrorStatus, ProviderConfigError } from "../provider-config-error.ts";
import { ProviderTransportError } from "../provider-transport-error.ts";

/**
 * Adaptador real do IAH AI Gateway para a DeepSeek — API compatível com
 * o formato OpenAI (`/chat/completions`), por isso usa só `fetch` nativo
 * server-side, sem SDK. Único adaptador real do produto até aqui (ver
 * docs/AI_PROVIDER_GATEWAY.md); desligado por padrão via
 * `IAH_AI_DEEPSEEK_ENABLED` (lib/ai/llm-provider-factory.ts).
 *
 * Preço público consultado nesta implementação (pode mudar — não é
 * fonte de verdade de billing real, só uma estimativa de custo para o
 * `GenerationUsage`): ~US$0,14 / 1M tokens de entrada, ~US$0,28 / 1M de saída.
 */

const DEEPSEEK_INPUT_PRICE_PER_MILLION_USD = 0.14;
const DEEPSEEK_OUTPUT_PRICE_PER_MILLION_USD = 0.28;

/** Timeout único para a única capability roteada à DeepSeek hoje (docentiah.improve_context, ver docs/AI_PROVIDER_GATEWAY.md §7). */
const DEFAULT_TIMEOUT_MS = 10_000;

export interface DeepSeekProviderConfig {
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
  timeoutMs?: number;
}

function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * DEEPSEEK_INPUT_PRICE_PER_MILLION_USD +
    (outputTokens / 1_000_000) * DEEPSEEK_OUTPUT_PRICE_PER_MILLION_USD
  );
}

/** Fábrica pura — recebe config em vez de ler `process.env` diretamente, para poder ser testada com transporte mockado. */
export function createDeepSeekProvider(config: DeepSeekProviderConfig): LlmProvider {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    name: "deepseek",
    model: config.model,
    isConfigured: Boolean(config.apiKey),

    async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
      if (!config.apiKey) {
        // Nunca deveria ser chamado sem chave — `llm-provider-factory.ts` barra isso antes. Defesa em profundidade, não um caminho esperado.
        throw new Error("DeepSeekProvider chamado sem DEEPSEEK_API_KEY configurada.");
      }

      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: "system", content: request.systemInstructions },
              { role: "user", content: request.userPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
          }),
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new ProviderTransportError("timeout", "deepseek", `Timeout de ${timeoutMs}ms excedido.`);
        }
        // Sem detalhe da causa no log — pode conter informação de rede/infra, não do texto do professor, mas ainda assim mínimo necessário.
        throw new ProviderTransportError("network_error", "deepseek", "Falha de rede ao chamar a DeepSeek.");
      } finally {
        clearTimeout(timeoutHandle);
      }

      if (response.status === 429) {
        throw new ProviderTransportError("rate_limit", "deepseek", "DeepSeek retornou 429 (rate limit).");
      }
      if (response.status >= 500) {
        throw new ProviderTransportError("provider_5xx", "deepseek", `DeepSeek retornou ${response.status}.`);
      }
      if (!response.ok) {
        // 4xx que não é rate limit (ex.: 401 chave inválida, 402 saldo, 404 modelo) — permanente, nunca cai em retry/fallback/circuit breaker.
        throw new ProviderConfigError(classifyClientErrorStatus(response.status), "deepseek", response.status);
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new ProviderTransportError("invalid_json", "deepseek", "Corpo da resposta HTTP não é JSON válido.");
      }

      const content = extractContent(data);
      if (!content || !content.trim()) {
        throw new ProviderTransportError("empty_response", "deepseek", "DeepSeek devolveu conteúdo vazio.");
      }

      const usage = extractUsage(data);

      return {
        raw: content,
        provider: "deepseek",
        model: config.model,
        usage: usage
          ? {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              estimatedCostUsd: estimateCostUsd(usage.inputTokens, usage.outputTokens),
            }
          : undefined,
      };
    },
  };
}

function extractContent(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const message = (choices[0] as { message?: unknown })?.message;
  if (typeof message !== "object" || message === null) return null;
  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : null;
}

function extractUsage(data: unknown): { inputTokens: number; outputTokens: number } | null {
  if (typeof data !== "object" || data === null) return null;
  const usage = (data as { usage?: unknown }).usage;
  if (typeof usage !== "object" || usage === null) return null;
  const promptTokens = (usage as { prompt_tokens?: unknown }).prompt_tokens;
  const completionTokens = (usage as { completion_tokens?: unknown }).completion_tokens;
  if (typeof promptTokens !== "number" || typeof completionTokens !== "number") return null;
  return { inputTokens: promptTokens, outputTokens: completionTokens };
}
