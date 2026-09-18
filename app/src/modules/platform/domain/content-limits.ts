/**
 * Limites do que o aluno grava.
 *
 * Existem por dois motivos, nenhum pedagógico: um campo de texto sem
 * limite é porta de abuso (uma requisição pode tentar gravar megabytes) e
 * o banco não deve receber conteúdo que a tela nunca mostraria. Os
 * valores são generosos para o uso real — um Relatório de Auditoria
 * inteiro cabe com folga — e a mensagem de recusa é do tamanho, nunca do
 * conteúdo.
 */

export const MAX_PRODUCTION_CHARS = 20_000;
export const MAX_REFLECTION_CHARS = 5_000;

export class ContentTooLargeError extends Error {
  constructor(field: "produção" | "reflexão", limit: number) {
    super(
      `O texto da ${field} passou do limite de ${limit.toLocaleString("pt-BR")} caracteres. ` +
        "Revise antes de continuar.",
    );
    this.name = "ContentTooLargeError";
  }
}

export function assertProductionWithinLimit(content: string): string {
  if (content.length > MAX_PRODUCTION_CHARS) {
    throw new ContentTooLargeError("produção", MAX_PRODUCTION_CHARS);
  }
  return content;
}

export function assertReflectionWithinLimit(content: string): string {
  if (content.length > MAX_REFLECTION_CHARS) {
    throw new ContentTooLargeError("reflexão", MAX_REFLECTION_CHARS);
  }
  return content;
}
