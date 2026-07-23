/**
 * `DataAnonymizer` proposto na auditoria (`docs/AI_PROVIDER_GATEWAY.md` §8) —
 * mascara padrões óbvios de PII em texto livre do professor antes de sair
 * para um provedor externo. Determinístico e local (nunca chama IA);
 * roda antes de QUALQUER chamada de `docentiah.improve_context`, mesmo
 * quando o provider ativo é o demonstrativo — mais simples e mais seguro
 * do que condicionar a sanitização ao provider escolhido.
 */

export type DataSensitivity = "low" | "medium" | "high";

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
/**
 * Exige o "9" entre DDD e o bloco final (padrão de celular brasileiro
 * vigente) — de propósito, para não confundir um intervalo de anos de
 * conteúdo pedagógico (ex.: "1939-1945") com telefone.
 */
const PHONE_PATTERN = /\b(?:\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?9\d{4}[\s.-]?\d{4}\b/g;

export const dataAnonymizer = {
  /** Mascara e-mail, CPF e telefone — não tenta remover nomes próprios (falso-positivo alto demais para mascaramento automático). */
  sanitize(text: string, sensitivity: DataSensitivity = "low"): string {
    void sensitivity; // reservado para diferenciar o mascaramento por sensibilidade quando uma 2ª capability real precisar disso.
    return text
      .replace(EMAIL_PATTERN, "[e-mail removido]")
      .replace(CPF_PATTERN, "[CPF removido]")
      .replace(PHONE_PATTERN, "[telefone removido]");
  },
};
