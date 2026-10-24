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
  importAfterPrecheck,
  maskEmail,
  parseClassCsv,
  precheckClassRows,
  precheckParticipantEmails,
  precheckRosterAgainstDatabase,
  staffFromConfig,
  toPilotStudents,
  validatePilotConfig,
} from "../src/modules/identity/provisioning/class-csv-import.ts";

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  return process.argv.includes(`--${name}`) ? true : fallback;
}

// Códigos de saída da prévia: 0 = concluída e apta; 2 = bloqueios de dados ou
// conflitos; 3 = configuração ausente ou inválida (argumentos, JSON, variáveis
// de ambiente, alvo não autorizado); qualquer outro não zero = falha técnica.
const EXIT_CONFIG = 3;

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function failConfig(message) {
  console.error(`✖ ${message}`);
  process.exit(EXIT_CONFIG);
}

/** Variáveis exigidas pela prévia com banco (só os NOMES aparecem em mensagens). */
const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "IAH_HOMOLOGATION_PROJECT_REF",
  "IAH_PROTECTED_PROJECT_REFS",
];

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
function insideRepo(path) {
  const abs = resolve(path);
  return abs === repoRoot || abs.startsWith(repoRoot + sep);
}

const configPath = arg("config");
const csvPath = arg("csv");
const offline = arg("offline", false) === true;
const execute = arg("execute", false) === true;
if (!configPath || !csvPath) failConfig("Informe --config=<arquivo.json> e --csv=<arquivo.csv>.");
if (offline && execute) failConfig("--offline não combina com --execute.");

let config;
try {
  config = JSON.parse(readFileSync(configPath, "utf8"));
} catch (error) {
  failConfig(`Não foi possível ler ${configPath}: ${error.message}`);
}
// Configuração completa ANTES de qualquer acesso ao banco: campos obrigatórios
// preenchidos, sem "PREENCHER" do modelo e e-mails válidos de professor e gestores.
const configIssues = validatePilotConfig(config);
if (configIssues.length > 0) {
  console.error(`✖ Configuração incompleta ou inválida (${configIssues.length}) — nada foi consultado:`);
  for (const issue of configIssues) console.error(`  - ${issue.path}: ${issue.message}`);
  process.exit(EXIT_CONFIG);
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

const staff = staffFromConfig(config);
const staffEmail = new Map(staff.map((p) => [p.reference, p.email]));
const target = { institutionId: config.institution.id, classroomId: config.classroom.id };

let dbCheck = null;
let db = null;
if (!offline) {
  // Antes de qualquer conexão: todas as variáveis presentes (só os nomes são exibidos).
  const missingEnv = REQUIRED_ENV.filter((name) => !(process.env[name] ?? "").trim());
  if (missingEnv.length > 0) {
    console.error("✖ Variáveis de ambiente ausentes nesta janela — banco não consultado:");
    for (const name of missingEnv) console.error(`  FALTA   ${name}`);
    console.error("Defina-as na janela do operador e rode de novo (ou use --offline).");
    process.exit(EXIT_CONFIG);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { assertAuthorizedTarget } = await import("./pilot-target-guard.mjs");
  let alvo;
  try {
    alvo = assertAuthorizedTarget(url, { confirmProject: arg("confirm-project"), operation: "importar a turma" });
  } catch (error) {
    failConfig(error instanceof Error ? error.message : String(error));
  }
  console.log(`Destino:                     ${alvo.descricao}`);
  const { createClient } = await import("@supabase/supabase-js");
  db = createClient(url, serviceRole, { auth: { persistSession: false } });
  dbCheck = await precheckRosterAgainstDatabase(db, report.rows, staff, target);
  console.log(`Contas de aluno a criar:     ${dbCheck.students.toCreate}`);
  console.log(`Alunos existentes a vincular:${String(dbCheck.students.toLink).padStart(2)}`);
  console.log(`Alunos já vinculados:        ${dbCheck.students.alreadyLinked}`);
  console.log("\nPor papel (instituição " + config.institution.id + "):");
  console.log("  papel           total  novas  compatíveis  bloqueadas");
  for (const papel of ["aluno", "professor", "administrador"]) {
    const c = dbCheck.byRole[papel];
    console.log(
      `  ${papel.padEnd(14)}${String(c.total).padStart(6)}${String(c.novas).padStart(7)}` +
        `${String(c.compativeis).padStart(13)}${String(c.bloqueadas).padStart(12)}`,
    );
  }
  for (const e of dbCheck.staff) {
    console.log(`  ${e.reference.padEnd(10)} (${e.role}) ${maskEmail(staffEmail.get(e.reference) ?? "")}: ${e.state}`);
  }
} else {
  console.log("Banco:                       não consultado (--offline) — contas existentes não verificadas.");
  console.log(`Professor e gestores:        ${staff.length} na configuração (contas não verificadas no banco).`);
}

// No modo com banco, o cruzamento de e-mails entre papéis já vem em dbCheck.issues.
const issues = [...report.issues, ...(dbCheck ? dbCheck.issues : precheckParticipantEmails(report.rows, staff))];
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
    const refs = issue.refs?.length
      ? ` — ${issue.refs.map((r) => `${r} (${maskEmail(staffEmail.get(r) ?? "")})`).join(", ")}`
      : "";
    console.log(`  [${marca}] ${issue.message}${linhas}${refs}`);
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
// A prévia completa (alunos, professor e gestores) é repetida imediatamente
// antes da primeira gravação; com qualquer bloqueio, nada é escrito.
const guarded = await importAfterPrecheck(db, report.rows, staff, target, () =>
  provisionPilotClass(db, roster, {
    dryRun: false,
    actor: String(arg("actor", "cli:operador-nao-identificado")),
  }),
);
if (guarded.result === null) {
  for (const issue of guarded.precheck.issues.filter((i) => i.blocking)) console.error(`  [BLOQUEIA] ${issue.message}`);
  fail("Importação recusada inteira: a prévia repetida antes da gravação encontrou bloqueio. Nada foi escrito.");
}
const result = guarded.result;

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
