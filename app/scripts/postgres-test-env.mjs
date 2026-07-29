#!/usr/bin/env node
/**
 * Ambiente de PostgreSQL descartável para os testes de integração da fila
 * (Micro Missão 3). Nunca toca o Supabase remoto.
 *
 * Dois modos, mutuamente exclusivos:
 *
 * 1. `TEST_DATABASE_URL` definida (GitHub Actions, service container) —
 *    usa exatamente essa URL, não sobe nada, cleanup é no-op.
 * 2. `TEST_DATABASE_URL` ausente (máquina local) — sobe um container
 *    PostgreSQL efêmero via Podman (`--rm`, porta só em 127.0.0.1, sem
 *    volume), aguarda ficar pronto, devolve a URL montada só em memória
 *    e uma função de limpeza que sempre para e remove o container.
 *
 * A URL nunca é impressa nem gravada em arquivo. Mensagens de erro são
 * sanitizadas antes de qualquer log.
 */
import { execFile } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "db", "migrations");

const execFileAsync = promisify(execFile);

const POSTGRES_IMAGE = "docker.io/library/postgres:16.4";
const DISPOSABLE_USER = "iah_test";
const DISPOSABLE_PASSWORD = "iah_test_only_local";
const DISPOSABLE_DB = "iah_jobs_test";

/** Nunca deixar um erro de conexão vazar a URL completa (usuário/senha) para o log. */
export function sanitizeError(error, databaseUrl) {
  const message = error instanceof Error ? error.message : String(error);
  if (!databaseUrl) return message;
  return message.split(databaseUrl).join("[connection string omitida]");
}

async function findFreeLocalPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function podman(args) {
  try {
    return await execFileAsync("podman", args, { windowsHide: true });
  } catch (error) {
    throw new Error(`podman ${args[0]}: ${sanitizeError(error)}`);
  }
}

/**
 * Sobe `postgres:16.4` efêmero: sem volume, `--rm`, porta publicada só em
 * 127.0.0.1. Devolve `{ containerName, databaseUrl }`.
 */
export async function startEphemeralPostgres() {
  const port = await findFreeLocalPort();
  const containerName = `iah-jobs-pgtest-${process.pid}-${Date.now()}`;

  await podman([
    "run",
    "--rm",
    "-d",
    "--name",
    containerName,
    "-p",
    `127.0.0.1:${port}:5432`,
    "-e",
    `POSTGRES_USER=${DISPOSABLE_USER}`,
    "-e",
    `POSTGRES_PASSWORD=${DISPOSABLE_PASSWORD}`,
    "-e",
    `POSTGRES_DB=${DISPOSABLE_DB}`,
    POSTGRES_IMAGE,
  ]);

  const databaseUrl = `postgresql://${DISPOSABLE_USER}:${DISPOSABLE_PASSWORD}@127.0.0.1:${port}/${DISPOSABLE_DB}`;
  return { containerName, databaseUrl };
}

/** Sempre para e remove o container, mesmo se ele já tiver morrido sozinho. */
export async function stopEphemeralPostgres(container) {
  if (!container) return;
  try {
    await podman(["rm", "-f", container.containerName]);
  } catch {
    // --rm já deve ter removido o container ao parar; erro aqui não é fatal.
  }
}

/** Espera aceitar conexões reais — não só a porta TCP, a query também precisa responder. */
export async function waitForReady(databaseUrl, { timeoutMs = 30_000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    const client = new pg.Client({ connectionString: databaseUrl });
    try {
      await client.connect();
      await client.query("select 1");
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(
    `PostgreSQL de teste não ficou pronto em ${timeoutMs}ms: ${sanitizeError(lastError, databaseUrl)}`,
  );
}

/**
 * Papéis mínimos exigidos pelas migrations (0006/0007 fazem GRANT/REVOKE
 * para `service_role`, `anon`, `authenticated`). O Supabase já cria esses
 * papéis; este banco efêmero não tem Supabase, então criamos só os três
 * papéis vazios (sem LOGIN, sem privilégio nenhum) — nunca alteramos as
 * migrations, nunca concedemos nada além do que elas mesmas concedem.
 */
export async function bootstrapSupabaseRoles(client) {
  const roles = ["service_role", "anon", "authenticated"];
  for (const role of roles) {
    await client.query(
      `do $$ begin
         if not exists (select 1 from pg_roles where rolname = '${role}') then
           create role ${role} nologin;
         end if;
       end $$;`,
    );
  }
}

/**
 * Aplica `db/migrations/*.sql`, em ordem lexical (mesma ordem que
 * `scripts/check-migrations.mjs` já valida), num banco vazio. Falha
 * imediatamente no primeiro erro — sem repair, sem ignorar erro SQL,
 * sem tocar em histórico de migration de banco remoto (este banco não
 * tem nenhum).
 */
export async function applyMigrations(client) {
  await bootstrapSupabaseRoles(client);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const applied = [];
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    try {
      await client.query(sql);
      applied.push(file);
    } catch (error) {
      throw new Error(`Migration falhou (${file}): ${sanitizeError(error)}`);
    }
  }
  return applied;
}
