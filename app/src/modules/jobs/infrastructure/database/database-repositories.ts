/**
 * Implementação DATABASE do repositório de jobs assíncronos — Supabase/
 * PostgreSQL (`app/db/migrations/0006_iah_jobs.sql`, `0007_iah_claim_next_job.sql`).
 *
 * SÓ código de servidor: usa o client administrativo (service role) — o
 * navegador nunca fala com `iah_jobs` (RLS deny-by-default, sem policies,
 * D-041). O Hermes também nunca fala com o Supabase diretamente (§10.1
 * do documento de arquitetura) — esta implementação é consumida pelo
 * backend do IAH, nunca pelo worker.
 */
import type { AsyncJob } from "../../domain/entities";
import {
  AsyncJobIdempotencyConflictError,
  AsyncJobInvalidStateError,
  AsyncJobLockLostError,
  AsyncJobNotFoundError,
} from "../../domain/errors.ts";
import type {
  AsyncJobRepository,
  ClaimNextParams,
  CompleteParams,
  FailParams,
  HeartbeatParams,
  HeartbeatResult,
  ReleaseForRetryParams,
} from "../../domain/repositories";
import type { AsyncJobsDriver, JobRow } from "./async-jobs-driver";

function toAsyncJob(r: JobRow): AsyncJob {
  return {
    id: r.id as string,
    institutionId: r.institution_id as string,
    capability: r.capability as string,
    status: r.status as AsyncJob["status"],
    idempotencyKey: r.idempotency_key as string,
    priority: r.priority as number,
    input: (r.input as Record<string, unknown>) ?? {},
    output: (r.output as Record<string, unknown> | null) ?? null,
    errorCode: (r.error_code as string | null) ?? null,
    errorMessage: (r.error_message as string | null) ?? null,
    attempts: r.attempts as number,
    maxAttempts: r.max_attempts as number,
    availableAt: r.available_at as string,
    lockedAt: (r.locked_at as string | null) ?? null,
    lockExpiresAt: (r.lock_expires_at as string | null) ?? null,
    lockedBy: (r.locked_by as string | null) ?? null,
    createdBy: (r.created_by as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    startedAt: (r.started_at as string | null) ?? null,
    completedAt: (r.completed_at as string | null) ?? null,
    failedAt: (r.failed_at as string | null) ?? null,
    cancelledAt: (r.cancelled_at as string | null) ?? null,
  };
}

function fromAsyncJob(job: AsyncJob): JobRow {
  return {
    id: job.id,
    institution_id: job.institutionId,
    capability: job.capability,
    status: job.status,
    idempotency_key: job.idempotencyKey,
    priority: job.priority,
    input: job.input,
    output: job.output,
    error_code: job.errorCode,
    error_message: job.errorMessage,
    attempts: job.attempts,
    max_attempts: job.maxAttempts,
    available_at: job.availableAt,
    locked_at: job.lockedAt,
    lock_expires_at: job.lockExpiresAt,
    locked_by: job.lockedBy,
    created_by: job.createdBy,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
    started_at: job.startedAt,
    completed_at: job.completedAt,
    failed_at: job.failedAt,
    cancelled_at: job.cancelledAt,
  };
}

/**
 * Depois que uma escrita condicional do worker (heartbeat/complete/fail/
 * releaseForRetry) afeta 0 linhas, este helper decide por quê: job
 * inexistente, estado inválido (não está em `processing`) ou lock perdido
 * (existe, está em `processing`, mas outro worker o reivindicou).
 */
async function classifyWorkerWriteMiss(
  driver: AsyncJobsDriver,
  id: string,
  workerId: string,
): Promise<"not_found" | "invalid_state" | "lock_lost"> {
  const row = await driver.selectById(id);
  if (!row) return "not_found";
  if (row.status !== "processing") return "invalid_state";
  if (row.locked_by !== workerId) return "lock_lost";
  return "lock_lost";
}

/** `driver` é sempre explícito — produção usa `getDefaultAsyncJobRepository` (repository-factory.ts); testes injetam um driver falso. */
export function createDatabaseAsyncJobRepository(
  driver: AsyncJobsDriver,
): AsyncJobRepository {
  return {
    async enqueue(institutionId, job) {
      if (job.institutionId !== institutionId) {
        throw new Error(
          "enqueue: institutionId do job não corresponde ao institutionId do chamador.",
        );
      }

      const { error } = await driver.insert(fromAsyncJob(job));

      if (!error) return job;

      // 23505 = unique_violation em (institution_id, idempotency_key):
      // outra chamada (ou uma repetição desta) já usou a mesma chave.
      const existingRow = await driver.selectByInstitutionAndIdempotencyKey(
        institutionId,
        job.idempotencyKey,
      );
      if (!existingRow) {
        throw new Error(`Banco de dados: falha em jobs.enqueue — ${error.message}`);
      }

      const existing = toAsyncJob(existingRow);
      const sameRequest =
        existing.capability === job.capability &&
        JSON.stringify(existing.input) === JSON.stringify(job.input);

      if (!sameRequest) {
        throw new AsyncJobIdempotencyConflictError(job.idempotencyKey);
      }

      return existing;
    },

    async findById(institutionId, id) {
      const row = await driver.selectByInstitutionAndId(institutionId, id);
      return row ? toAsyncJob(row) : null;
    },

    async findByIdempotencyKey(institutionId, idempotencyKey) {
      const row = await driver.selectByInstitutionAndIdempotencyKey(
        institutionId,
        idempotencyKey,
      );
      return row ? toAsyncJob(row) : null;
    },

    async claimNext(params: ClaimNextParams) {
      const row = await driver.claimNext({
        capabilities: params.capabilities,
        workerId: params.workerId,
        lockDurationSeconds: Math.ceil(params.lockDurationMs / 1000),
        now: params.now,
      });
      return row ? toAsyncJob(row) : null;
    },

    async heartbeat(params: HeartbeatParams): Promise<HeartbeatResult> {
      const lockExpiresAt = new Date(
        new Date(params.now).getTime() + params.lockDurationMs,
      ).toISOString();

      const row = await driver.renewLock({
        id: params.id,
        workerId: params.workerId,
        lockExpiresAt,
        now: params.now,
      });
      if (row) return { outcome: "renewed", job: toAsyncJob(row) };

      const reason = await classifyWorkerWriteMiss(driver, params.id, params.workerId);
      return { outcome: reason };
    },

    async complete(params: CompleteParams) {
      const row = await driver.completeJob(params);
      if (row) return toAsyncJob(row);

      const reason = await classifyWorkerWriteMiss(driver, params.id, params.workerId);
      if (reason === "not_found") throw new AsyncJobNotFoundError(params.id);
      if (reason === "lock_lost") throw new AsyncJobLockLostError(params.id);
      const current = await driver.selectById(params.id);
      throw new AsyncJobInvalidStateError(params.id, String(current?.status ?? "?"));
    },

    async fail(params: FailParams) {
      const row = await driver.failJob(params);
      if (row) return toAsyncJob(row);

      const reason = await classifyWorkerWriteMiss(driver, params.id, params.workerId);
      if (reason === "not_found") throw new AsyncJobNotFoundError(params.id);
      if (reason === "lock_lost") throw new AsyncJobLockLostError(params.id);
      const current = await driver.selectById(params.id);
      throw new AsyncJobInvalidStateError(params.id, String(current?.status ?? "?"));
    },

    async releaseForRetry(params: ReleaseForRetryParams) {
      const row = await driver.releaseForRetry(params);
      if (row) return toAsyncJob(row);

      const reason = await classifyWorkerWriteMiss(driver, params.id, params.workerId);
      if (reason === "not_found") throw new AsyncJobNotFoundError(params.id);
      if (reason === "lock_lost") throw new AsyncJobLockLostError(params.id);
      const current = await driver.selectById(params.id);
      throw new AsyncJobInvalidStateError(params.id, String(current?.status ?? "?"));
    },

    async cancel(institutionId, id, now) {
      const row = await driver.cancelJob({ institutionId, id, now });
      if (row) return toAsyncJob(row);

      const existing = await driver.selectByInstitutionAndId(institutionId, id);
      if (!existing) throw new AsyncJobNotFoundError(id);
      throw new AsyncJobInvalidStateError(id, String(existing.status ?? "?"));
    },
  };
}
