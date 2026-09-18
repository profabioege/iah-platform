#!/usr/bin/env node
/**
 * Testes de integração do piloto — aplicação real contra banco real.
 *
 * Sobe PostgreSQL + PostgREST efêmeros (`pilot-db-env.mjs`), aplica as
 * migrations versionadas e roda `tests/pilot/*.test.mjs` com a instância
 * configurada em MODO REAL (`IAH_AUTH_MODE=supabase`). Os testes usam o
 * código da aplicação — repositórios, serviços e Server Actions — não
 * SQL escrito à parte.
 *
 * Nenhum segredo de produção participa: as chaves são geradas aqui,
 * valem só para os contêineres desta execução e morrem com eles.
 */

import { createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

import {
  sanitizeError,
  startPilotDatabase,
  stopPilotDatabase,
} from "./pilot-db-env.mjs";

const TESTS_DIR = join("tests", "pilot");

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** JWT de papel fixo (service_role) para o caminho administrativo. */
function mintRoleToken(role, secret) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({ role, iat: now, exp: now + 60 * 60 * 4 }),
  );
  const signature = base64url(
    createHmac("sha256", secret).update(`${header}.${payload}`).digest(),
  );
  return `${header}.${payload}.${signature}`;
}

function listTests() {
  return readdirSync(TESTS_DIR)
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .map((name) => join(TESTS_DIR, name));
}

function runTests(env) {
  return new Promise((resolve, reject) => {
    const files = process.argv.slice(2).filter((a) => a.endsWith(".test.mjs"));
    const child = spawn(
      process.execPath,
      [
        "--test",
        // Em série: as suítes compartilham o MESMO banco efêmero e cada
        // uma limpa o estado no começo. Em paralelo, uma apagaria os
        // dados da outra no meio da execução.
        "--test-concurrency=1",
        "--experimental-strip-types",
        ...(files.length ? files : listTests()),
      ],
      { stdio: "inherit", env },
    );
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function main() {
  let database = null;
  try {
    console.log("Subindo PostgreSQL + PostgREST efêmeros (Podman)...");
    database = await startPilotDatabase();
    console.log(
      `Migrations aplicadas (${database.appliedMigrations.length}): ` +
        database.appliedMigrations.join(", "),
    );
    console.log(`API do banco (proxy /rest/v1): ${database.supabaseUrl}`);

    const childEnv = {
      ...process.env,
      IAH_AUTH_MODE: "supabase",
      AUTH_SECRET: "auth-secret-descartavel-do-teste-do-piloto",
      NEXT_PUBLIC_SUPABASE_URL: database.supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: mintRoleToken("service_role", database.jwtSecret),
      SUPABASE_JWT_SECRET: database.jwtSecret,
      PILOT_TEST_DATABASE_URL: database.databaseUrl,
    };

    const exitCode = await runTests(childEnv);
    process.exitCode = exitCode;
  } catch (error) {
    console.error(`✖ ${sanitizeError(error, database?.jwtSecret)}`);
    process.exitCode = 1;
  } finally {
    await stopPilotDatabase(database);
    console.log("Ambiente efêmero removido.");
  }
}

await main();
