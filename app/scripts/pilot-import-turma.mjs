#!/usr/bin/env node
/**
 * Importação da turma do piloto a partir de CSV (nome,email_institucional,turma).
 *
 * Uso (a partir de app/; arquivos reais SEMPRE fora do repositório):
 *
 *   # 1. validação prévia — só lê; não escreve nada
 *   node --experimental-strip-types scripts/pilot-import-turma.mjs \
 *     --config=C:\piloto\piloto-1a.json --csv=C:\piloto\alunos-1a.csv
 *
 *   # 1b. validação só do arquivo, sem banco (antes de ter o ambiente)
 *   node --experimental-strip-types scripts/pilot-import-turma.mjs \
 *     --config=... --csv=... --offline
 *
 *   # 2. importação — exige zero divergências e três confirmações
 *   node --experimental-strip-types scripts/pilot-import-turma.mjs \
 *     --config=... --csv=... --execute \
 *     --confirm-institution=<id> --confirm-total=<n> --confirm-project=<ref> \
 *     --credentials-out=C:\piloto\credenciais-1a.csv --actor="cli:fabio"
 *
 * O relatório cita número de linha e e-mail mascarado; nunca o nome nem a
 * senha. As senhas iniciais vão só para o arquivo --credentials-out, que
 * precisa estar fora do repositório.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  maskEmail,
  parseClassCsv,
  precheckAgainstDatabase,
  precheckClassRows,
  toPilotStudents,
} from "../src/modules/identity/provisioning/class-csv-import.ts";

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  return process.argv.includes(`--${name}`) ? true : fallback;
}

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
function insideRepo(path) {
  const abs = resolve(path);
  return abs === repoRoot || abs.startsWith(repoRoot + sep);
}

const configPath = arg("config");
const csvPath = arg("csv");
const offline = arg("offline", false) === true;
const execute = arg("execute", false) === true;
if (!configPath || !csvPath) fail("Informe --config=<arquivo.json> e --csv=<arquivo.csv>.");
if (offline && execute) fail("--offline não combina com --execute.");

let config;
try {
  config = JSON.parse(readFileSync(configPath, "utf8"));
} catch (error) {
  fail(`Não foi possível ler ${configPath}: ${error.message}`);
}
for (const key of ["institution", "academicYear", "classroom", "teacher", "managers", "expected"]) {
  if (!config[key]) fail(`Configuração sem "${key}".`);
}

const parsed = parseClassCsv(readFileSync(csvPath, "utf8"));
const report = precheckClassRows(parsed, config.expected);

console.log(`\n== Validação prévia — ${config.classroom.name} (${config.institution.id})`);
console.log(`Total no arquivo:            ${report.total} (lista institucional: ${config.expected.expectedTotal})`);
console.log(`${`Da ${config.expected.className}:`.padEnd(29)}${report.inAuthorizedClass}`);
console.log(`De outra turma:              ${report.outOfClass}`);
console.log(
  `Domínios encontrados:        ${Object.entries(report.domainsFound).map(([d, n]) => `${d} (${n})`).join(", ") || "—"}`,
);

let dbCheck = null;
let db = null;
if (!offline) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    fail("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no ambiente (ou use --offline).");
  }
  const { assertAuthorizedTarget } = await import("./pilot-target-guard.mjs");
  let alvo;
  try {
    alvo = assertAuthorizedTarget(url, { confirmProject: arg("confirm-project"), operation: "importar a turma" });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  console.log(`Destino:                     ${alvo.descricao}`);
  const { createClient } = await import("@supabase/supabase-js");
  db = createClient(url, serviceRole, { auth: { persistSession: false } });
  dbCheck = await precheckAgainstDatabase(db, report.rows, {
    institutionId: config.institution.id,
    classroomId: config.classroom.id,
  });
  console.log(`Contas a criar:              ${dbCheck.toCreate}`);
  console.log(`Existentes a vincular:       ${dbCheck.toLink}`);
  console.log(`Já vinculadas à turma:       ${dbCheck.alreadyLinked}`);
} else {
  console.log("Banco:                       não consultado (--offline) — contas existentes não verificadas.");
}

const issues = [...report.issues, ...(dbCheck?.issues ?? [])];
const rowByLine = new Map(report.rows.map((r) => [r.line, r]));
if (issues.length === 0) {
  console.log("\nDivergências:                nenhuma.");
} else {
  console.log("\nDivergências e avisos:");
  for (const issue of issues) {
    const marca = issue.blocking ? "BLOQUEIA" : "aviso   ";
    const linhas = issue.lines.length
      ? ` — linhas ${issue.lines
          .map((l) => {
            const email = rowByLine.get(l)?.email;
            return email ? `${l} (${maskEmail(email)})` : String(l);
          })
          .join(", ")}`
      : "";
    console.log(`  [${marca}] ${issue.message}${linhas}`);
  }
}
const blocking = issues.some((i) => i.blocking);

if (!execute) {
  console.log(
    blocking
      ? "\nResultado: NÃO IMPORTAR — corrija as divergências com a escola e valide de novo."
      : "\nResultado: apto para importar (nada foi escrito).",
  );
  process.exit(blocking ? 2 : 0);
}

// ---------------------------------------------------------------- execução
if (blocking) fail("Importação recusada: há divergências bloqueantes.");
if (arg("confirm-institution") !== config.institution.id) {
  fail(`Execução exige --confirm-institution=${config.institution.id}.`);
}
if (Number(arg("confirm-total")) !== report.total) {
  fail(`Execução exige --confirm-total=${report.total} (o total que você conferiu com a escola).`);
}
const credentialsOut = arg("credentials-out");
if (!credentialsOut || credentialsOut === true) fail("Informe --credentials-out=<arquivo fora do repositório>.");
if (insideRepo(credentialsOut)) fail("--credentials-out precisa ficar FORA do repositório (dados reais não entram no Git).");
if (insideRepo(csvPath) || insideRepo(configPath)) {
  fail("A lista e a configuração reais precisam ficar FORA do repositório.");
}
if (existsSync(credentialsOut)) fail(`${credentialsOut} já existe — escolha outro nome (não sobrescrevo credenciais).`);

const { provisionPilotClass } = await import("../src/modules/identity/provisioning/pilot-provisioning.ts");
const roster = {
  institution: config.institution,
  academicYear: config.academicYear,
  classroom: config.classroom,
  teacher: config.teacher,
  managers: config.managers,
  students: toPilotStudents(report.rows, config.institution.id),
};
const result = await provisionPilotClass(db, roster, {
  dryRun: false,
  actor: String(arg("actor", "cli:operador-nao-identificado")),
});

console.log(`\n== Importação concluída`);
console.log(
  `Contas: ${result.summary.created} criadas · ${result.summary.existing} já existentes · ${result.summary.failed} com falha`,
);
console.log(
  `Matrículas na ${config.classroom.name}: ${result.enrollments.created} novas · ${result.enrollments.existing} existentes · ${result.enrollments.failed} com falha`,
);
for (const conta of result.accounts.filter((a) => a.outcome === "falhou")) {
  console.error(`  ✖ ${conta.kind} ${maskEmail(conta.email)}: ${conta.error}`);
}

const criadas = result.accounts.filter((a) => a.temporaryPassword);
if (criadas.length > 0) {
  const nomePorEmail = new Map(report.rows.map((r) => [r.email, r.nome]));
  const linhas = [
    "perfil;nome;email;senha_inicial",
    ...criadas.map(
      (a) => `${a.kind};${nomePorEmail.get(a.email) ?? a.reference};${a.email};${a.temporaryPassword}`,
    ),
  ];
  writeFileSync(credentialsOut, `\uFEFF${linhas.join("\n")}\n`, { encoding: "utf8", flag: "wx" });
  console.log(
    `\n${criadas.length} credencial(is) inicial(is) gravada(s) em ${credentialsOut}. ` +
      "Imprima e recorte uma por aluno; apague o arquivo depois da aula. Troca obrigatória no primeiro acesso.",
  );
}
if (result.summary.failed > 0) process.exitCode = 2;
