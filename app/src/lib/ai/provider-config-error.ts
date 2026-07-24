/**
 * Erro permanente de configuração/autenticação/requisição de um provedor
 * real — NUNCA transitório, por isso nunca é `ProviderTransportError`:
 * repetir a mesma chamada não resolve chave inválida, saldo insuficiente
 * ou payload malformado. O wrapper resiliente (`resilient-llm-provider.ts`)
 * já trata "não é ProviderTransportError" como "propaga direto, sem
 * retry, sem fallback, sem contar no circuit breaker" — este tipo só
 * formaliza isso com um código sanitizado, para auditoria e diagnóstico
 * (achado da homologação de 2026-07-24: sem isso, tudo virava "Error"
 * genérico e a causa raiz de uma falha não dava pra reconstruir depois).
 */
export type ProviderConfigErrorCode =
  | "invalid_api_key"
  | "payment_required"
  | "invalid_request"
  | "model_not_found"
  | "unknown_client_error";

/**
 * Campos estruturados do envelope de erro do provedor (formato
 * compatível com OpenAI: `{"error": {"type","param","code","message"}}`).
 * Nunca inclui `.message` do provedor — só os campos estruturais
 * (type/param/code são nomes de campo, não texto livre; ainda assim
 * cada um é truncado defensivamente, nunca ecoa o corpo da requisição).
 */
export interface ProviderErrorDetails {
  type: string | null;
  param: string | null;
  code: string | null;
}

export class ProviderConfigError extends Error {
  readonly providerId: string;
  readonly code: ProviderConfigErrorCode;
  readonly httpStatus: number;
  readonly providerDetails: ProviderErrorDetails | null;

  constructor(
    code: ProviderConfigErrorCode,
    providerId: string,
    httpStatus: number,
    providerDetails: ProviderErrorDetails | null = null,
  ) {
    super(`Erro de configuração (${code}) no provedor "${providerId}" — HTTP ${httpStatus}.`);
    this.name = "ProviderConfigError";
    this.code = code;
    this.providerId = providerId;
    this.httpStatus = httpStatus;
    this.providerDetails = providerDetails;
  }
}

const MAX_FIELD_LENGTH = 80;

function sanitizeField(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.slice(0, MAX_FIELD_LENGTH);
}

/** Lê só os campos estruturais do envelope de erro — nunca `.message` (texto livre, pode ecoar parte do corpo enviado). */
export function extractProviderErrorDetails(data: unknown): ProviderErrorDetails | null {
  if (typeof data !== "object" || data === null) return null;
  const error = (data as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return null;
  const { type, param, code } = error as { type?: unknown; param?: unknown; code?: unknown };
  return { type: sanitizeField(type), param: sanitizeField(param), code: sanitizeField(code) };
}

/** Mapeamento HTTP → código sanitizado — não presume nomes de erro do corpo da resposta, só o status. */
export function classifyClientErrorStatus(status: number): ProviderConfigErrorCode {
  if (status === 401 || status === 403) return "invalid_api_key";
  if (status === 402) return "payment_required";
  if (status === 404) return "model_not_found";
  if (status === 400 || status === 422) return "invalid_request";
  return "unknown_client_error";
}
