import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from "../llm-provider";
import { classifyClientErrorStatus, extractProviderErrorDetails, ProviderConfigError } from "../provider-config-error.ts";
import { ProviderTransportError } from "../provider-transport-error.ts";

/**
 * Adaptador real do IAH AI Gateway para a DeepSeek — API compatível com
 * o formato OpenAI (`/chat/completions`), por isso usa só `fetch` nativo
 * server-side, sem SDK. Único adaptador real do produto até aqui (ver
 * docs/AI_PROVIDER_GATEWAY.md); desligado por padrão via
 * `IAH_AI_DEEPSEEK_ENABLED` (lib/ai/llm-provider-factory.ts).
 *
 * Payload mínimo revisado em 2026-07-24 (achado do gate real: HTTP 400
 * "invalid_request"). Causa raiz confirmada em duas fontes independentes
 * (api-docs.deepseek.com + changelog): `deepseek-chat`/`deepseek-reasoner`
 * foram descontinuados hoje, 2026-07-24 15:59 UTC, migrando para
 * `deepseek-v4-flash`/`deepseek-v4-pro`; e o payload não declarava
 * `thinking`, então podia cair em modo "thinking" — que não aceita
 * `temperature` (removido do payload mínimo).
 *
 * Preço público consultado nesta implementação (pode mudar — não é
 * fonte de verdade de billing real, só uma estimativa de custo para o
 * `GenerationUsage`): ~US$0,14 / 1M tokens de entrada, ~US$0,28 / 1M de saída.
 */

const DEEPSEEK_INPUT_PRICE_PER_MILLION_USD = 0.14;
const DEEPSEEK_OUTPUT_PRICE_PER_MILLION_USD = 0.28;

/** Timeout por capability é resolvido em `llm-provider-factory.ts` — este é só o piso se nada for passado. */
const DEFAULT_TIMEOUT_MS = 25_000;

const DEFAULT_MAX_TOKENS = 800;

/** IDs atuais (verificados em api-docs.deepseek.com em 2026-07-24) — deepseek-v4-flash é o padrão econômico do IAH. */
export const CURRENT_DEEPSEEK_MODELS = ["deepseek-v4-flash", "deepseek-v4-pro"];
/** Descontinuados em 2026-07-24 15:59 UTC — rejeitados localmente antes de gastar uma chamada de rede. */
export const LEGACY_DEEPSEEK_MODELS = ["deepseek-chat", "deepseek-reasoner"];

export interface DeepSeekProviderConfig {
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
  timeoutMs?: number;
  maxTokens?: number;
}

export interface DeepSeekRequestBody {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  response_format: { type: "json_object" };
  max_tokens: number;
  stream: false;
  thinking: { type: "disabled" };
}

/** Erro de validação LOCAL — nunca chega a sair para a rede. Nunca é retryable/fallback-eligible (não é ProviderTransportError). */
export class InvalidDeepSeekRequestError extends Error {}

/** Contrato mínimo pedido para docentiah.improve_context — sem tools/tool_choice/reasoning_effort/prefix/stop/arquivos. */
export function buildDeepSeekRequestBody(
  request: LlmCompletionRequest,
  model: string,
  maxTokens: number = DEFAULT_MAX_TOKENS,
): DeepSeekRequestBody {
  return {
    model,
    messages: [
      { role: "system", content: request.systemInstructions },
      { role: "user", content: request.userPrompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: maxTokens,
    stream: false,
    thinking: { type: "disabled" },
  };
}

const ALLOWED_BODY_KEYS = new Set(["model", "messages", "response_format", "max_tokens", "stream", "thinking"]);

/** Validação local do body — roda sempre antes do `fetch`, nunca depois. */
export function validateDeepSeekRequestBody(body: DeepSeekRequestBody): void {
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) throw new InvalidDeepSeekRequestError(`Propriedade "${key}" está undefined — remova em vez de enviar.`);
    if (!ALLOWED_BODY_KEYS.has(key)) {
      throw new InvalidDeepSeekRequestError(`Propriedade "${key}" não faz parte do contrato mínimo desta capability.`);
    }
  }
  if (LEGACY_DEEPSEEK_MODELS.includes(body.model)) {
    throw new InvalidDeepSeekRequestError(
      `Modelo "${body.model}" é um nome legado, descontinuado em 2026-07-24 — use deepseek-v4-flash ou deepseek-v4-pro.`,
    );
  }
  if (!CURRENT_DEEPSEEK_MODELS.includes(body.model)) {
    throw new InvalidDeepSeekRequestError(`Modelo "${body.model}" não está na lista de modelos atuais permitidos.`);
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new InvalidDeepSeekRequestError("messages precisa ter pelo menos 1 item.");
  }
  for (const message of body.messages) {
    if (typeof message.content !== "string") {
      throw new InvalidDeepSeekRequestError("Todo message.content precisa ser string.");
    }
  }
  if (!body.response_format || body.response_format.type !== "json_object") {
    throw new InvalidDeepSeekRequestError('response_format precisa ser exatamente {"type":"json_object"}.');
  }
  if (!Number.isInteger(body.max_tokens) || body.max_tokens <= 0) {
    throw new InvalidDeepSeekRequestError("max_tokens precisa ser um inteiro positivo.");
  }
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

      const body = buildDeepSeekRequestBody(request, config.model, config.maxTokens);
      validateDeepSeekRequestBody(body); // local, nunca sai para a rede se falhar

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
          body: JSON.stringify(body),
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
        const errorDetails = await readErrorDetailsSafely(response);
        throw new ProviderConfigError(classifyClientErrorStatus(response.status), "deepseek", response.status, errorDetails);
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

/** Lê o corpo do erro só para extrair type/param/code — nunca lança se o corpo não for JSON, nunca guarda o texto bruto. */
async function readErrorDetailsSafely(response: Response) {
  try {
    const data: unknown = await response.json();
    return extractProviderErrorDetails(data);
  } catch {
    return null;
  }
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
