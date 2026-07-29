/**
 * Suporte compartilhado dos testes de integração PostgreSQL da fila de
 * jobs (Micro Missão 3). `TEST_DATABASE_URL` é sempre fornecida por quem
 * chama `node --test` sobre este diretório — `npm run
 * test:integration:postgres` garante isso (Podman local ou service
 * container do GitHub Actions). Nunca aponta para o Supabase remoto.
 */
import pg from "pg";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL não definida — rode via `npm run test:integration:postgres`, " +
      "não diretamente com `node --test`.",
  );
}

export const pool = new pg.Pool({ connectionString: databaseUrl, max: 30 });

let institutionSeq = 0;
let userSeq = 0;
let capabilitySeq = 0;

/**
 * `iah_claim_next_job` não é escopado por instituição (por design — o
 * worker reivindica entre instituições, só filtrado por capability).
 * `node --test` roda arquivos de teste em paralelo por padrão, então sem
 * uma capability única por teste, jobs de um arquivo vazam para o claim
 * de outro. Cada teste que chama `claimNext` deve usar sua própria
 * capability gerada aqui.
 */
export function nextCapability() {
  capabilitySeq += 1;
  return `test.capability.${process.pid}.${Date.now()}.${capabilitySeq}`;
}

/** Cada teste cria sua própria instituição — isolamento sem depender de TRUNCATE entre casos. */
export async function createTestInstitution(client = pool) {
  institutionSeq += 1;
  const id = `test-inst-${process.pid}-${Date.now()}-${institutionSeq}`;
  await client.query("insert into institutions (id, name) values ($1, $2)", [id, id]);
  return id;
}

export async function createTestUser(institutionId, client = pool) {
  userSeq += 1;
  const id = `test-user-${process.pid}-${Date.now()}-${userSeq}`;
  await client.query(
    "insert into users (id, institution_id, name, email) values ($1, $2, $3, $4)",
    [id, institutionId, id, `${id}@example.invalid`],
  );
  return id;
}

let jobSeq = 0;
export function nextJobId(label = "job") {
  jobSeq += 1;
  return `test-${label}-${process.pid}-${Date.now()}-${jobSeq}`;
}

/**
 * Insere um job diretamente via SQL (não pelo repositório) — os testes de
 * integração validam o schema e a função SQL em si, não a camada
 * TypeScript por cima (essa já tem os 37 testes unitários da MM1/MM2).
 */
export async function insertJob(overrides, client = pool) {
  const row = {
    id: nextJobId(),
    institution_id: overrides.institutionId,
    capability: "docentiah.compose_mission",
    status: "queued",
    idempotency_key: nextJobId("idem"),
    priority: 100,
    input: {},
    attempts: 0,
    max_attempts: 3,
    available_at: new Date().toISOString(),
    ...overrides,
  };

  await client.query(
    `insert into iah_jobs (
       id, institution_id, capability, status, idempotency_key, priority,
       input, attempts, max_attempts, available_at, created_by
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      row.id,
      row.institution_id,
      row.capability,
      row.status,
      row.idempotency_key,
      row.priority,
      JSON.stringify(row.input),
      row.attempts,
      row.max_attempts,
      row.available_at,
      row.created_by ?? null,
    ],
  );
  return row.id;
}

export async function getJob(id, client = pool) {
  const { rows } = await client.query("select * from iah_jobs where id = $1", [id]);
  return rows[0] ?? null;
}
