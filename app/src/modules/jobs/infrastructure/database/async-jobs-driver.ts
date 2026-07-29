/**
 * Fronteira estreita entre o repositório de jobs e o Postgres/Supabase.
 *
 * Só existe para tornar o repositório testável sem banco: os testes
 * injetam um driver falso (array em memória); a produção usa
 * `createSupabaseAsyncJobsDriver`, que fala com `iah_jobs` de verdade.
 * Cada método aqui é uma única instrução SQL (INSERT ou UPDATE ...
 * WHERE ... RETURNING), já atômica por linha — nenhum deles precisa de
 * transação explícita. A única exceção é `claimNext`, que exige
 * `SELECT ... FOR UPDATE SKIP LOCKED` (inalcançável pelo query builder
 * REST do Supabase) e por isso chama a função SQL `iah_claim_next_job`
 * (migration 0007) via `.rpc()`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type JobRow = Record<string, unknown>;

export interface InsertError {
  code?: string;
  message: string;
}

export interface ClaimNextDriverParams {
  capabilities: string[];
  workerId: string;
  lockDurationSeconds: number;
  now: string;
}

export interface RenewLockParams {
  id: string;
  workerId: string;
  lockExpiresAt: string;
  now: string;
}

export interface CompleteJobParams {
  id: string;
  workerId: string;
  output: Record<string, unknown>;
  now: string;
}

export interface FailJobParams {
  id: string;
  workerId: string;
  errorCode: string;
  errorMessage: string;
  now: string;
}

export interface ReleaseForRetryDriverParams {
  id: string;
  workerId: string;
  availableAt: string;
  now: string;
}

export interface CancelJobParams {
  institutionId: string;
  id: string;
  now: string;
}

export interface AsyncJobsDriver {
  insert(row: JobRow): Promise<{ error: InsertError | null }>;
  selectByInstitutionAndId(
    institutionId: string,
    id: string,
  ): Promise<JobRow | null>;
  selectByInstitutionAndIdempotencyKey(
    institutionId: string,
    idempotencyKey: string,
  ): Promise<JobRow | null>;
  /** Sem institutionId — usado só para classificar por que uma escrita do worker afetou 0 linhas. */
  selectById(id: string): Promise<JobRow | null>;
  claimNext(params: ClaimNextDriverParams): Promise<JobRow | null>;
  renewLock(params: RenewLockParams): Promise<JobRow | null>;
  completeJob(params: CompleteJobParams): Promise<JobRow | null>;
  failJob(params: FailJobParams): Promise<JobRow | null>;
  releaseForRetry(params: ReleaseForRetryDriverParams): Promise<JobRow | null>;
  cancelJob(params: CancelJobParams): Promise<JobRow | null>;
}

function fail(operation: string, message: string): never {
  throw new Error(`Banco de dados: falha em ${operation} — ${message}`);
}

export function createSupabaseAsyncJobsDriver(
  db: SupabaseClient,
): AsyncJobsDriver {
  const table = "iah_jobs";

  return {
    async insert(row) {
      const { error } = await db.from(table).insert(row);
      if (error && error.code !== "23505") fail("jobs.insert", error.message);
      return { error: error ? { code: error.code, message: error.message } : null };
    },

    async selectByInstitutionAndId(institutionId, id) {
      const { data, error } = await db
        .from(table)
        .select("*")
        .eq("institution_id", institutionId)
        .eq("id", id)
        .limit(1);
      if (error) fail("jobs.selectByInstitutionAndId", error.message);
      return (data?.[0] as JobRow | undefined) ?? null;
    },

    async selectByInstitutionAndIdempotencyKey(institutionId, idempotencyKey) {
      const { data, error } = await db
        .from(table)
        .select("*")
        .eq("institution_id", institutionId)
        .eq("idempotency_key", idempotencyKey)
        .limit(1);
      if (error) fail("jobs.selectByInstitutionAndIdempotencyKey", error.message);
      return (data?.[0] as JobRow | undefined) ?? null;
    },

    async selectById(id) {
      const { data, error } = await db.from(table).select("*").eq("id", id).limit(1);
      if (error) fail("jobs.selectById", error.message);
      return (data?.[0] as JobRow | undefined) ?? null;
    },

    async claimNext({ capabilities, workerId, lockDurationSeconds, now }) {
      const { data, error } = await db.rpc("iah_claim_next_job", {
        p_capabilities: capabilities,
        p_worker_id: workerId,
        p_lock_duration_seconds: lockDurationSeconds,
        p_now: now,
      });
      if (error) fail("jobs.claimNext", error.message);
      const rows = (data as JobRow[] | null) ?? [];
      return rows[0] ?? null;
    },

    async renewLock({ id, workerId, lockExpiresAt, now }) {
      const { data, error } = await db
        .from(table)
        .update({ lock_expires_at: lockExpiresAt, updated_at: now })
        .eq("id", id)
        .eq("locked_by", workerId)
        .eq("status", "processing")
        .select("*");
      if (error) fail("jobs.renewLock", error.message);
      return (data?.[0] as JobRow | undefined) ?? null;
    },

    async completeJob({ id, workerId, output, now }) {
      const { data, error } = await db
        .from(table)
        .update({
          status: "succeeded",
          output,
          error_code: null,
          error_message: null,
          completed_at: now,
          updated_at: now,
          locked_at: null,
          lock_expires_at: null,
          locked_by: null,
        })
        .eq("id", id)
        .eq("locked_by", workerId)
        .eq("status", "processing")
        .select("*");
      if (error) fail("jobs.completeJob", error.message);
      return (data?.[0] as JobRow | undefined) ?? null;
    },

    async failJob({ id, workerId, errorCode, errorMessage, now }) {
      const { data, error } = await db
        .from(table)
        .update({
          status: "failed",
          error_code: errorCode,
          error_message: errorMessage,
          failed_at: now,
          updated_at: now,
          locked_at: null,
          lock_expires_at: null,
          locked_by: null,
        })
        .eq("id", id)
        .eq("locked_by", workerId)
        .eq("status", "processing")
        .select("*");
      if (error) fail("jobs.failJob", error.message);
      return (data?.[0] as JobRow | undefined) ?? null;
    },

    async releaseForRetry({ id, workerId, availableAt, now }) {
      const { data, error } = await db
        .from(table)
        .update({
          status: "queued",
          available_at: availableAt,
          updated_at: now,
          locked_at: null,
          lock_expires_at: null,
          locked_by: null,
        })
        .eq("id", id)
        .eq("locked_by", workerId)
        .eq("status", "processing")
        .select("*");
      if (error) fail("jobs.releaseForRetry", error.message);
      return (data?.[0] as JobRow | undefined) ?? null;
    },

    async cancelJob({ institutionId, id, now }) {
      const { data, error } = await db
        .from(table)
        .update({
          status: "cancelled",
          cancelled_at: now,
          updated_at: now,
          locked_at: null,
          lock_expires_at: null,
          locked_by: null,
        })
        .eq("institution_id", institutionId)
        .eq("id", id)
        .in("status", ["queued", "processing"])
        .select("*");
      if (error) fail("jobs.cancelJob", error.message);
      return (data?.[0] as JobRow | undefined) ?? null;
    },
  };
}
