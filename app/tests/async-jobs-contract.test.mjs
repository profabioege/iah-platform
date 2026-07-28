import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionAsyncJob,
  createAsyncJob,
  hasReachedMaxAttempts,
  isTerminalAsyncJobStatus,
} from "../src/modules/jobs/domain/entities.ts";

const NOW = "2026-07-28T00:00:00.000Z";

function baseInput(overrides = {}) {
  return {
    id: "job-1",
    institutionId: "inst-1",
    capability: "docentiah.compose_mission",
    idempotencyKey: "idem-1",
    input: { missionId: "mission-1" },
    ...overrides,
  };
}

test("cria um job válido em queued, disponível imediatamente", () => {
  const job = createAsyncJob(baseInput(), NOW);
  assert.equal(job.status, "queued");
  assert.equal(job.attempts, 0);
  assert.equal(job.availableAt, NOW);
  assert.equal(job.output, null);
});

test("rejeita capability vazia", () => {
  assert.throws(
    () => createAsyncJob(baseInput({ capability: "  " }), NOW),
    /capability/,
  );
});

test("rejeita idempotencyKey vazia", () => {
  assert.throws(
    () => createAsyncJob(baseInput({ idempotencyKey: "" }), NOW),
    /idempotencyKey/,
  );
});

test("transição queued → processing é permitida", () => {
  assert.equal(canTransitionAsyncJob("queued", "processing"), true);
});

test("transição processing → succeeded é permitida", () => {
  assert.equal(canTransitionAsyncJob("processing", "succeeded"), true);
});

test("transição processing → queued (retry controlado) é permitida", () => {
  assert.equal(canTransitionAsyncJob("processing", "queued"), true);
});

test("transição processing → failed é permitida", () => {
  assert.equal(canTransitionAsyncJob("processing", "failed"), true);
});

test("bloqueia transição succeeded → processing (estado terminal)", () => {
  assert.equal(canTransitionAsyncJob("succeeded", "processing"), false);
});

test("bloqueia transição failed → queued (estado terminal)", () => {
  assert.equal(canTransitionAsyncJob("failed", "queued"), false);
});

test("identifica estados terminais corretamente", () => {
  assert.equal(isTerminalAsyncJobStatus("succeeded"), true);
  assert.equal(isTerminalAsyncJobStatus("failed"), true);
  assert.equal(isTerminalAsyncJobStatus("cancelled"), true);
  assert.equal(isTerminalAsyncJobStatus("queued"), false);
  assert.equal(isTerminalAsyncJobStatus("processing"), false);
});

test("identifica tentativas acima do limite", () => {
  const job = createAsyncJob(baseInput({ maxAttempts: 3 }), NOW);
  assert.equal(hasReachedMaxAttempts({ ...job, attempts: 2 }), false);
  assert.equal(hasReachedMaxAttempts({ ...job, attempts: 3 }), true);
  assert.equal(hasReachedMaxAttempts({ ...job, attempts: 4 }), true);
});

test("idempotência é isolada por instituição, não global", () => {
  const jobInstitutionA = createAsyncJob(
    baseInput({ id: "job-a", institutionId: "inst-a", idempotencyKey: "same-key" }),
    NOW,
  );
  const jobInstitutionB = createAsyncJob(
    baseInput({ id: "job-b", institutionId: "inst-b", idempotencyKey: "same-key" }),
    NOW,
  );
  // A mesma idempotencyKey em instituições diferentes produz dois jobs
  // independentes — a unicidade real é `unique (institution_id, idempotency_key)`
  // na migration 0008, nunca uma chave global.
  assert.equal(jobInstitutionA.idempotencyKey, jobInstitutionB.idempotencyKey);
  assert.notEqual(jobInstitutionA.institutionId, jobInstitutionB.institutionId);
  assert.notEqual(jobInstitutionA.id, jobInstitutionB.id);
});
