#!/usr/bin/env node
/**
 * Cópia de segurança RESTRITA, imediatamente antes da importação real
 * (ver scripts/pilot-backup-pre-importacao-lib.mjs).
 *
 * Uso (a partir de app/; config e lista reais SEMPRE fora do repositório):
 *
 *   # criar — roda a prévia completa antes e só copia se ela estiver apta
 *   node --experimental-strip-types scripts/pilot-backup-pre-importacao.mjs \
 *     --config=C:\piloto\restrito\lista-1a\piloto-1a.json \
 *     --csv=C:\piloto\restrito\lista-1a\alunos-1a.csv \
 *     --confirm-project=feyfodhcvytcxtjjlarj
 *
 *   # verificar — recalcula hashes, contagens e escopo a partir dos arquivos
 *   node --experimental-strip-types scripts/pilot-backup-pre-importacao.mjs \
 *     --verify=C:\piloto\restrito\backups\pre-importacao-<instituicao>-<data>
 *
 * Só lê o banco. Grava SÓ em C:\piloto\restrito\backups\, numa pasta nova.
 * Destino remoto: apenas o projeto canônico do piloto, confirmado no
 * comando e no ambiente (trava de pilot-target-guard.mjs). Banco local
 * descartável (testes) pode usar IAH_PILOT_BACKUP_ROOT como pasta.
 *
 * Códigos de saída: 0 = cópia criada / verificada; 2 = prévia com bloqueio,
 * colisão de identificador ou cópia divergente; 3 = configuração ou alvo
 * inválido; outro não zero = falha técnica.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { createScopedBackup, findIdCollisions, verifyScopedBackup } from "./pilot-backup-pre-importacao-lib.mjs";
import { assertAuthorizedTarget } from "./pilot-target-guard.mjs";

/** Único projeto hospedado que pode ser copiado antes da importação real. */
const CANONICAL_PROJECT_REF = "feyfodhcvytcxtjjlarj";
const BACKUP_ROOT = "C:\\piloto\\restrito\\backups";
const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "IAH_HOMOLOGATION_PROJECT_REF",
  "IAH_PROTECTED_PROJECT_REFS",
];

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const stop = (code, message) => {
  console.error(`✖ ${message}`);
  process.exit(code);
};
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const insideRepo = (p) => resolve(p) === repoRoot || resolve(p).startsWith(repoRoot + sep);

// ---------------------------------------------------------------- verificar
const verifyDir = arg("verify");
if (verifyDir) {
  const { ok, problems, manifest } = verifyScopedBackup(verifyDir);
  if (manifest) {
    console.log(`Cópia de ${manifest.createdAt} — instituição ${manifest.institutionId} (${manifest.target?.descricao ?? "?"})`);
    for (const [t, v] of Object.entries(manifest.tables ?? {})) console.log(`  ${t.padEnd(20)}${String(v.count).padStart(6)}`);
  }
  if (!ok) {
    for (const p of problems) console.error(`  ✖ ${p}`);
    stop(2, "Cópia NÃO confere com o manifesto.");
  }
  console.log("Cópia íntegra: SHA-256, contagens e escopo conferem com o manifesto.");
  process.exit(0);
}

// ---------------------------------------------------------------- criar
const configPath = arg("config");
const csvPath = arg("csv");
if (!configPath || !csvPath) stop(3, "Informe --config=<arquivo.json> e --csv=<arquivo.csv> (ou --verify=<pasta>).");

const {
  parseClassCsv,
  precheckClassRows,
  precheckRosterAgainstDatabase,
  staffFromConfig,
  validatePilotConfig,
} = await import("../src/modules/identity/provisioning/class-csv-import.ts");

let config;
try {
  config = JSON.parse(readFileSync(configPath, "utf8"));
} catch (error) {
  stop(3, `Não foi possível ler ${configPath}: ${error.message}`);
}
const configIssues = validatePilotConfig(config);
if (configIssues.length > 0) {
  for (const issue of configIssues) console.error(`  - ${issue.path}: ${issue.message}`);
  stop(3, "Configuração incompleta ou inválida — nada foi consultado.");
}

const missingEnv = REQUIRED_ENV.filter((name) => !(process.env[name] ?? "").trim());
if (missingEnv.length > 0) {
  for (const name of missingEnv) console.error(`  FALTA   ${name}`);
  stop(3, "Variáveis de ambiente ausentes nesta janela — banco não consultado.");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
let alvo;
try {
  alvo = assertAuthorizedTarget(url, { confirmProject: arg("confirm-project"), operation: "copiar antes da importação" });
} catch (error) {
  stop(3, error instanceof Error ? error.message : String(error));
}
if (alvo.escopo !== "local" && alvo.ref !== CANONICAL_PROJECT_REF) {
  stop(3, `O destino ${alvo.ref} não é o projeto do piloto (${CANONICAL_PROJECT_REF}). Nada foi consultado.`);
}
const rootOverride = (process.env.IAH_PILOT_BACKUP_ROOT ?? "").trim();
if (rootOverride && alvo.escopo !== "local") {
  stop(3, "IAH_PILOT_BACKUP_ROOT só vale para banco local de teste; a cópia real vai para C:\\piloto\\restrito\\backups.");
}
const root = rootOverride || BACKUP_ROOT;
if (insideRepo(root)) stop(3, "A pasta da cópia precisa ficar FORA do repositório.");
console.log(`Destino: ${alvo.descricao}. Pasta da cópia: ${root}`);

const { createClient } = await import("@supabase/supabase-js");
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
// Depois de usar o banco, o encerramento é por process.exitCode: no Windows
// (Node 24), process.exit() logo após uma requisição HTTPS aborta o processo
// e o código de saída se perde.
process.exitCode = await criar();

async function criar() {
  const recusa = (message) => {
    console.error(`✖ ${message}`);
    return 2;
  };
  const target = { institutionId: config.institution.id, classroomId: config.classroom.id };

  // Prévia completa AGORA (alunos, professor e gestores): a cópia só existe
  // para uma importação que a prévia aprovou.
  const report = precheckClassRows(parseClassCsv(readFileSync(csvPath, "utf8")), config.expected);
  const dbCheck = await precheckRosterAgainstDatabase(db, report.rows, staffFromConfig(config), target);
  const blocking = [...report.issues, ...dbCheck.issues].filter((i) => i.blocking);
  if (blocking.length > 0) {
    for (const issue of blocking) console.error(`  [BLOQUEIA] ${issue.kind}`);
    return recusa("Prévia com bloqueio: cópia NÃO criada (nada foi gravado).");
  }
  const collisions = await findIdCollisions(db, target.institutionId, {
    academicYearId: config.academicYear.id,
    classroomId: config.classroom.id,
    teacherId: config.teacher.id,
  });
  if (collisions.length > 0) {
    return recusa(`Identificador da configuração já pertence a outra instituição (${collisions.join(", ")}): cópia NÃO criada.`);
  }

  const { dir, manifest } = await createScopedBackup(db, {
    root,
    institutionId: target.institutionId,
    target: { escopo: alvo.escopo, ref: alvo.ref, descricao: alvo.descricao },
    precheck: { apta: true, total: report.total, porPapel: dbCheck.byRole },
  });
  console.log(`Prévia apta (${report.total} alunos + ${staffFromConfig(config).length} professor/gestores).`);
  for (const [t, v] of Object.entries(manifest.tables)) {
    console.log(`  ${t.padEnd(20)}${String(v.count).padStart(6)}  ${v.sha256.slice(0, 12)}…`);
  }
  const check = verifyScopedBackup(dir);
  if (!check.ok) return recusa(`Cópia gravada mas NÃO confere: ${check.problems.join("; ")}`);
  console.log(`Cópia criada e conferida: ${dir}`);
  return 0;
}
