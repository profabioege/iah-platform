/**
 * Ambiente de homologação LOCAL servido por HTTP.
 *
 * Diferença para `tests/pilot/`: lá a aplicação é exercitada como
 * módulos, em processo. Aqui ela é exercitada como a escola vai usar —
 * um servidor Next de produção, requisições HTTP, cookie de sessão
 * emitido pelo Auth.js, middleware no caminho. Nenhum stub de sessão é
 * carregado: `tests/e2e/` não importa `pilot-hooks.mjs` nem nada de
 * `src/`.
 *
 * A sequência é a mesma que o fundador seguirá na homologação remota:
 *
 *   banco → migrations → missão sintética → provisionamento pela CLI
 *   → build → servidor → percurso pelo HTTP.
 *
 * As senhas iniciais nascem no provisionamento e ficam em um diretório
 * temporário do sistema, fora do repositório, apagado no fim.
 */

import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { sanitizeError, startPilotDatabase, stopPilotDatabase } from "./pilot-db-env.mjs";

/**
 * Portas fixas: o build do Next assa `NEXT_PUBLIC_SUPABASE_URL`, então a
 * URL do banco precisa ser a mesma no build e na execução. 3016 fica
 * fora das portas já ocupadas por outras candidatas (3013, 3014, 3015).
 */
export const HTTP_PORT = Number(process.env.E2E_PORT ?? 3016);
export const REST_PROXY_PORT = Number(process.env.E2E_REST_PORT ?? 54329);

const AUTH_SECRET = "homologacao-local-descartavel-nao-e-segredo-de-producao";

/** Missão da Trilha IA & Humanidades com os dois eixos (D-053). */
export const AI_MISSION_ID = "01-a-fabrica-de-noticias";
/** Missão de Geografia com os dois eixos (D-054). */
export const GEO_MISSION_ID = "02-quem-conferiu-este-dado";

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function mintRoleToken(role, secret) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(JSON.stringify({ role, iat: now, exp: now + 60 * 60 * 4 }));
  const signature = base64url(
    createHmac("sha256", secret).update(`${header}.${payload}`).digest(),
  );
  return `${header}.${payload}.${signature}`;
}

/**
 * O Next é chamado pelo seu próprio entry em JavaScript, com o mesmo
 * `node` desta execução. Chamar `npx` traria um .cmd no Windows — que o
 * Node se recusa a executar sem shell, e com shell quebraria no espaço
 * de "Program Files".
 */
const NEXT_BIN = "node_modules/next/dist/bin/next";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.quiet ? ["ignore", "pipe", "pipe"] : "inherit",
      env: options.env ?? process.env,
    });
    let saida = "";
    if (options.quiet) {
      child.stdout.on("data", (d) => (saida += d));
      child.stderr.on("data", (d) => (saida += d));
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(saida);
      else reject(new Error(`${command} ${args.join(" ")} saiu com ${code}\n${saida}`));
    });
  });
}

async function waitForHttp(url, timeoutMs = 120_000) {
  const limite = Date.now() + timeoutMs;
  while (Date.now() < limite) {
    try {
      const resposta = await fetch(url, { redirect: "manual" });
      if (resposta.status < 500) return;
    } catch {
      // servidor ainda subindo
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Servidor não respondeu em ${url} dentro do tempo.`);
}

/** CSV do provisionamento (`perfil;identificador;email;senha_inicial`). */
function parseCredentials(path) {
  const linhas = readFileSync(path, "utf8").trim().split(/\r?\n/).slice(1);
  const contas = [];
  for (const linha of linhas) {
    const [perfil, referencia, email, senha] = linha.split(";");
    contas.push({ perfil, referencia, email, senha });
  }
  return contas;
}

/**
 * Identificadores das Server Actions, lidos do bundle do próprio build.
 *
 * O cliente do Next chama uma Server Action por HTTP com o cabeçalho
 * `Next-Action: <id>`. O id e o nome da função ficam no chunk gerado
 * (`createServerReference("<id>", …, "<nome>")`). Ler daqui é o que
 * permite exercitar a ação REAL por HTTP, com o cookie de sessão real,
 * sem substituir nada da aplicação.
 */
export async function discoverServerActions(appDir = process.cwd()) {
  const { readdirSync } = await import("node:fs");
  const chunksDir = join(appDir, ".next", "static", "chunks");
  const encontrados = new Map();
  const visitar = (dir) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name);
      if (entrada.isDirectory()) visitar(caminho);
      else if (entrada.name.endsWith(".js")) {
        const conteudo = readFileSync(caminho, "utf8");
        const regex = /createServerReference\)?\("([0-9a-f]{40,})"[^)]*?"([A-Za-z0-9_]+)"\)/g;
        let m;
        while ((m = regex.exec(conteudo))) encontrados.set(m[2], m[1]);
      }
    }
  };
  visitar(chunksDir);
  return Object.fromEntries(encontrados);
}

/**
 * Sobe tudo e devolve o ambiente. `students` define o tamanho da turma
 * principal; a segunda instituição existe para os testes negativos.
 */
export async function startHttpHomologation(options = {}) {
  const { students = 45, otherStudents = 3, dbPool = 25, log = console.log } = options;

  const workdir = mkdtempSync(join(tmpdir(), "iah-homolog-"));
  let database = null;
  let server = null;

  try {
    log("1/6 Banco efêmero (PostgreSQL + PostgREST) e migrations...");
    database = await startPilotDatabase({ proxyPort: REST_PROXY_PORT, dbPool });

    const env = {
      ...process.env,
      IAH_AUTH_MODE: "supabase",
      AUTH_SECRET,
      NEXTAUTH_URL: `http://127.0.0.1:${HTTP_PORT}`,
      AUTH_URL: `http://127.0.0.1:${HTTP_PORT}`,
      AUTH_TRUST_HOST: "true",
      NEXT_PUBLIC_SUPABASE_URL: database.supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: mintRoleToken("service_role", database.jwtSecret),
      SUPABASE_JWT_SECRET: database.jwtSecret,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: mintRoleToken("anon", database.jwtSecret),
      PILOT_TEST_DATABASE_URL: database.databaseUrl,
      NEXT_PUBLIC_BUILD_COMMIT: process.env.E2E_COMMIT ?? "local",
      NEXT_PUBLIC_BUILD_BRANCH: "pilot/beryon-40-alunos",
      NEXT_PUBLIC_BUILD_ENVIRONMENT: "homologacao-local",
      NEXT_TELEMETRY_DISABLED: "1",
      // Mesmo fuso do servidor hospedado (Vercel = UTC): horários exibidos
      // têm de sair em Brasília mesmo assim (formatSchoolDateTime).
      TZ: "UTC",
    };

    log("2/6 Missões no catálogo (sintética + Missões 01 e 02 da Trilha IA & Humanidades)...");
    await run(process.execPath, ["scripts/pilot-seed-mission.mjs", "--execute"], {
      env,
      quiet: true,
    });
    // Missão de dois eixos (D-053). O conteúdo está no código
    // (src/content/missions); a tabela `missions` é só o registro.
    await run(
      process.execPath,
      [
        "scripts/pilot-seed-mission.mjs",
        `--id=${AI_MISSION_ID}`,
        "--number=1",
        "--title=A Fábrica de Notícias",
        "--module=Módulo 1 — O Auditor da Realidade",
        "--execute",
      ],
      { env, quiet: true },
    );
    await run(
      process.execPath,
      [
        "scripts/pilot-seed-mission.mjs",
        `--id=${GEO_MISSION_ID}`,
        "--number=2",
        "--title=Quem Conferiu Este Dado?",
        "--module=Módulo 1 — O Auditor da Realidade",
        "--execute",
      ],
      { env, quiet: true },
    );

    log(`3/6 Provisionamento pela CLI real (${students} + ${otherStudents} contas)...`);
    const turmas = [];
    for (const [prefixo, total] of [
      ["beryon", students],
      ["outra", otherStudents],
    ]) {
      const rosterPath = join(workdir, `turma-${prefixo}.json`);
      const credPath = join(workdir, `credenciais-${prefixo}.csv`);
      await run(
        process.execPath,
        ["scripts/pilot-roster.mjs", `--students=${total}`, `--prefix=${prefixo}`, `--out=${rosterPath}`],
        { env, quiet: true },
      );
      await run(
        process.execPath,
        [
          "--experimental-strip-types",
          "scripts/pilot-provision.mjs",
          `--roster=${rosterPath}`,
          "--execute",
          `--confirm-institution=inst-${prefixo}`,
          "--actor=cli:homologacao-local",
          `--credentials-out=${credPath}`,
        ],
        { env, quiet: true },
      );
      turmas.push({
        prefixo,
        institutionId: `inst-${prefixo}`,
        classroomId: `class-${prefixo}-1`,
        contas: parseCredentials(credPath),
      });
    }

    log("4/6 Build de produção com a configuração de homologação...");
    await run(process.execPath, [NEXT_BIN, "build"], { env, quiet: true });

    log("5/6 Servidor Next (modo persistente)...");
    server = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(HTTP_PORT), "-H", "127.0.0.1"], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    // O erro de uma Server Action não viaja na resposta: em produção o
    // Next manda só um digest. Quem conta o que aconteceu é o log do
    // servidor, então ele fica visível aqui em vez de morrer num array.
    const logs = [];
    const registrar = (dados) => {
      const texto = String(dados);
      logs.push(texto);
      for (const linha of texto.split(/\r?\n/)) {
        if (linha.trim()) console.log("[servidor] " + linha);
      }
    };
    server.stdout.on("data", registrar);
    server.stderr.on("data", registrar);
    const baseUrl = `http://127.0.0.1:${HTTP_PORT}`;
    await waitForHttp(`${baseUrl}/entrar`);

    log("6/6 Identificadores das Server Actions do build...");
    const actions = await discoverServerActions();

    return {
      baseUrl,
      env,
      database,
      server,
      serverLogs: logs,
      workdir,
      turmas,
      actions,
      missionId: "missao-sintetica-01",
      aiMissionId: AI_MISSION_ID,
      geoMissionId: GEO_MISSION_ID,
    };
  } catch (error) {
    if (server) server.kill();
    await stopPilotDatabase(database);
    rmSync(workdir, { recursive: true, force: true });
    throw new Error(sanitizeError(error, database?.jwtSecret));
  }
}

export async function stopHttpHomologation(ambiente) {
  if (!ambiente) return;
  try {
    ambiente.server?.kill();
  } catch {
    // servidor já encerrado
  }
  await stopPilotDatabase(ambiente.database);
  // As senhas iniciais vivem só durante o ensaio.
  rmSync(ambiente.workdir, { recursive: true, force: true });
}
