#!/usr/bin/env node
/**
 * Ambiente de banco do piloto — PostgreSQL + PostgREST efêmeros.
 *
 * Por que PostgREST e não só Postgres: a aplicação fala com o banco pelo
 * `@supabase/supabase-js`, que é um cliente HTTP do PostgREST. Testar
 * contra Postgres puro provaria o SQL, não o caminho real — e, pior,
 * passaria por cima das policies, que dependem de `request.jwt.claims`
 * preenchido pelo PostgREST a partir do JWT. Aqui sobem os dois
 * componentes que o Supabase usa, com o mesmo contrato:
 *
 *   supabase-js → proxy local (/rest/v1 → /) → PostgREST → Postgres
 *
 * O proxy existe porque o supabase-js prefixa `/rest/v1` e o PostgREST
 * serve na raiz; ele não altera corpo, método, cabeçalhos nem status.
 *
 * Nada aqui toca banco remoto: o alvo é sempre um contêiner criado e
 * destruído por este script, e `assertDisposableTarget` recusa qualquer
 * string de conexão que não seja local.
 */

import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createSocketServer } from "node:net";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { request as httpRequest } from "node:http";

import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "db", "migrations");
const execFileAsync = promisify(execFile);

const POSTGRES_IMAGE = "docker.io/library/postgres:16.4";
const POSTGREST_IMAGE = "docker.io/postgrest/postgrest:v12.2.3";

const DISPOSABLE_USER = "iah_pilot";
const DISPOSABLE_PASSWORD = "iah_pilot_only_local";
const DISPOSABLE_DB = "iah_pilot_test";
const AUTHENTICATOR_PASSWORD = "iah_authenticator_only_local";

/** Segredo do JWT do ambiente de teste — descartável, nunca de produção. */
export const TEST_JWT_SECRET =
  "segredo-de-teste-local-do-piloto-iah-32-bytes-ou-mais";

export function sanitizeError(error, secret) {
  const message = error instanceof Error ? error.message : String(error);
  return secret ? message.split(secret).join("[omitido]") : message;
}

/**
 * Trava de destino: o ambiente de teste só aceita banco local e
 * descartável. Qualquer coisa que pareça remoto (supabase.co, host
 * público, porta 5432 fora de loopback) é recusada antes de qualquer
 * migration — a auditoria pediu explicitamente que o procedimento se
 * recuse a apontar para produção.
 */
export function assertDisposableTarget(databaseUrl) {
  const url = new URL(databaseUrl);
  const host = url.hostname.toLowerCase();
  const local = host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (!local) {
    throw new Error(
      `Destino recusado: ${host}. O ambiente de teste do piloto só opera ` +
        "contra banco local descartável — nunca contra Supabase remoto.",
    );
  }
  if (!url.pathname.includes("test")) {
    throw new Error(
      `Destino recusado: banco "${url.pathname.slice(1)}" não parece ` +
        'descartável (o nome precisa conter "test").',
    );
  }
  return true;
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createSocketServer();
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
    return await execFileAsync("podman", args, { windowsHide: true, maxBuffer: 1 << 24 });
  } catch (error) {
    throw new Error(`podman ${args.slice(0, 2).join(" ")}: ${sanitizeError(error)}`);
  }
}

async function waitForPostgres(databaseUrl, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
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
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`PostgreSQL não respondeu: ${sanitizeError(lastError)}`);
}

async function waitForPostgrest(port, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = 0;
  while (Date.now() < deadline) {
    try {
      const status = await new Promise((resolve, reject) => {
        const req = httpRequest(
          { host: "127.0.0.1", port, path: "/", method: "GET" },
          (res) => {
            res.resume();
            resolve(res.statusCode ?? 0);
          },
        );
        req.on("error", reject);
        req.end();
      });
      lastStatus = status;
      if (status > 0 && status < 500) return;
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`PostgREST não respondeu (último status ${lastStatus}).`);
}

/** Papéis que o Supabase já traz prontos e o contêiner puro não tem. */
async function bootstrapRoles(client) {
  await client.query(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'service_role') then
        create role service_role nologin bypassrls;
      else
        alter role service_role bypassrls;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'postgres') then
        create role postgres nologin;
      end if;
    end $$;
  `);
}

/** `authenticator` é o papel de conexão do PostgREST; ele só troca de papel. */
async function bootstrapAuthenticator(client) {
  await client.query(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'authenticator') then
        create role authenticator login password '${AUTHENTICATOR_PASSWORD}' noinherit;
      end if;
    end $$;
  `);
  await client.query("grant anon, service_role to authenticator");
  await client.query(`
    do $$ begin
      if exists (select 1 from pg_roles where rolname = 'iah_app') then
        grant iah_app to authenticator;
      end if;
    end $$;
  `);
}

export async function applyMigrations(client) {
  await bootstrapRoles(client);
  const files = readdirSync(MIGRATIONS_DIR).filter((n) => n.endsWith(".sql")).sort();
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
  await bootstrapAuthenticator(client);
  return applied;
}

/**
 * Proxy `/rest/v1/*` → PostgREST `/*`. É o mesmo caminho do Supabase
 * hospedado; nada da requisição é reescrito além do prefixo.
 */
function startRestProxy(postgrestPort, port) {
  const server = createServer((req, res) => {
    const path = req.url.startsWith("/rest/v1")
      ? req.url.slice("/rest/v1".length) || "/"
      : req.url;
    const proxied = httpRequest(
      {
        host: "127.0.0.1",
        port: postgrestPort,
        path,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${postgrestPort}` },
      },
      (upstream) => {
        res.writeHead(upstream.statusCode ?? 502, upstream.headers);
        upstream.pipe(res);
      },
    );
    proxied.on("error", (error) => {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: "proxy: " + error.message }));
    });
    req.pipe(proxied);
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

/**
 * Sobe o ambiente completo e devolve o que a aplicação precisa para
 * apontar para ele: a URL "Supabase" (proxy) e a conexão direta ao
 * Postgres (migrations e verificações do próprio teste).
 */
export async function startPilotDatabase(options = {}) {
  // A porta do proxy pode ser fixada: o build do Next assa
  // NEXT_PUBLIC_SUPABASE_URL, então o ensaio por HTTP precisa que a URL
  // do build e a do servidor coincidam.
  const { proxyPort: fixedProxyPort = null, dbPool = 20 } = options;
  const network = `iah-pilot-net-${process.pid}-${Date.now()}`;
  const pgName = `iah-pilot-pg-${process.pid}-${Date.now()}`;
  const restName = `iah-pilot-rest-${process.pid}-${Date.now()}`;
  const pgPort = await findFreePort();
  const restPort = await findFreePort();
  const proxyPort = fixedProxyPort ?? (await findFreePort());

  await podman(["network", "create", network]);
  await podman([
    "run", "--rm", "-d", "--name", pgName, "--network", network,
    "-p", `127.0.0.1:${pgPort}:5432`,
    "-e", `POSTGRES_USER=${DISPOSABLE_USER}`,
    "-e", `POSTGRES_PASSWORD=${DISPOSABLE_PASSWORD}`,
    "-e", `POSTGRES_DB=${DISPOSABLE_DB}`,
    POSTGRES_IMAGE,
  ]);

  const databaseUrl = `postgresql://${DISPOSABLE_USER}:${DISPOSABLE_PASSWORD}@127.0.0.1:${pgPort}/${DISPOSABLE_DB}`;
  assertDisposableTarget(databaseUrl);
  await waitForPostgres(databaseUrl);

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  let applied;
  try {
    applied = await applyMigrations(client);
  } finally {
    await client.end();
  }

  await podman([
    "run", "--rm", "-d", "--name", restName, "--network", network,
    "-p", `127.0.0.1:${restPort}:3000`,
    "-e", `PGRST_DB_URI=postgresql://authenticator:${AUTHENTICATOR_PASSWORD}@${pgName}:5432/${DISPOSABLE_DB}`,
    "-e", "PGRST_DB_SCHEMAS=public",
    "-e", "PGRST_DB_ANON_ROLE=anon",
    "-e", `PGRST_JWT_SECRET=${TEST_JWT_SECRET}`,
    "-e", `PGRST_DB_POOL=${dbPool}`,
    POSTGREST_IMAGE,
  ]);
  await waitForPostgrest(restPort);
  const proxy = await startRestProxy(restPort, proxyPort);

  return {
    network,
    containers: [restName, pgName],
    proxy,
    databaseUrl,
    supabaseUrl: `http://127.0.0.1:${proxyPort}`,
    jwtSecret: TEST_JWT_SECRET,
    appliedMigrations: applied,
  };
}

export async function stopPilotDatabase(env) {
  if (!env) return;
  try {
    await new Promise((resolve) => env.proxy?.close(resolve));
  } catch {
    // proxy já fechado
  }
  for (const name of env.containers ?? []) {
    await podman(["rm", "-f", name]).catch(() => {});
  }
  await podman(["network", "rm", "-f", env.network]).catch(() => {});
}
