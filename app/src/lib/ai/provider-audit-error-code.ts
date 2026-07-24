import { AiGenerationError } from "./gateway.ts";
import { AiProviderConfigurationError } from "./llm-provider-factory.ts";
import { ProviderConfigError } from "./provider-config-error.ts";
import { ProviderTransportError } from "./provider-transport-error.ts";

/**
 * Código sanitizado para auditoria técnica (Etapa 3 do gate de
 * 2026-07-24) — nunca o texto do erro, nunca prompt/resposta. Antes
 * desta função, qualquer falha da DeepSeek virava "unknown_error"/
 * "ai_generation_error" genérico e a causa raiz não dava pra
 * reconstruir depois de acontecer (foi exatamente o que aconteceu no
 * gate anterior). Chamada só em `catch`, nunca durante o fluxo normal.
 */
export type ProviderAuditErrorCode =
  | "timeout"
  | "circuit_breaker_open"
  | "rate_limit"
  | "payment_required"
  | "invalid_api_key"
  | "invalid_request"
  | "model_not_found"
  | "provider_5xx"
  | "network_error"
  | "empty_response"
  | "invalid_json"
  | "missing_configuration"
  | "ai_generation_error"
  | "unknown_client_error"
  | "unknown_error";

export function classifyProviderError(error: unknown): ProviderAuditErrorCode {
  if (error instanceof ProviderTransportError) return error.reason;
  if (error instanceof ProviderConfigError) return error.code;
  if (error instanceof AiProviderConfigurationError) return "missing_configuration";
  if (error instanceof AiGenerationError) return "ai_generation_error";
  return "unknown_error";
}
