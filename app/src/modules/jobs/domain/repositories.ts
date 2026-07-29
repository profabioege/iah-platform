import type { AsyncJob } from "./entities";

/**
 * `claimNext` e as operações seguintes do worker (heartbeat, complete, fail,
 * releaseForRetry) não recebem `institutionId` como parâmetro do chamador.
 * Segue §10.4 do documento de arquitetura: "a API interna deriva o tenant
 * do job, nunca de parâmetro do worker" — a instituição vem sempre do
 * próprio registro do job (por `id`), nunca de um valor que o Hermes
 * poderia informar. A implementação futura (fora desta micro missão) deve
 * carregar o job por `id`, conferir `lockedBy === workerId` e só então
 * autorizar a escrita — nunca confiar em institutionId vindo do worker.
 */
export interface ClaimNextParams {
  workerId: string;
  capabilities: string[];
  lockDurationMs: number;
  now: string;
}

export interface HeartbeatParams {
  id: string;
  workerId: string;
  lockDurationMs: number;
  now: string;
}

/**
 * Resultado tipado do heartbeat (Micro Missão 2) — substitui o retorno
 * simples `Promise<AsyncJob>` original porque a operação tem desfechos
 * distintos que o chamador precisa distinguir sem depender de `catch`.
 *
 * Não existe desfecho "instituição incompatível": `HeartbeatParams` nunca
 * recebe `institutionId` (ver comentário acima) — não há valor do
 * chamador para comparar contra o do job, então esse caso é
 * estruturalmente impossível aqui, não apenas não verificado.
 */
export type HeartbeatResult =
  | { outcome: "renewed"; job: AsyncJob }
  | { outcome: "not_found" }
  | { outcome: "lock_lost" }
  | { outcome: "invalid_state" };

export interface CompleteParams {
  id: string;
  workerId: string;
  output: Record<string, unknown>;
  now: string;
}

export interface FailParams {
  id: string;
  workerId: string;
  errorCode: string;
  errorMessage: string;
  now: string;
}

export interface ReleaseForRetryParams {
  id: string;
  workerId: string;
  availableAt: string;
  now: string;
}

export interface AsyncJobRepository {
  /** `institutionId` sempre da sessão autenticada do produtor, nunca do payload (§4). */
  enqueue(institutionId: string, job: AsyncJob): Promise<AsyncJob>;

  findById(institutionId: string, id: string): Promise<AsyncJob | null>;

  /** Deduplicação por tenant — nunca global (`unique (institution_id, idempotency_key)`, §7.1). */
  findByIdempotencyKey(
    institutionId: string,
    idempotencyKey: string,
  ): Promise<AsyncJob | null>;

  /**
   * Reivindicação transacional (`SELECT ... FOR UPDATE SKIP LOCKED`, §9.3).
   * Retorna `null` quando não há job disponível para as capabilities do
   * worker. Implementação real fica para a missão do worker/API interna —
   * aqui é só o contrato.
   */
  claimNext(params: ClaimNextParams): Promise<AsyncJob | null>;

  /** Estende `lockExpiresAt`; resultado tipado em vez de lançar (§10.2). */
  heartbeat(params: HeartbeatParams): Promise<HeartbeatResult>;

  complete(params: CompleteParams): Promise<AsyncJob>;

  /** Falha terminal — não incrementa para retry; ver `releaseForRetry`. */
  fail(params: FailParams): Promise<AsyncJob>;

  /** Devolve o job a `queued` com `availableAt` no futuro (backoff, §9.7). */
  releaseForRetry(params: ReleaseForRetryParams): Promise<AsyncJob>;

  /** Cancelamento solicitado pelo usuário autorizado (produtor), não pelo worker. */
  cancel(institutionId: string, id: string, now: string): Promise<AsyncJob>;
}
