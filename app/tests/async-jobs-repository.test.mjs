import assert from "node:assert/strict";
import test from "node:test";

import { createAsyncJob } from "../src/modules/jobs/domain/entities.ts";
import {
  AsyncJobIdempotencyConflictError,
  AsyncJobLockLostError,
  AsyncJobNotFoundError,
} from "../src/modules/jobs/domain/errors.ts";
import { createDatabaseAsyncJobRepository } from "../src/modules/jobs/infrastructure/database/database-repositories.ts";

const NOW = "2026-07-29T00:00:00.000Z";
const LATER = "2026-07-29T00:05:00.000Z";

/**
 * Driver falso em memória — implementa exatamente as mesmas condições
 * WHERE da migration (status/locked_by/institution_id), sem qualquer
 * concorrência real. Existe só para testar a lógica do repositório
 * (mapeamento, classificação de erro, idempotência) sem banco — nunca
 * para simular `FOR UPDATE SKIP LOCKED` sob concorrência real.
 */
function createFakeDriver(seedRows = []) {
  const rows = new Map(seedRows.map((r) => [r.id, { ...r }]));

  return {
    rows,
    async insert(row) {
      const conflict = [...rows.values()].find(
        (r) => r.institution_id === row.institution_id && r.idempotency_key === row.idempotency_key,
      );
      if (conflict) return { error: { code: "23505", message: "duplicate key" } };
      rows.set(row.id, { ...row });
      return { error: null };
    },
    async selectByInstitutionAndId(institutionId, id) {
      const row = rows.get(id);
      return row && row.institution_id === institutionId ? { ...row } : null;
    },
    async selectByInstitutionAndIdempotencyKey(institutionId, idempotencyKey) {
      const row = [...rows.values()].find(
        (r) => r.institution_id === institutionId && r.idempotency_key === idempotencyKey,
      );
      return row ? { ...row } : null;
    },
    async selectById(id) {
      const row = rows.get(id);
      return row ? { ...row } : null;
    },
    async claimNext() {
      throw new Error("não usado nestes testes — ver async-jobs-claim-ordering.test.mjs");
    },
    async renewLock({ id, workerId, lockExpiresAt, now }) {
      const row = rows.get(id);
      if (!row || row.locked_by !== workerId || row.status !== "processing") return null;
      row.lock_expires_at = lockExpiresAt;
      row.updated_at = now;
      return { ...row };
    },
    async completeJob({ id, workerId, output, now }) {
      const row = rows.get(id);
      if (!row || row.locked_by !== workerId || row.status !== "processing") return null;
      Object.assign(row, {
        status: "succeeded",
        output,
        error_code: null,
        error_message: null,
        completed_at: now,
        updated_at: now,
        locked_at: null,
        lock_expires_at: null,
        locked_by: null,
      });
      return { ...row };
    },
    async failJob({ id, workerId, errorCode, errorMessage, now }) {
      const row = rows.get(id);
      if (!row || row.locked_by !== workerId || row.status !== "processing") return null;
      Object.assign(row, {
        status: "failed",
        error_code: errorCode,
        error_message: errorMessage,
        failed_at: now,
        updated_at: now,
        locked_at: null,
        lock_expires_at: null,
        locked_by: null,
      });
      return { ...row };
    },
    async releaseForRetry({ id, workerId, availableAt, now }) {
      const row = rows.get(id);
      if (!row || row.locked_by !== workerId || row.status !== "processing") return null;
      Object.assign(row, {
        status: "queued",
        available_at: availableAt,
        updated_at: now,
        locked_at: null,
        lock_expires_at: null,
        locked_by: null,
      });
      return { ...row };
    },
    async cancelJob({ institutionId, id, now }) {
      const row = rows.get(id);
      if (!row || row.institution_id !== institutionId || !["queued", "processing"].includes(row.status)) {
        return null;
      }
      Object.assign(row, {
        status: "cancelled",
        cancelled_at: now,
        updated_at: now,
        locked_at: null,
        lock_expires_at: null,
        locked_by: null,
      });
      return { ...row };
    },
  };
}

function processingRow(overrides = {}) {
  return {
    id: "job-1",
    institution_id: "inst-1",
    capability: "docentiah.compose_mission",
    status: "processing",
    idempotency_key: "idem-1",
    priority: 100,
    input: { missionId: "m-1" },
    output: null,
    error_code: null,
    error_message: null,
    attempts: 1,
    max_attempts: 3,
    available_at: NOW,
    locked_at: NOW,
    lock_expires_at: LATER,
    locked_by: "worker-a",
    created_by: null,
    created_at: NOW,
    updated_at: NOW,
    started_at: NOW,
    completed_at: null,
    failed_at: null,
    cancelled_at: null,
    ...overrides,
  };
}

test("enqueue: cria um novo job", async () => {
  const driver = createFakeDriver();
  const repo = createDatabaseAsyncJobRepository(driver);
  const job = createAsyncJob(
    { id: "job-1", institutionId: "inst-1", capability: "docentiah.compose_mission", idempotencyKey: "idem-1", input: {} },
    NOW,
  );

  const saved = await repo.enqueue("inst-1", job);
  assert.equal(saved.id, "job-1");
  assert.equal(driver.rows.size, 1);
});

test("enqueue idempotente: mesma chave e mesmo payload retorna o job existente, sem duplicar", async () => {
  const driver = createFakeDriver();
  const repo = createDatabaseAsyncJobRepository(driver);
  const job = createAsyncJob(
    { id: "job-1", institutionId: "inst-1", capability: "docentiah.compose_mission", idempotencyKey: "idem-1", input: { a: 1 } },
    NOW,
  );

  const first = await repo.enqueue("inst-1", job);
  const retryJob = createAsyncJob(
    { id: "job-2-ignored", institutionId: "inst-1", capability: "docentiah.compose_mission", idempotencyKey: "idem-1", input: { a: 1 } },
    LATER,
  );
  const second = await repo.enqueue("inst-1", retryJob);

  assert.equal(second.id, first.id);
  assert.equal(driver.rows.size, 1);
});

test("enqueue: mesma idempotencyKey em instituições diferentes não conflita", async () => {
  const driver = createFakeDriver();
  const repo = createDatabaseAsyncJobRepository(driver);
  const jobA = createAsyncJob(
    { id: "job-a", institutionId: "inst-a", capability: "docentiah.compose_mission", idempotencyKey: "same-key", input: {} },
    NOW,
  );
  const jobB = createAsyncJob(
    { id: "job-b", institutionId: "inst-b", capability: "docentiah.compose_mission", idempotencyKey: "same-key", input: {} },
    NOW,
  );

  await repo.enqueue("inst-a", jobA);
  await repo.enqueue("inst-b", jobB);
  assert.equal(driver.rows.size, 2);
});

test("enqueue: reutilização incompatível da chave gera conflito tipado", async () => {
  const driver = createFakeDriver();
  const repo = createDatabaseAsyncJobRepository(driver);
  const job = createAsyncJob(
    { id: "job-1", institutionId: "inst-1", capability: "docentiah.compose_mission", idempotencyKey: "idem-1", input: { a: 1 } },
    NOW,
  );
  await repo.enqueue("inst-1", job);

  const incompatible = createAsyncJob(
    { id: "job-2", institutionId: "inst-1", capability: "docentiah.generate_slides", idempotencyKey: "idem-1", input: { a: 1 } },
    LATER,
  );

  await assert.rejects(
    () => repo.enqueue("inst-1", incompatible),
    AsyncJobIdempotencyConflictError,
  );
});

test("heartbeat: renovado pelo worker correto", async () => {
  const driver = createFakeDriver([processingRow()]);
  const repo = createDatabaseAsyncJobRepository(driver);

  const result = await repo.heartbeat({
    id: "job-1",
    workerId: "worker-a",
    lockDurationMs: 5 * 60 * 1000,
    now: LATER,
  });

  assert.equal(result.outcome, "renewed");
  assert.equal(result.job.lockedBy, "worker-a");
});

test("heartbeat: rejeitado (lock_lost) para worker diferente do proprietário", async () => {
  const driver = createFakeDriver([processingRow()]);
  const repo = createDatabaseAsyncJobRepository(driver);

  const result = await repo.heartbeat({
    id: "job-1",
    workerId: "worker-b",
    lockDurationMs: 5 * 60 * 1000,
    now: LATER,
  });

  assert.equal(result.outcome, "lock_lost");
});

test("heartbeat: job inexistente", async () => {
  const driver = createFakeDriver();
  const repo = createDatabaseAsyncJobRepository(driver);

  const result = await repo.heartbeat({
    id: "does-not-exist",
    workerId: "worker-a",
    lockDurationMs: 1000,
    now: NOW,
  });

  assert.equal(result.outcome, "not_found");
});

test("complete: concluído pelo proprietário do lock", async () => {
  const driver = createFakeDriver([processingRow()]);
  const repo = createDatabaseAsyncJobRepository(driver);

  const job = await repo.complete({
    id: "job-1",
    workerId: "worker-a",
    output: { resultado: "ok" },
    now: LATER,
  });

  assert.equal(job.status, "succeeded");
  assert.deepEqual(job.output, { resultado: "ok" });
  assert.equal(job.lockedBy, null);
  assert.equal(job.completedAt, LATER);
});

test("complete: rejeitado após perda do lock (worker diferente)", async () => {
  const driver = createFakeDriver([processingRow()]);
  const repo = createDatabaseAsyncJobRepository(driver);

  await assert.rejects(
    () => repo.complete({ id: "job-1", workerId: "worker-b", output: {}, now: LATER }),
    AsyncJobLockLostError,
  );
});

test("retry: releaseForRetry limpa o lock e agenda availableAt no futuro", async () => {
  const driver = createFakeDriver([processingRow({ attempts: 1, max_attempts: 3 })]);
  const repo = createDatabaseAsyncJobRepository(driver);
  const nextAvailableAt = "2026-07-29T00:10:00.000Z";

  const job = await repo.releaseForRetry({
    id: "job-1",
    workerId: "worker-a",
    availableAt: nextAvailableAt,
    now: LATER,
  });

  assert.equal(job.status, "queued");
  assert.equal(job.availableAt, nextAvailableAt);
  assert.equal(job.lockedBy, null);
  assert.equal(job.lockExpiresAt, null);
});

test("fail: falha terminal após maxAttempts esgotado", async () => {
  const driver = createFakeDriver([processingRow({ attempts: 3, max_attempts: 3 })]);
  const repo = createDatabaseAsyncJobRepository(driver);

  const job = await repo.fail({
    id: "job-1",
    workerId: "worker-a",
    errorCode: "provider_timeout",
    errorMessage: "O provedor não respondeu a tempo.",
    now: LATER,
  });

  assert.equal(job.status, "failed");
  assert.equal(job.failedAt, LATER);
  assert.equal(job.errorCode, "provider_timeout");
  assert.equal(job.lockedBy, null);
});

test("cancelamento: cancela job em queued, limpa lock quando aplicável", async () => {
  const driver = createFakeDriver([
    { ...processingRow(), status: "queued", locked_by: null, locked_at: null, lock_expires_at: null },
  ]);
  const repo = createDatabaseAsyncJobRepository(driver);

  const job = await repo.cancel("inst-1", "job-1", LATER);
  assert.equal(job.status, "cancelled");
  assert.equal(job.cancelledAt, LATER);
});

test("cancelamento: não cancela silenciosamente um job já concluído", async () => {
  const driver = createFakeDriver([{ ...processingRow(), status: "succeeded", locked_by: null }]);
  const repo = createDatabaseAsyncJobRepository(driver);

  await assert.rejects(() => repo.cancel("inst-1", "job-1", LATER));
});

test("mapeamento snake_case ↔ camelCase é fiel em todos os campos", async () => {
  const driver = createFakeDriver([processingRow()]);
  const repo = createDatabaseAsyncJobRepository(driver);

  const job = await repo.findById("inst-1", "job-1");
  assert.equal(job.institutionId, "inst-1");
  assert.equal(job.idempotencyKey, "idem-1");
  assert.equal(job.maxAttempts, 3);
  assert.equal(job.lockExpiresAt, LATER);
  assert.equal(job.lockedBy, "worker-a");
  assert.equal(job.startedAt, NOW);
});

test("job inexistente não é reivindicável — status terminal nunca reaparece para o worker (nível de mapeamento)", async () => {
  const driver = createFakeDriver([{ ...processingRow(), status: "succeeded" }]);
  const repo = createDatabaseAsyncJobRepository(driver);

  await assert.rejects(
    () => repo.complete({ id: "job-1", workerId: "worker-a", output: {}, now: LATER }),
  );
});

test("findById retorna null para job inexistente", async () => {
  const driver = createFakeDriver();
  const repo = createDatabaseAsyncJobRepository(driver);
  const job = await repo.findById("inst-1", "does-not-exist");
  assert.equal(job, null);
});

test("complete de job inexistente lança AsyncJobNotFoundError", async () => {
  const driver = createFakeDriver();
  const repo = createDatabaseAsyncJobRepository(driver);
  await assert.rejects(
    () => repo.complete({ id: "ghost", workerId: "worker-a", output: {}, now: NOW }),
    AsyncJobNotFoundError,
  );
});
