#!/usr/bin/env node
/**
 * `npm run test:integration:postgres` — testes reais de concorrência da
 * fila de jobs contra PostgreSQL (Micro Missão 3). Nunca usa banco
 * remoto, nunca usa mock de Supabase para fingir concorrência.
 *
 * Fluxo: resolve TEST_DATABASE_URL (Actions) ou sobe Postgres efêmero via
 * Podman (local) → espera ficar pronto → aplica as migrations → roda
 * `node --test` sobre `tests/integration/*.test.mjs` com TEST_DATABASE_URL
 * no ambiente do processo filho → sempre para e remove o container no
 * `finally`, mesmo se algo acima falhar.
 */
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

import {
  applyMigrations,
  sanitizeError,
  startEphemeralPostgres,
  stopEphemeralPostgres,
  waitForReady,
} from "./postgres-test-env.mjs";

const INTEGRATION_DIR = join("tests", "integration");

/** Resolve o glob nós mesmos (sem shell) — spawn com array de args nunca precisa de shell no Windows nem em lugar nenhum, e evita o escaping frágil de shell:true. */
function listIntegrationTestFiles() {
  return readdirSync(INTEGRATION_DIR)
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .map((name) => join(INTEGRATION_DIR, name));
}

function runTests(databaseUrl) {
  return new Promise((resolve, reject) => {
    const files = listIntegrationTestFiles();
    const child = spawn(
      process.execPath,
      ["--test", "--experimental-strip-types", ...files],
      {
        stdio: "inherit",
        env: { ...process.env, TEST_DATABASE_URL: databaseUrl },
      },
    );
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function main() {
  let container = null;
  let databaseUrl = process.env.TEST_DATABASE_URL;
  const startedLocally = !databaseUrl;

  try {
    if (startedLocally) {
      console.log("TEST_DATABASE_URL ausente — subindo PostgreSQL efêmero via Podman...");
      container = await startEphemeralPostgres();
      databaseUrl = container.databaseUrl;
    } else {
      console.log("Usando TEST_DATABASE_URL fornecida pelo ambiente.");
    }

    await waitForReady(databaseUrl);
    console.log("PostgreSQL de teste pronto.");

    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    let applied;
    try {
      applied = await applyMigrations(client);
    } finally {
      await client.end();
    }
    console.log(`Migrations aplicadas (${applied.length}): ${applied.join(", ")}`);

    const exitCode = await runTests(databaseUrl);
    process.exitCode = exitCode;
  } catch (error) {
    console.error(`test:integration:postgres falhou: ${sanitizeError(error, databaseUrl)}`);
    process.exitCode = 1;
  } finally {
    if (container) {
      console.log("Parando e removendo o container de teste...");
      await stopEphemeralPostgres(container);
    }
  }
}

await main();
