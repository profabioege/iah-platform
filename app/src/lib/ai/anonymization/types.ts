/**
 * Contratos da política de anonimização em camadas (docs/AI_PROVIDER_GATEWAY.md §8,
 * achado da homologação de 2026-07-24: nomes próprios não eram mascarados).
 */

export type PersonRole = "aluno" | "professor" | "responsavel" | "equipe";

/** Nome vinculado à instituição, obtido só no servidor — nunca sai da requisição atual. */
export interface KnownPersonName {
  fullName: string;
  role: PersonRole;
}

export type AnonymizationSensitiveType =
  | "email"
  | "cpf"
  | "telefone"
  | "nome_pessoal"
  | "dado_saude_pessoa_identificavel";

/**
 * Nunca inclui o nome original — só o alias, o papel e como foi encontrado.
 * É seguro registrar este objeto inteiro em log (mas mesmo assim não fazemos isso).
 */
export interface AnonymizationReplacement {
  alias: string;
  role: PersonRole | "pessoa";
  matchedVia: "known_name" | "contextual_pattern";
}

export interface AnonymizationResult {
  sanitizedText: string;
  replacements: AnonymizationReplacement[];
  detectedSensitiveTypes: AnonymizationSensitiveType[];
  /** Nomes com contexto pessoal claro ("a aluna X") que não bateram com o cadastro institucional — não mascarados, só sinalizados. */
  unresolvedPersonalNames: string[];
  safeToSend: boolean;
  warnings: string[];
}
