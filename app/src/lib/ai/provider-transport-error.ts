/**
 * Falha de transporte de um provedor real — sempre transitória e
 * elegível a retry único + contabilização no circuit breaker. Nunca erro
 * de conteúdo/schema (isso continua sendo o reparo de JSON do Gateway,
 * ver `gateway.ts`) nem erro de configuração/autenticação permanente
 * (ver `ProviderConfigError` em `provider-config-error.ts` — 4xx que não
 * é rate limit nunca vira `ProviderTransportError`, de propósito: não
 * adianta repetir uma chave inválida ou falta de saldo).
 *
 * Nomes alinhados à taxonomia de auditoria pedida na homologação de
 * 2026-07-24 (diagnóstico do gate DeepSeek) — usada tanto no controle
 * (retry/circuit breaker) quanto no código sanitizado de auditoria.
 */
export type TransportFailureReason =
  | "timeout"
  | "network_error"
  | "rate_limit"
  | "provider_5xx"
  | "empty_response"
  | "invalid_json"
  | "circuit_breaker_open";

export class ProviderTransportError extends Error {
  readonly providerId: string;
  readonly reason: TransportFailureReason;

  constructor(reason: TransportFailureReason, providerId: string, message?: string) {
    super(message ?? `Falha de transporte (${reason}) no provedor "${providerId}".`);
    this.name = "ProviderTransportError";
    this.reason = reason;
    this.providerId = providerId;
  }
}
