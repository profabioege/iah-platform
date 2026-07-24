import { detectContextualPersonalNames, maskKnownNames } from "./anonymization/personal-name-matcher.ts";
import type { AnonymizationResult, AnonymizationSensitiveType, KnownPersonName } from "./anonymization/types.ts";

export type { AnonymizationResult, AnonymizationReplacement, AnonymizationSensitiveType, KnownPersonName, PersonRole } from "./anonymization/types.ts";

/**
 * Política de anonimização em camadas (docs/AI_PROVIDER_GATEWAY.md §8),
 * corrigida após a homologação de 2026-07-24 (nomes próprios não eram
 * mascarados — só e-mail/CPF/telefone). Determinístico e local (nunca
 * chama IA, nunca acessa rede); recebe o cadastro institucional já
 * carregado (`KnownPersonName[]`) de fora — este módulo nunca fala com o
 * banco, para continuar 100% testável sem infraestrutura.
 *
 * NÃO mascara nomes próprios indiscriminadamente (autores, cientistas,
 * personagens, lugares) — só nomes que batem com o cadastro da
 * instituição (Camada 1) ou que aparecem em contexto pessoal claro e
 * batem com o cadastro (Camada 2). Contexto pessoal sem correspondência
 * no cadastro nunca é mascarado por adivinhação — fica sinalizado em
 * `unresolvedPersonalNames` e bloqueia o envio (`safeToSend=false`).
 */

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
/**
 * Exige o "9" entre DDD e o bloco final (padrão de celular brasileiro
 * vigente) — de propósito, para não confundir um intervalo de anos de
 * conteúdo pedagógico (ex.: "1939-1945") com telefone.
 */
const PHONE_PATTERN = /\b(?:\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?9\d{4}[\s.-]?\d{4}\b/g;

/**
 * Termos clínicos/diagnósticos formais — não frases pedagógicas comuns
 * como "dificuldade com leitura" (essas continuam permitidas: descrever
 * uma necessidade de apoio pedagógico, em termos gerais, não é dado de
 * saúde). Calibrado para o que a política de dados já proíbe (§8):
 * diagnóstico, laudo ou dado sensível de aluno.
 */
const HEALTH_DIAGNOSTIC_PATTERN =
  /\b(laudo|diagn[oó]stico|CID-?10|TDAH|TEA\b|transtorno|medica[çc][ãa]o|rem[ée]dio controlado|psiqui[aá]tric[oa]|autis(mo|ta))\b/i;

export interface AnonymizeOptions {
  knownNames?: KnownPersonName[];
  strictFirstNameMatching?: boolean;
}

function detectSensitiveTypesAndMaskPii(text: string): { text: string; types: AnonymizationSensitiveType[] } {
  const types: AnonymizationSensitiveType[] = [];
  let result = text;
  if (EMAIL_PATTERN.test(result)) types.push("email");
  EMAIL_PATTERN.lastIndex = 0;
  result = result.replace(EMAIL_PATTERN, "[e-mail removido]");

  if (CPF_PATTERN.test(result)) types.push("cpf");
  CPF_PATTERN.lastIndex = 0;
  result = result.replace(CPF_PATTERN, "[CPF removido]");

  if (PHONE_PATTERN.test(result)) types.push("telefone");
  PHONE_PATTERN.lastIndex = 0;
  result = result.replace(PHONE_PATTERN, "[telefone removido]");

  return { text: result, types };
}

export const dataAnonymizer = {
  /**
   * Analisa e mascara o texto — Camada 1 (nomes cadastrados) → Camada 2
   * (padrões de contexto pessoal) → PII (e-mail/CPF/telefone) → Camada 3
   * (decide `safeToSend`). Nunca inclui nome original no resultado — só
   * alias/papel — seguro para logar `AnonymizationResult` inteiro (ainda
   * que hoje nada o faça).
   */
  analyze(text: string, options: AnonymizeOptions = {}): AnonymizationResult {
    const knownNames = options.knownNames ?? [];
    const warnings: string[] = [];

    const knownNameMasking = maskKnownNames(text, knownNames, {
      strictFirstNameMatching: options.strictFirstNameMatching,
    });
    const contextual = detectContextualPersonalNames(knownNameMasking.text, knownNames);
    const pii = detectSensitiveTypesAndMaskPii(contextual.text);

    const replacements = [...knownNameMasking.replacements, ...contextual.replacements];
    const detectedSensitiveTypes: AnonymizationSensitiveType[] = [...pii.types];
    if (replacements.length > 0) detectedSensitiveTypes.push("nome_pessoal");

    const hasHealthDiagnostic = HEALTH_DIAGNOSTIC_PATTERN.test(text);
    if (hasHealthDiagnostic) {
      detectedSensitiveTypes.push("dado_saude_pessoa_identificavel");
      warnings.push("O texto contém um termo de diagnóstico/saúde — revise antes de enviar, mesmo com nomes mascarados.");
    }

    for (const name of contextual.unresolvedPersonalNames) {
      warnings.push(`"${name}" parece um nome de pessoa, mas não corresponde ao cadastro da instituição — não foi enviado.`);
    }

    // E-mail/CPF/telefone já saem sempre mascarados de pii.text acima — a regra
    // "houver CPF/e-mail/telefone não resolvido" nunca dispara neste ponto por
    // construção; mantida como comentário, não como checagem redundante em
    // regex global com estado (`lastIndex`).
    const safeToSend = contextual.unresolvedPersonalNames.length === 0 && !hasHealthDiagnostic;

    return {
      sanitizedText: pii.text,
      replacements,
      detectedSensitiveTypes,
      unresolvedPersonalNames: contextual.unresolvedPersonalNames,
      safeToSend,
      warnings,
    };
  },
};

/** Camada 3 — gate a chamar ANTES de qualquer provedor externo (real ou demonstrativo com dado real). */
export function guardBeforeExternalCall(
  analysis: AnonymizationResult,
): { allowed: true } | { allowed: false; message: string } {
  if (analysis.safeToSend) return { allowed: true };
  return {
    allowed: false,
    message: "Identificamos informações pessoais no texto. Remova ou substitua os nomes antes de usar a melhoria com IA.",
  };
}
