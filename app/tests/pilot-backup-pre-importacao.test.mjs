/**
 * Cópia restrita antes da importação (pilot-backup-pre-importacao*.mjs),
 * sem banco: recusas que acontecem ANTES de qualquer conexão, verificação
 * da cópia pelos próprios arquivos e o wrapper do Windows. O caminho com
 * banco real fica em tests/pilot/salvaguardas-importacao.test.mjs.
 *
 * Nenhum banco é consultado: os casos com destino remoto param na trava
 * de alvo, antes de criar o cliente. Dados 100% sintéticos.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import {
  createScopedBackup,
  SCOPED_TABLES,
  verifyScopedBackup,
} from "../scripts/pilot-backup-pre-importacao-lib.mjs";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(appDir, "scripts", "pilot-backup-pre-importacao.mjs");
const wrapper = join(appDir, "scripts", "windows", "piloto-copia-pre-importacao.cmd");
const VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "IAH_HOMOLOGATION_PROJECT_REF",
  "IAH_PROTECTED_PROJECT_REFS",
  "IAH_PILOT_BACKUP_ROOT",
];
const CANONICO = "feyfodhcvytcxtjjlarj";

const D = "escola.example";
const INST = "inst-sintetica";
const config = {
  institution: { id: INST, name: "Escola Sintética", slug: "escola-sintetica", domain: D },
  academicYear: { id: "ay-sintetico-2026", label: "2026", startsOn: "2026-02-01", endsOn: "2026-12-15" },
  classroom: { id: "class-sintetica-1a", name: "1ª série A", grade: "1ª série E.M." },
  teacher: { id: "teacher-sintetico", name: "Professora Sintética", email: `professora@${D}` },
  managers: [{ id: "manager-sintetico", name: "Gestora Sintética", email: `gestora@${D}` }],
  expected: { className: "1ª série A", expectedTotal: 1, emailDomains: [D] },
};

const tmp = mkdtempSync(join(tmpdir(), "iah-copia-pre-teste-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
const cfg = join(tmp, "config.json");
writeFileSync(cfg, JSON.stringify(config));
const csv = join(tmp, "alunos.csv");
writeFileSync(csv, `nome,email_institucional,turma\nAluno Um,aluno.um@${D},1ª série A\n`);

function run(args, extra = {}) {
  const env = { ...process.env };
  for (const v of VARS) delete env[v];
  return spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", script, ...args], {
    cwd: appDir,
    encoding: "utf8",
    env: { ...env, ...extra },
  });
}
const remoto = (ref, extra = {}) => ({
  NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
  SUPABASE_SERVICE_ROLE_KEY: "chave-sintetica-nao-usada",
  IAH_HOMOLOGATION_PROJECT_REF: ref,
  IAH_PROTECTED_PROJECT_REFS: "ref-protegido-sintetico",
  ...extra,
});

test("sem argumentos: código 3", () => {
  assert.equal(run([]).status, 3);
});

test("sem variáveis de ambiente: código 3, só os nomes, banco não consultado", () => {
  const r = run([`--config=${cfg}`, `--csv=${csv}`]);
  assert.equal(r.status, 3);
  assert.match(r.stderr, /FALTA\s+SUPABASE_SERVICE_ROLE_KEY/);
});

test("projeto remoto que não é o do piloto: código 3 antes de conectar", () => {
  const r = run([`--config=${cfg}`, `--csv=${csv}`, "--confirm-project=outroprojetosintetico"], remoto("outroprojetosintetico"));
  assert.equal(r.status, 3);
  assert.match(r.stderr, new RegExp(`não é o projeto do piloto \\(${CANONICO}\\)`));
});

test("projeto do piloto sem confirmação no comando, ou com confirmação divergente: código 3", () => {
  assert.equal(run([`--config=${cfg}`, `--csv=${csv}`], remoto(CANONICO)).status, 3);
  const r = run([`--config=${cfg}`, `--csv=${csv}`, "--confirm-project=feyfodhcvytcjjlarj"], remoto(CANONICO));
  assert.equal(r.status, 3);
  assert.match(r.stderr, /não corresponde/);
});

test("pasta alternativa só vale para banco local: com destino remoto, código 3", () => {
  const r = run(
    [`--config=${cfg}`, `--csv=${csv}`, `--confirm-project=${CANONICO}`],
    remoto(CANONICO, { IAH_PILOT_BACKUP_ROOT: join(tmp, "outra-pasta") }),
  );
  assert.equal(r.status, 3);
  assert.match(r.stderr, /só vale para banco local/);
  assert.equal(existsSync(join(tmp, "outra-pasta")), false);
});

test("pasta dentro do repositório é recusada (código 3)", () => {
  const r = run([`--config=${cfg}`, `--csv=${csv}`], {
    ...remoto("x"),
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
    IAH_PILOT_BACKUP_ROOT: join(appDir, "copias-de-teste"),
  });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /FORA do repositório/);
});

/** Banco em memória: devolve só o que os filtros pedem (como o PostgREST). */
function fakeDb(tables) {
  return {
    from(table) {
      const filters = [];
      const b = {
        select: () => b,
        eq: (c, v) => (filters.push((r) => r[c] === v), b),
        order: () => b,
        range: async () => ({ data: (tables[table] ?? []).filter((r) => filters.every((f) => f(r))), error: null }),
      };
      return b;
    },
  };
}
const OUTRA = "inst-outra-sintetica";
const dados = {
  institutions: [{ id: INST, name: "Escola Sintética" }, { id: OUTRA, name: "Outra" }],
  users: [
    { id: "u1", institution_id: INST, email: `professora@${D}`, password_hash: "scrypt:1:sintetico" },
    { id: "u2", institution_id: OUTRA, email: "alguem@outra.example", password_hash: "scrypt:1:outro" },
  ],
  enrollments: [{ id: "e1", institution_id: INST, classroom_id: "c1", student_id: "s1" }],
};

test("cópia: só a instituição-alvo entra; manifesto sem e-mail nem hash; verificação confere", async () => {
  const root = join(tmp, "copias");
  const { dir, manifest } = await createScopedBackup(fakeDb(dados), {
    root,
    institutionId: INST,
    target: { escopo: "local", ref: null, descricao: "banco local descartável" },
    precheck: { apta: true },
    now: new Date("2026-10-24T12:00:00Z"),
  });
  assert.deepEqual(Object.keys(manifest.tables), SCOPED_TABLES.map(([t]) => t));
  assert.equal(manifest.tables.users.count, 1);
  assert.equal(manifest.tables.institutions.count, 1);
  const texto = readFileSync(join(dir, "dados.json"), "utf8");
  assert.equal(texto.includes(OUTRA), false, "nenhuma linha de outra instituição");
  const man = readFileSync(join(dir, "manifesto.json"), "utf8");
  assert.equal(/@|scrypt/.test(man), false, "manifesto sem e-mail nem hash de senha");
  assert.equal(verifyScopedBackup(dir).ok, true);

  // Nunca sobrescreve: mesma hora → pasta já existe.
  await assert.rejects(() =>
    createScopedBackup(fakeDb(dados), { root, institutionId: INST, target: {}, precheck: {}, now: new Date("2026-10-24T12:00:00Z") }),
  );
});

test("verificação acusa adulteração, linha de outra instituição e arquivo ausente", async () => {
  const root = join(tmp, "copias-adulteradas");
  const { dir } = await createScopedBackup(fakeDb(dados), { root, institutionId: INST, target: {}, precheck: {} });
  const arquivo = join(dir, "dados.json");
  const original = readFileSync(arquivo, "utf8");

  writeFileSync(arquivo, original.replace("Escola Sintética", "Escola Sintetica"));
  assert.match(verifyScopedBackup(dir).problems.join(";"), /SHA-256 de dados.json diverge/);

  const intruso = JSON.parse(original);
  intruso.tables.users.push({ id: "u9", institution_id: OUTRA });
  writeFileSync(arquivo, JSON.stringify(intruso));
  assert.match(verifyScopedBackup(dir).problems.join(";"), /users: linha de outra instituição/);

  rmSync(arquivo);
  assert.equal(verifyScopedBackup(dir).ok, false);

  const r = run([`--verify=${dir}`]);
  assert.equal(r.status, 2, "CLI de verificação devolve 2 para cópia divergente");
  assert.equal(readdirSync(root).length, 1);
});

test("wrapper .cmd: fluxo linear, ref digitado pelo operador e saída única", () => {
  const texto = readFileSync(wrapper, "utf8")
    .split(/\r?\n/)
    .filter((l) => !/^\s*rem\b/i.test(l))
    .join("\n");
  assert.doesNotMatch(texto, /\|\|/);
  assert.doesNotMatch(texto, /\([^)\n]*exit \/b/i);
  assert.match(texto, /^endlocal & exit \/b /m);
  assert.match(texto, /--confirm-project=%~3/, "o ref vem do comando, não só do ambiente");
  assert.match(texto, /:sem_ambiente[\s\S]*set "RC=3"/);
});
