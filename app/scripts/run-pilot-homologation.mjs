#!/usr/bin/env node
/**
 * Homologação local: sobe o ambiente HTTP e roda as suítes de `tests/e2e`.
 *
 *   npm run test:homologacao
 *   npm run test:homologacao -- tests/e2e/percurso-pedagogico.test.mjs
 *
 * Diferença para `npm run test:pilot`: lá a aplicação é exercitada como
 * módulos; aqui ela é um servidor Next de produção e os testes falam com
 * ele pela rede, com login normal. As duas coisas são necessárias e
 * nenhuma substitui a outra.
 *
 * Nada aqui toca banco remoto: o ambiente inteiro nasce e morre nesta
 * execução.
 */

import { spawn } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { startHttpHomologation, stopHttpHomologation } from "./pilot-http-env.mjs";

const TESTS_DIR = join("tests", "e2e");

function listarSuites() {
  return readdirSync(TESTS_DIR)
    .filter((nome) => nome.endsWith(".test.mjs"))
    .sort()
    .map((nome) => join(TESTS_DIR, nome));
}

function rodar(arquivos, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "--test",
        // Em série: as suítes compartilham o mesmo servidor e o mesmo
        // banco, e várias mexem em credenciais das mesmas contas.
        "--test-concurrency=1",
        ...arquivos,
      ],
      { stdio: "inherit", env },
    );
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

let ambiente = null;
try {
  const alunos = Number(process.env.E2E_ALUNOS ?? 45);
  ambiente = await startHttpHomologation({ students: alunos });

  const arquivoAmbiente = join(ambiente.workdir, "ambiente.json");
  writeFileSync(
    arquivoAmbiente,
    JSON.stringify({
      baseUrl: ambiente.baseUrl,
      actions: ambiente.actions,
      missionId: ambiente.missionId,
      turmas: ambiente.turmas,
      supabaseUrl: ambiente.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: ambiente.env.SUPABASE_SERVICE_ROLE_KEY,
      databaseUrl: ambiente.env.PILOT_TEST_DATABASE_URL,
    }),
    "utf8",
  );

  const escolhidos = process.argv.slice(2).filter((a) => a.endsWith(".test.mjs"));
  console.log(`\nServidor de homologação: ${ambiente.baseUrl}\n`);
  process.exitCode = await rodar(escolhidos.length ? escolhidos : listarSuites(), {
    ...process.env,
    E2E_AMBIENTE: arquivoAmbiente,
  });
} catch (error) {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await stopHttpHomologation(ambiente);
  console.log("Ambiente de homologação removido.");
}
