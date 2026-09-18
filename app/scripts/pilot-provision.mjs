#!/usr/bin/env node
/**
 * Provisionamento do piloto — CLI administrativa.
 *
 * Uso (sempre a partir de app/):
 *
 *   # 1. simulação: mostra o plano, não escreve nada
 *   node --experimental-strip-types scripts/pilot-provision.mjs --roster=./turma.json
 *
 *   # 2. execução: exige as duas confirmações
 *   node --experimental-strip-types scripts/pilot-provision.mjs \
 *     --roster=./turma.json --execute --confirm-institution=<id-da-instituicao> \
 *     --credentials-out=./credenciais-para-a-escola.csv
 *
 * Regras que o script aplica, não negocia:
 *  - simulação é o padrão; escrever exige `--execute` E o id da instituição;
 *  - o destino é conferido antes de qualquer escrita: URL de banco que
 *    pareça produção é recusada sem `--i-know-this-is-not-production`;
 *  - as credenciais iniciais são individuais e só existem na saída desta
 *    execução (arquivo fora do Git, entregue pela escola). Nunca vão para
 *    o banco em texto, nem para a trilha administrativa, nem para o log;
 *  - repetir é seguro: contas e matrículas existentes são reconhecidas.
 *
 * O arquivo de turma é JSON no formato de `PilotRoster`
 * (ver src/modules/identity/provisioning/pilot-provisioning.ts).
 */

import { readFileSync, writeFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { provisionPilotClass } from "../src/modules/identity/provisioning/pilot-provisioning.ts";

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  return process.argv.includes(`--${name}`) ? true : fallback;
}

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no ambiente " +
      "desta execução (não leia .env do projeto: exporte as variáveis na sessão).",
  );
}

const execute = arg("execute", false) === true;
const rosterPath = arg("roster");
const confirmInstitution = arg("confirm-institution");
const credentialsOut = arg("credentials-out");
const allowNonLocal = arg("i-know-this-is-not-production", false) === true;
const actor = String(arg("actor", "cli:operador-nao-identificado"));

if (!rosterPath) fail("Informe --roster=<arquivo.json> com a turma.");

/**
 * Trava de destino. Sem a confirmação explícita, só banco local passa —
 * o procedimento precisa recusar produção por padrão.
 */
const host = new URL(url).hostname.toLowerCase();
const local = host === "127.0.0.1" || host === "localhost" || host === "::1";
if (!local && !allowNonLocal) {
  fail(
    `Destino remoto recusado (${host}). Este script só escreve em banco local por padrão. ` +
      "Para um ambiente de homologação dedicado, repita com " +
      "--i-know-this-is-not-production (e nunca aponte para produção).",
  );
}

let roster;
try {
  roster = JSON.parse(readFileSync(rosterPath, "utf8"));
} catch (error) {
  fail(`Não foi possível ler ${rosterPath}: ${error.message}`);
}

if (execute && confirmInstitution !== roster.institution?.id) {
  fail(
    "Execução exige --confirm-institution=<id> igual ao do arquivo " +
      `(esperado "${roster.institution?.id}").`,
  );
}

const db = createClient(url, serviceRole, { auth: { persistSession: false } });

const report = await provisionPilotClass(db, roster, { dryRun: !execute, actor });

const rotulo = report.dryRun ? "SIMULAÇÃO (nada foi escrito)" : "EXECUÇÃO";
console.log(`\n== Provisionamento — ${rotulo}`);
console.log(`Instituição: ${report.institutionId}`);
console.log(`Turma:       ${report.classroomId}`);
console.log(
  `Contas:      ${report.summary.created} a criar/criadas · ` +
    `${report.summary.existing} já existentes · ${report.summary.failed} com falha`,
);
console.log(
  `Matrículas:  ${report.enrollments.created} novas · ` +
    `${report.enrollments.existing} existentes · ${report.enrollments.failed} com falha`,
);

for (const conta of report.accounts.filter((a) => a.outcome === "falhou")) {
  console.error(`  ✖ ${conta.kind} ${conta.reference} (${conta.email}): ${conta.error}`);
}

if (!report.dryRun) {
  const criadas = report.accounts.filter((a) => a.temporaryPassword);
  if (criadas.length > 0) {
    if (!credentialsOut) {
      fail(
        "As credenciais iniciais foram geradas, mas --credentials-out não foi informado. " +
          "Repita a execução informando o arquivo de saída (elas não são recuperáveis depois).",
      );
    }
    const linhas = [
      "perfil;identificador;email;senha_inicial",
      ...criadas.map((a) => `${a.kind};${a.reference};${a.email};${a.temporaryPassword}`),
    ];
    writeFileSync(credentialsOut, `${linhas.join("\n")}\n`, { encoding: "utf8" });
    console.log(
      `\nCredenciais iniciais gravadas em ${credentialsOut} — entregue individualmente ` +
        "pela escola e apague o arquivo depois. Elas exigem troca no primeiro acesso.",
    );
  }
}

if (report.summary.failed > 0) process.exitCode = 2;
