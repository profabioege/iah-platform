/** O job não existe (ou não pertence à instituição consultada). */
export class AsyncJobNotFoundError extends Error {
  constructor(id: string) {
    super(`Job assíncrono não encontrado: ${id}`);
    this.name = "AsyncJobNotFoundError";
  }
}

/** O worker informado não é (mais) o proprietário do lock do job. */
export class AsyncJobLockLostError extends Error {
  constructor(id: string) {
    super(`Lock perdido ou worker não é o proprietário do job: ${id}`);
    this.name = "AsyncJobLockLostError";
  }
}

/** O job existe, mas seu status atual não permite esta operação. */
export class AsyncJobInvalidStateError extends Error {
  constructor(id: string, status: string) {
    super(
      `Job ${id} não está em estado válido para esta operação (status atual: ${status}).`,
    );
    this.name = "AsyncJobInvalidStateError";
  }
}

/** A mesma idempotencyKey já foi usada, nesta instituição, com capability ou payload diferente. */
export class AsyncJobIdempotencyConflictError extends Error {
  constructor(idempotencyKey: string) {
    super(
      `idempotencyKey "${idempotencyKey}" já foi usada nesta instituição com capability ou payload diferente.`,
    );
    this.name = "AsyncJobIdempotencyConflictError";
  }
}
