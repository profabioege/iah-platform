import assert from "node:assert/strict";
import test, { after } from "node:test";

import {
  createTestInstitution,
  getJob,
  insertJob,
  nextCapability,
  nextJobId,
  pool,
} from "./support/postgres-test-setup.mjs";

/** `iah_claim_next_job` não é escopado por instituição — isola por capability única para não depender da ordem/paralelismo de outros testes/arquivos. */
async function claimNext(workerId, capability) {
  const { rows } = await pool.query("select * from iah_claim_next_job($1, $2, $3, now())", [
    [capability],
    workerId,
    300,
  ]);
  return rows[0] ?? null;
}

after(async () => {
  await pool.end();
});

// ---------------------------------------------------------------------
// Fase 8 — schema resultante das migrations no banco descartável.
// ---------------------------------------------------------------------

test("schema: tabela iah_jobs existe", async () => {
  const { rows } = await pool.query(
    "select 1 from information_schema.tables where table_name = 'iah_jobs'",
  );
  assert.equal(rows.length, 1);
});

test("schema: função iah_claim_next_job existe", async () => {
  const { rows } = await pool.query(
    "select 1 from pg_proc where proname = 'iah_claim_next_job'",
  );
  assert.equal(rows.length, 1);
});

test("schema: índices esperados existem", async () => {
  const { rows } = await pool.query(
    "select indexname from pg_indexes where tablename = 'iah_jobs'",
  );
  const names = rows.map((r) => r.indexname);
  for (const expected of [
    "iah_jobs_institution_idx",
    "iah_jobs_claim_idx",
    "iah_jobs_capability_idx",
    "iah_jobs_lock_expiry_idx",
  ]) {
    assert.ok(names.includes(expected), `índice ausente: ${expected}`);
  }
});

test("schema: RLS está habilitada em iah_jobs", async () => {
  const { rows } = await pool.query(
    "select relrowsecurity from pg_class where relname = 'iah_jobs'",
  );
  assert.equal(rows[0].relrowsecurity, true);
});

test("schema: anon não possui nenhum privilégio em iah_jobs", async () => {
  const { rows } = await pool.query(
    `select privilege_type from information_schema.role_table_grants
     where table_name = 'iah_jobs' and grantee = 'anon'`,
  );
  assert.equal(rows.length, 0);
});

test("schema: authenticated não possui nenhum privilégio em iah_jobs", async () => {
  const { rows } = await pool.query(
    `select privilege_type from information_schema.role_table_grants
     where table_name = 'iah_jobs' and grantee = 'authenticated'`,
  );
  assert.equal(rows.length, 0);
});

test("schema: service_role possui exatamente select/insert/update/delete em iah_jobs", async () => {
  const { rows } = await pool.query(
    `select privilege_type from information_schema.role_table_grants
     where table_name = 'iah_jobs' and grantee = 'service_role'
     order by privilege_type`,
  );
  const privileges = rows.map((r) => r.privilege_type).sort();
  assert.deepEqual(privileges, ["DELETE", "INSERT", "SELECT", "UPDATE"]);
});

test("schema: EXECUTE em iah_claim_next_job só para service_role", async () => {
  const { rows } = await pool.query(
    `select grantee, privilege_type from information_schema.role_routine_grants
     where routine_name = 'iah_claim_next_job'`,
  );
  const grantees = rows.map((r) => r.grantee);
  assert.ok(grantees.includes("service_role"));
  assert.ok(!grantees.includes("anon"));
  assert.ok(!grantees.includes("authenticated"));
  assert.ok(!grantees.includes("PUBLIC"));
});

// ---------------------------------------------------------------------
// Fase 12 — idempotência concorrente.
// ---------------------------------------------------------------------

test("idempotência concorrente: duas inserções simultâneas com a mesma chave resultam em 1 linha só", async () => {
  const institutionId = await createTestInstitution();
  const idempotencyKey = nextJobId("idem-concurrent");
  const id1 = nextJobId("a");
  const id2 = nextJobId("b");

  const insertOne = (id) =>
    pool
      .query(
        `insert into iah_jobs (id, institution_id, capability, idempotency_key, input)
         values ($1,$2,$3,$4,$5)
         on conflict (institution_id, idempotency_key) do nothing
         returning id`,
        [id, institutionId, "docentiah.compose_mission", idempotencyKey, "{}"],
      )
      .catch((error) => ({ error }));

  const [r1, r2] = await Promise.all([insertOne(id1), insertOne(id2)]);

  const { rows } = await pool.query(
    "select count(*) from iah_jobs where institution_id = $1 and idempotency_key = $2",
    [institutionId, idempotencyKey],
  );
  assert.equal(Number(rows[0].count), 1);

  // Exatamente uma das duas chamadas inseriu de fato (rowCount 1); a
  // outra foi ignorada pelo ON CONFLICT DO NOTHING (rowCount 0) — nenhuma
  // das duas recebe um erro não tratado.
  const rowCounts = [r1.rowCount ?? 0, r2.rowCount ?? 0].sort();
  assert.deepEqual(rowCounts, [0, 1]);
});

test("idempotência: mesma chave em instituições diferentes cria jobs distintos", async () => {
  const institutionA = await createTestInstitution();
  const institutionB = await createTestInstitution();
  const idempotencyKey = nextJobId("shared-key");

  await insertJob({ institutionId: institutionA, idempotency_key: idempotencyKey });
  await insertJob({ institutionId: institutionB, idempotency_key: idempotencyKey });

  const { rows } = await pool.query(
    "select institution_id from iah_jobs where idempotency_key = $1 order by institution_id",
    [idempotencyKey],
  );
  assert.equal(rows.length, 2);
});

test("idempotência: mesma chave e mesma instituição, segunda tentativa direta viola a constraint (conflito tipado pela camada de repositório)", async () => {
  const institutionId = await createTestInstitution();
  const idempotencyKey = nextJobId("conflict-key");
  await insertJob({ institutionId, idempotency_key: idempotencyKey });

  await assert.rejects(
    () =>
      pool.query(
        `insert into iah_jobs (id, institution_id, capability, idempotency_key, input)
         values ($1,$2,$3,$4,$5)`,
        [nextJobId("dup"), institutionId, "docentiah.compose_mission", idempotencyKey, "{}"],
      ),
    /duplicate key value violates unique constraint/,
  );
  // A camada de repositório (testada em app/tests/async-jobs-repository.test.mjs)
  // já cobre a tradução desse 23505 para AsyncJobIdempotencyConflictError
  // quando capability/payload divergem — aqui confirmamos só que o banco
  // real de fato impõe a unicidade que aquela lógica depende.
});

// ---------------------------------------------------------------------
// Fase 13 — heartbeat real.
// ---------------------------------------------------------------------

test("heartbeat: worker proprietário estende lock_expires_at sem alterar attempts", async () => {
  const institutionId = await createTestInstitution();
  const id = await insertJob({ institutionId });
  await pool.query(
    `update iah_jobs set status='processing', locked_by='worker-a', locked_at=now(),
       lock_expires_at = now() + interval '1 minute', attempts = 1
     where id = $1`,
    [id],
  );

  const before = await getJob(id);
  const newExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { rows } = await pool.query(
    `update iah_jobs set lock_expires_at = $1, updated_at = now()
     where id = $2 and locked_by = 'worker-a' and status = 'processing'
     returning *`,
    [newExpiry, id],
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].attempts, before.attempts);
  assert.deepEqual(rows[0].input, before.input);
  assert.equal(rows[0].idempotency_key, before.idempotency_key);
});

test("heartbeat: worker diferente do proprietário não consegue renovar (0 linhas afetadas)", async () => {
  const institutionId = await createTestInstitution();
  const id = await insertJob({ institutionId });
  await pool.query(
    `update iah_jobs set status='processing', locked_by='worker-a', locked_at=now(),
       lock_expires_at = now() + interval '1 minute'
     where id = $1`,
    [id],
  );

  const { rowCount } = await pool.query(
    `update iah_jobs set lock_expires_at = now() + interval '5 minutes'
     where id = $1 and locked_by = 'worker-b' and status = 'processing'`,
    [id],
  );
  assert.equal(rowCount, 0);
});

test("heartbeat: job em estado terminal não é renovado", async () => {
  const institutionId = await createTestInstitution();
  const id = await insertJob({ institutionId, status: "succeeded" });

  const { rowCount } = await pool.query(
    `update iah_jobs set lock_expires_at = now() + interval '5 minutes'
     where id = $1 and locked_by = 'worker-a' and status = 'processing'`,
    [id],
  );
  assert.equal(rowCount, 0);
});

// ---------------------------------------------------------------------
// Fase 14 — complete, retry, fail, cancel.
// ---------------------------------------------------------------------

test("complete: proprietário conclui, output persistido, lock limpo", async () => {
  const institutionId = await createTestInstitution();
  const id = await insertJob({ institutionId });
  await pool.query(
    `update iah_jobs set status='processing', locked_by='worker-a', locked_at=now(),
       lock_expires_at = now() + interval '1 minute'
     where id = $1`,
    [id],
  );

  const { rows } = await pool.query(
    `update iah_jobs set status='succeeded', output=$2, completed_at=now(), updated_at=now(),
       locked_at=null, lock_expires_at=null, locked_by=null
     where id = $1 and locked_by = 'worker-a' and status = 'processing'
     returning *`,
    [id, JSON.stringify({ ok: true })],
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "succeeded");
  assert.deepEqual(rows[0].output, { ok: true });
  assert.notEqual(rows[0].completed_at, null);
  assert.equal(rows[0].locked_by, null);
});

test("complete: worker diferente não consegue concluir", async () => {
  const institutionId = await createTestInstitution();
  const id = await insertJob({ institutionId });
  await pool.query(
    `update iah_jobs set status='processing', locked_by='worker-a', locked_at=now(),
       lock_expires_at = now() + interval '1 minute'
     where id = $1`,
    [id],
  );

  const { rowCount } = await pool.query(
    `update iah_jobs set status='succeeded', output='{}', completed_at=now()
     where id = $1 and locked_by = 'worker-b' and status = 'processing'`,
    [id],
  );
  assert.equal(rowCount, 0);
  const job = await getJob(id);
  assert.equal(job.status, "processing");
});

test("complete: segunda conclusão (repetida) não afeta linhas nem corrompe o resultado já gravado", async () => {
  const institutionId = await createTestInstitution();
  const id = await insertJob({ institutionId });
  await pool.query(
    `update iah_jobs set status='processing', locked_by='worker-a', locked_at=now(),
       lock_expires_at = now() + interval '1 minute'
     where id = $1`,
    [id],
  );
  await pool.query(
    `update iah_jobs set status='succeeded', output=$2, completed_at=now(),
       locked_at=null, lock_expires_at=null, locked_by=null
     where id = $1 and locked_by = 'worker-a' and status = 'processing'`,
    [id, JSON.stringify({ first: true })],
  );

  const { rowCount } = await pool.query(
    `update iah_jobs set status='succeeded', output=$2, completed_at=now()
     where id = $1 and locked_by = 'worker-a' and status = 'processing'`,
    [id, JSON.stringify({ second: true })],
  );
  assert.equal(rowCount, 0);

  const job = await getJob(id);
  assert.deepEqual(job.output, { first: true });
});

test("retry: processing volta a queued, available_at reagendado, lock limpo, completed_at continua nulo", async () => {
  const institutionId = await createTestInstitution();
  const id = await insertJob({ institutionId, attempts: 1 });
  await pool.query(
    `update iah_jobs set status='processing', locked_by='worker-a', locked_at=now(),
       lock_expires_at = now() + interval '1 minute'
     where id = $1`,
    [id],
  );

  const future = new Date(Date.now() + 60_000).toISOString();
  const { rows } = await pool.query(
    `update iah_jobs set status='queued', available_at=$2, error_code=$3, error_message=$4,
       updated_at=now(), locked_at=null, lock_expires_at=null, locked_by=null
     where id = $1 and locked_by = 'worker-a' and status = 'processing'
     returning *`,
    [id, future, "provider_timeout", "Timeout sanitizado."],
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "queued");
  assert.equal(rows[0].completed_at, null);
  assert.equal(rows[0].locked_by, null);
  assert.ok(new Date(rows[0].available_at).getTime() > Date.now());
});

test("retry: job futuro (available_at no futuro) não é reivindicado pelo claim", async () => {
  const institutionId = await createTestInstitution();
  const capability = nextCapability();
  const future = new Date(Date.now() + 60_000).toISOString();
  await insertJob({ institutionId, capability, available_at: future });

  const claimed = await claimNext("worker-x", capability);
  assert.equal(claimed, null);
});

test("fail: status failed, failed_at preenchido, lock limpo, erro sem connection string", async () => {
  const institutionId = await createTestInstitution();
  const id = await insertJob({ institutionId, attempts: 3, max_attempts: 3 });
  await pool.query(
    `update iah_jobs set status='processing', locked_by='worker-a', locked_at=now(),
       lock_expires_at = now() + interval '1 minute'
     where id = $1`,
    [id],
  );

  const { rows } = await pool.query(
    `update iah_jobs set status='failed', error_code=$2, error_message=$3, failed_at=now(),
       updated_at=now(), locked_at=null, lock_expires_at=null, locked_by=null
     where id = $1 and locked_by = 'worker-a' and status = 'processing'
     returning *`,
    [id, "provider_timeout", "O provedor não respondeu a tempo."],
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "failed");
  assert.notEqual(rows[0].failed_at, null);
  assert.equal(rows[0].locked_by, null);
  assert.doesNotMatch(rows[0].error_message, /postgresql:\/\//);
});

test("fail: job já failed não volta a ser reivindicado pelo claim", async () => {
  const institutionId = await createTestInstitution();
  const capability = nextCapability();
  await insertJob({ institutionId, capability, status: "failed" });

  const claimed = await claimNext("worker-x", capability);
  assert.equal(claimed, null);
});

test("cancel: job em queued é cancelado, lock limpo (não havia lock)", async () => {
  const institutionId = await createTestInstitution();
  const id = await insertJob({ institutionId, status: "queued" });

  const { rows } = await pool.query(
    `update iah_jobs set status='cancelled', cancelled_at=now(), updated_at=now(),
       locked_at=null, lock_expires_at=null, locked_by=null
     where institution_id = $1 and id = $2 and status in ('queued','processing')
     returning *`,
    [institutionId, id],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "cancelled");
});

test("cancel: job já succeeded (terminal) não é cancelado", async () => {
  const institutionId = await createTestInstitution();
  const id = await insertJob({ institutionId, status: "succeeded" });

  const { rowCount } = await pool.query(
    `update iah_jobs set status='cancelled', cancelled_at=now()
     where institution_id = $1 and id = $2 and status in ('queued','processing')`,
    [institutionId, id],
  );
  assert.equal(rowCount, 0);
});

test("cancel: job cancelado não é reivindicado pelo claim", async () => {
  const institutionId = await createTestInstitution();
  const capability = nextCapability();
  await insertJob({ institutionId, capability, status: "cancelled" });

  const claimed = await claimNext("worker-x", capability);
  assert.equal(claimed, null);
});

// ---------------------------------------------------------------------
// Fase 15 — isolamento e permissões (papel autenticado como cada role).
// ---------------------------------------------------------------------

test("permissões: papel anon não consegue selecionar iah_jobs", async () => {
  const client = await pool.connect();
  try {
    await client.query("set role anon");
    await assert.rejects(() => client.query("select * from iah_jobs limit 1"), /permission denied/);
  } finally {
    await client.query("reset role");
    client.release();
  }
});

test("permissões: papel authenticated não consegue selecionar iah_jobs", async () => {
  const client = await pool.connect();
  try {
    await client.query("set role authenticated");
    await assert.rejects(() => client.query("select * from iah_jobs limit 1"), /permission denied/);
  } finally {
    await client.query("reset role");
    client.release();
  }
});

test("permissões: papel anon não consegue executar iah_claim_next_job", async () => {
  const client = await pool.connect();
  try {
    await client.query("set role anon");
    await assert.rejects(
      () => client.query("select * from iah_claim_next_job($1,$2,$3,now())", [["x"], "w", 60]),
      /permission denied/,
    );
  } finally {
    await client.query("reset role");
    client.release();
  }
});

test("permissões: papel authenticated não consegue executar iah_claim_next_job", async () => {
  const client = await pool.connect();
  try {
    await client.query("set role authenticated");
    await assert.rejects(
      () => client.query("select * from iah_claim_next_job($1,$2,$3,now())", [["x"], "w", 60]),
      /permission denied/,
    );
  } finally {
    await client.query("reset role");
    client.release();
  }
});

test("permissões: nenhum privilégio PUBLIC foi concedido em iah_jobs", async () => {
  const { rows } = await pool.query(
    `select privilege_type from information_schema.role_table_grants
     where table_name = 'iah_jobs' and grantee = 'PUBLIC'`,
  );
  assert.equal(rows.length, 0);
});

test('não existe papel "hermes" no banco', async () => {
  const { rows } = await pool.query("select 1 from pg_roles where rolname ilike '%hermes%'");
  assert.equal(rows.length, 0);
});

test("institution scoping: cancel de uma instituição não afeta job de outra", async () => {
  const institutionA = await createTestInstitution();
  const institutionB = await createTestInstitution();
  const id = await insertJob({ institutionId: institutionB, status: "queued" });

  const { rowCount } = await pool.query(
    `update iah_jobs set status='cancelled', cancelled_at=now()
     where institution_id = $1 and id = $2 and status in ('queued','processing')`,
    [institutionA, id],
  );
  assert.equal(rowCount, 0);
  const job = await getJob(id);
  assert.equal(job.status, "queued");
});
