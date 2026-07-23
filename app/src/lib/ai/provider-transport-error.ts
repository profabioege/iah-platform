/**
 * Falha de transporte de um provedor real — nunca erro de conteúdo/schema
 * (isso continua sendo o reparo de JSON do Gateway, ver `gateway.ts`).
 * Contrato equivalente ao `TransportFailureReason` proposto na auditoria
 * (`docs/ai-provider-gateway-interfaces.ts`), estendido com
 * "empty_response" — a documentação do DeepSeek alerta que o corpo de
 * uma resposta JSON pode ocasionalmente vir vazio, caso distinto de um
 * erro HTTP.
 */
export type TransportFailureReason =
  | "timeout"
  | "network_error"
  | "rate_limited"
  | "server_error"
  | "empty_response"
  | "circuit_open";

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
