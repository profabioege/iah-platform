import assert from "node:assert/strict";
import test, { after } from "node:test";

import {
  createTestInstitution,
  insertJob,
  nextCapability,
  nextJobId,
  pool,
} from "./support/postgres-test-setup.mjs";

after(async () => {
  await pool.end();
});

/**
 * `capability` é sempre explícita e única por teste (`nextCapability()`)
 * — `iah_claim_next_job` não é escopado por instituição, e `node --test`
 * roda arquivos de teste em paralelo, então sem isolamento por
 * capability um job "sobrando" de outro teste/arquivo contamina a
 * contagem esperada aqui.
 */
async function claimNext(workerId, capability) {
  const { rows } = await pool.query("select * from iah_claim_next_job($1, $2, $3, now())", [
    [capability],
    workerId,
    300,
  ]);
  return rows[0] ?? null;
}

/** Corre uma promise contra um timeout curto — prova ausência de bloqueio, não só a presença textual de SKIP LOCKED. */
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: não respondeu em ${ms}ms — parece bloqueado`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------------
// Fase 9 — SKIP LOCKED real: uma transação segurando FOR UPDATE em A não
// pode travar o claim de B.
// ---------------------------------------------------------------------

test("SKIP LOCKED real: claim ignora job travado por outra transação e não bloqueia", async () => {
  const institutionId = await createTestInstitution();
  const capability = nextCapability();
  const jobA = await insertJob({ institutionId, capability, priority: 1 }); // maior precedência
  const jobB = await insertJob({ institutionId, capability, priority: 50 });

  const lockerClient = await pool.connect();
  try {
    await lockerClient.query("begin");
    // Bloqueia A explicitamente e mantém a transação aberta.
    await lockerClient.query("select * from iah_jobs where id = $1 for update", [jobA]);

    const claimed = await withTimeout(claimNext("worker-skiplocked", capability), 3000, "claim");

    assert.ok(claimed, "claim deveria ter retornado um job (B), não null");
    assert.equal(claimed.id, jobB, "claim deveria ignorar A (travado) e reivindicar B");
  } finally {
    await lockerClient.query("rollback");
    lockerClient.release();
  }

  const { rows } = await pool.query("select status from iah_jobs where id = $1", [jobA]);
  assert.equal(rows[0].status, "queued", "A precisa continuar disponível após o rollback");
});

// ---------------------------------------------------------------------
// Fase 10 — claim concorrente com múltiplos workers.
// ---------------------------------------------------------------------

async function runConcurrentClaimRound() {
  const institutionId = await createTestInstitution();
  const capability = nextCapability();
  const jobIds = [];
  for (let i = 0; i < 10; i += 1) {
    jobIds.push(await insertJob({ institutionId, capability, priority: 100 + i }));
  }

  const workerCount = 20;
  const claims = await Promise.all(
    Array.from({ length: workerCount }, (_, i) => claimNext(`worker-${i}`, capability)),
  );

  const successful = claims.filter(Boolean);
  const claimedIds = successful.map((job) => job.id);
  const uniqueIds = new Set(claimedIds);

  assert.equal(successful.length, 10, "exatamente 10 claims deveriam retornar um job");
  assert.equal(claims.length - successful.length, 10, "os demais 10 deveriam retornar null");
  assert.equal(uniqueIds.size, claimedIds.length, "não pode haver job_id duplicado entre claims");

  // Todo job criado nesta rodada precisa ter sido reivindicado exatamente uma vez.
  for (const id of jobIds) {
    assert.ok(uniqueIds.has(id), `job ${id} não foi reivindicado por ninguém`);
  }

  const { rows } = await pool.query(
    "select id, status, attempts, locked_by from iah_jobs where id = any($1)",
    [jobIds],
  );
  for (const row of rows) {
    assert.equal(row.status, "processing");
    assert.equal(row.attempts, 1, `attempts deveria ser 1 após um único claim (job ${row.id})`);
    assert.ok(row.locked_by?.startsWith("worker-"), `locked_by inesperado para ${row.id}`);
  }

  // locked_by de cada job precisa bater com o worker que realmente recebeu aquele job na resposta do claim.
  const expectedOwner = new Map(successful.map((job) => [job.id, job.locked_by]));
  for (const row of rows) {
    assert.equal(row.locked_by, expectedOwner.get(row.id));
  }
}

test("claim concorrente: 20 workers, 10 jobs — cada job entregue no máximo uma vez (rodada 1)", async () => {
  await runConcurrentClaimRound();
});

test("claim concorrente: 20 workers, 10 jobs — cada job entregue no máximo uma vez (rodada 2)", async () => {
  await runConcurrentClaimRound();
});

// ---------------------------------------------------------------------
// Fase 11 — ordenação real do claim.
// ---------------------------------------------------------------------

test("ordenação: maior prioridade (menor número) é reivindicada primeiro", async () => {
  const institutionId = await createTestInstitution();
  const capability = nextCapability();
  const low = await insertJob({ institutionId, capability, priority: 200 });
  const high = await insertJob({ institutionId, capability, priority: 5 });

  const claimed = await claimNext("worker-priority", capability);
  assert.equal(claimed.id, high);

  const remaining = await claimNext("worker-priority-2", capability);
  assert.equal(remaining.id, low);
});

test("ordenação: entre prioridades iguais, available_at mais antigo vence", async () => {
  const institutionId = await createTestInstitution();
  const capability = nextCapability();
  const earlier = new Date(Date.now() - 60_000).toISOString();
  const later = new Date(Date.now() - 1_000).toISOString();
  const olderAvailable = await insertJob({ institutionId, capability, priority: 100, available_at: earlier });
  const newerAvailable = await insertJob({ institutionId, capability, priority: 100, available_at: later });

  const claimed = await claimNext("worker-availableat", capability);
  assert.equal(claimed.id, olderAvailable);

  const remaining = await claimNext("worker-availableat-2", capability);
  assert.equal(remaining.id, newerAvailable);
});

test("ordenação: entre prioridade e available_at iguais, created_at mais antigo vence", async () => {
  const institutionId = await createTestInstitution();
  const capability = nextCapability();
  const sameAvailableAt = new Date(Date.now() - 60_000).toISOString();
  const older = await insertJob({ institutionId, capability, priority: 100, available_at: sameAvailableAt });
  const newer = await insertJob({ institutionId, capability, priority: 100, available_at: sameAvailableAt });

  // created_at recebe now() no INSERT — força timestamps determinísticos e distintos via UPDATE direto.
  await pool.query("update iah_jobs set created_at = $2 where id = $1", [
    older,
    new Date(Date.now() - 120_000).toISOString(),
  ]);
  await pool.query("update iah_jobs set created_at = $2 where id = $1", [
    newer,
    new Date(Date.now() - 10_000).toISOString(),
  ]);

  const claimed = await claimNext("worker-createdat", capability);
  assert.equal(claimed.id, older);

  const remaining = await claimNext("worker-createdat-2", capability);
  assert.equal(remaining.id, newer);
});

test("ordenação: com priority, available_at e created_at empatados, id é o desempate final", async () => {
  const institutionId = await createTestInstitution();
  const capability = nextCapability();
  const sameAvailableAt = new Date(Date.now() - 60_000).toISOString();
  const sameCreatedAt = new Date(Date.now() - 120_000).toISOString();

  const idA = `aaa-${nextJobId("tie")}`;
  const idZ = `zzz-${nextJobId("tie")}`;
  await insertJob({ id: idZ, institutionId, capability, priority: 100, available_at: sameAvailableAt });
  await insertJob({ id: idA, institutionId, capability, priority: 100, available_at: sameAvailableAt });
  await pool.query("update iah_jobs set created_at = $1 where id = any($2)", [
    sameCreatedAt,
    [idA, idZ],
  ]);

  const claimed = await claimNext("worker-idtie", capability);
  assert.equal(claimed.id, idA, "menor id deveria vencer o desempate");

  const remaining = await claimNext("worker-idtie-2", capability);
  assert.equal(remaining.id, idZ, "o segundo claim deveria pegar o outro job da mesma dupla, não vazamento de outro teste");
});

test("ordenação: capability incompatível, attempts esgotado e estado terminal nunca são reivindicados", async () => {
  const institutionId = await createTestInstitution();
  const capability = nextCapability();
  const otherCapability = nextCapability();
  const wrongCapability = await insertJob({ institutionId, capability: otherCapability });
  const exhausted = await insertJob({ institutionId, capability, attempts: 3, max_attempts: 3 });
  const terminal = await insertJob({ institutionId, capability, status: "succeeded" });
  const eligible = await insertJob({ institutionId, capability });

  const claimed = await claimNext("worker-filters", capability);
  assert.equal(claimed.id, eligible);

  const second = await claimNext("worker-filters-2", capability);
  assert.equal(second, null, "não deveria sobrar nenhum job elegível com esta capability");

  for (const id of [wrongCapability, exhausted, terminal]) {
    const { rows } = await pool.query("select status, locked_by from iah_jobs where id = $1", [id]);
    assert.equal(rows[0].locked_by, null, `job ${id} não deveria ter sido tocado pelo claim`);
  }
});

// ---------------------------------------------------------------------
// Auditoria de isolamento multi-tenant do claim (pós-MM3).
//
// `iah_claim_next_job` é deliberadamente global entre instituições —
// escopado só por capability, nunca por institution_id (§10.1 do
// documento de arquitetura: o token do worker tem "escopo por
// capability"; §10.4: "o claim devolve institution_id", ele não o
// recebe). Isso é coerente com um único Hermes Agent compartilhado
// processando jobs de todas as instituições — não workers dedicados por
// tenant. Estes testes provam, com PostgreSQL real e a MESMA capability
// em duas instituições diferentes, que isso não causa vazamento de
// dados: cada job reivindicado preserva seu próprio institution_id, e
// as operações seguintes (complete/cancel) continuam isoladas por
// id+lock ou por institution_id explícito, nunca cruzando instituições.
// ---------------------------------------------------------------------

test("multi-tenant: mesma capability em duas instituições — cada claim preserva o institution_id correto, sem cruzamento", async () => {
  const institutionA = await createTestInstitution();
  const institutionB = await createTestInstitution();
  const sharedCapability = nextCapability();

  const jobA = await insertJob({ institutionId: institutionA, capability: sharedCapability });
  const jobB = await insertJob({ institutionId: institutionB, capability: sharedCapability });

  const [claim1, claim2] = await Promise.all([
    claimNext("worker-tenant-1", sharedCapability),
    claimNext("worker-tenant-2", sharedCapability),
  ]);

  const claimed = [claim1, claim2].filter(Boolean);
  assert.equal(claimed.length, 2, "as duas instituições deveriam ter seus jobs reivindicados");

  const byId = new Map(claimed.map((job) => [job.id, job]));
  assert.equal(byId.get(jobA)?.institution_id, institutionA);
  assert.equal(byId.get(jobB)?.institution_id, institutionB);

  // Nenhum worker recebeu o job da instituição errada.
  assert.notEqual(claim1.id, claim2.id);

  const { rows } = await pool.query(
    "select id, institution_id, locked_by from iah_jobs where id = any($1) order by id",
    [[jobA, jobB]],
  );
  for (const row of rows) {
    const expectedInstitution = row.id === jobA ? institutionA : institutionB;
    assert.equal(row.institution_id, expectedInstitution, "institution_id não pode ter sido corrompido pelo claim compartilhado");
  }
});

test("multi-tenant: complete de um job da instituição A não afeta o job concorrente da instituição B", async () => {
  const institutionA = await createTestInstitution();
  const institutionB = await createTestInstitution();
  const sharedCapability = nextCapability();

  const jobA = await insertJob({ institutionId: institutionA, capability: sharedCapability });
  const jobB = await insertJob({ institutionId: institutionB, capability: sharedCapability });

  const claimA = await claimNext("worker-a", sharedCapability);
  const claimB = await claimNext("worker-b", sharedCapability);
  // Endereça cada claim ao seu job de origem — ordem entre A/B não é garantida.
  const [ownerOfA, ownerOfB] = claimA.id === jobA ? ["worker-a", "worker-b"] : ["worker-b", "worker-a"];
  assert.deepEqual(new Set([claimA.id, claimB.id]), new Set([jobA, jobB]));

  await pool.query(
    `update iah_jobs set status='succeeded', output='{"ok":true}', completed_at=now(),
       locked_at=null, lock_expires_at=null, locked_by=null
     where id = $1 and locked_by = $2 and status = 'processing'`,
    [jobA, ownerOfA],
  );

  const jobBRow = await pool.query("select status, locked_by from iah_jobs where id = $1", [jobB]);
  assert.equal(jobBRow.rows[0].status, "processing", "concluir o job de A não pode alterar o status do job de B");
  assert.equal(jobBRow.rows[0].locked_by, ownerOfB);
});

test("multi-tenant: cancel com institutionId de A não afeta job da instituição B mesmo sabendo o id", async () => {
  const institutionA = await createTestInstitution();
  const institutionB = await createTestInstitution();
  const jobB = await insertJob({ institutionId: institutionB, status: "queued" });

  const { rowCount } = await pool.query(
    `update iah_jobs set status='cancelled', cancelled_at=now()
     where institution_id = $1 and id = $2 and status in ('queued','processing')`,
    [institutionA, jobB],
  );
  assert.equal(rowCount, 0, "cancel não pode afetar job de outra instituição mesmo informando o id certo");

  const job = await pool.query("select status from iah_jobs where id = $1", [jobB]);
  assert.equal(job.rows[0].status, "queued");
});

test("multi-tenant: mesma idempotencyKey em instituições diferentes com capability compartilhada continua válida", async () => {
  const institutionA = await createTestInstitution();
  const institutionB = await createTestInstitution();
  const sharedCapability = nextCapability();
  const idempotencyKey = nextJobId("shared-idem-multitenant");

  await insertJob({ institutionId: institutionA, capability: sharedCapability, idempotency_key: idempotencyKey });
  await insertJob({ institutionId: institutionB, capability: sharedCapability, idempotency_key: idempotencyKey });

  const { rows } = await pool.query(
    "select institution_id from iah_jobs where idempotency_key = $1 order by institution_id",
    [idempotencyKey],
  );
  assert.equal(rows.length, 2, "a mesma idempotencyKey em instituições diferentes deve continuar criando jobs distintos");
});
