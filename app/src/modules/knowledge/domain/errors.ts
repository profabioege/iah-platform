/**
 * Erros tipados da persistência de referências oficiais — mesmo padrão
 * de `modules/jobs/domain/errors.ts`.
 */

/**
 * Já existe uma referência oficial com a mesma chave natural (título +
 * edição + data de publicação) mas com um checksum diferente do que foi
 * fornecido agora. Nunca sobrescreve — quem chamou precisa decidir
 * explicitamente (nova edição de verdade? erro de digitação na edição?).
 */
export class OfficialReferenceChecksumConflictError extends Error {
  constructor(title: string, edition: string, publicationDate: string) {
    super(
      `Já existe uma referência oficial "${title}" (edição "${edition}", ` +
        `${publicationDate}) com um checksum diferente do documento fornecido. ` +
        `Não sobrescrito — confirme se é uma correção do mesmo conteúdo ou uma edição nova.`,
    );
    this.name = "OfficialReferenceChecksumConflictError";
  }
}

/**
 * A contagem de unidades persistidas não bateu com a quantidade extraída
 * pelo importador — sinal de falha parcial que não deve ser possível
 * (a transação inteira é revertida antes deste erro propagar).
 */
export class OfficialReferenceUnitCountMismatchError extends Error {
  constructor(documentId: string, expected: number, actual: number) {
    super(
      `Documento ${documentId}: esperava ${expected} unidades persistidas, encontrou ${actual}.`,
    );
    this.name = "OfficialReferenceUnitCountMismatchError";
  }
}

/**
 * Guarda defensiva: o mesmo `documentId` (derivado do checksum) já existe
 * com um checksum diferente — só possível por colisão do prefixo de hash
 * truncado usado no id, nunca esperado na prática.
 */
export class OfficialReferenceIdCollisionError extends Error {
  constructor(documentId: string) {
    super(
      `documentId "${documentId}" já existe com um checksum diferente — ` +
        `possível colisão do prefixo de hash usado no id.`,
    );
    this.name = "OfficialReferenceIdCollisionError";
  }
}
