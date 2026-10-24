/**
 * Códigos de saída da prévia do piloto (pilot-import-turma.mjs e o wrapper
 * scripts/windows/piloto-validar-turma.cmd):
 *   0 = prévia concluída sem bloqueios · 2 = bloqueios de dados/conflitos ·
 *   3 = configuração ausente ou inválida (inclui variáveis de ambiente) ·
 *   outro não zero = falha técnica.
 *
 * Os processos filhos rodam SEM as variáveis do banco (removidas do ambiente
 * herdado, mesmo que o operador as tenha na janela). Nenhum banco é
 * consultado e nenhum valor de variável é impresso. Dados 100% sintéticos.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(appDir, "scripts", "pilot-import-turma.mjs");
const wrapper = join(appDir, "scripts", "windows", "piloto-validar-turma.cmd");
const checador = join(appDir, "scripts", "windows", "piloto-checar-ambiente.cmd");
const VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "IAH_HOMOLOGATION_PROJECT_REF",
  "IAH_PROTECTED_PROJECT_REFS",
];

const D = "escola.example";
const config = (expectedTotal = 2) => ({
  institution: { id: "inst-sintetica", name: "Escola Sintética", slug: "escola-sintetica", domain: D },
  academicYear: { id: "ay-sintetico-2026", label: "2026", startsOn: "2026-02-01", endsOn: "2026-12-15" },
  classroom: { id: "class-sintetica-1a", name: "1ª série A", grade: "1ª série E.M." },
  teacher: { id: "teacher-sintetico", name: "Professora Sintética", email: `professora@${D}` },
  managers: [{ id: "manager-sintetico", name: "Gestora Sintética", email: `gestora@${D}` }],
  expected: { className: "1ª série A", expectedTotal, emailDomains: [D] },
});

const tmp = mkdtempSync(join(tmpdir(), "iah-exit-teste-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
const csv = join(tmp, "alunos.csv");
writeFileSync(csv, `nome,email_institucional,turma\nAluno Um,aluno.um@${D},1ª série A\nAluna Dois,aluna.dois@${D},1ª série A\n`);
const cfgOk = join(tmp, "ok.json");
writeFileSync(cfgOk, JSON.stringify(config(2)));
const cfgDiverge = join(tmp, "diverge.json");
writeFileSync(cfgDiverge, JSON.stringify(config(3)));
const cfgQuebrada = join(tmp, "quebrada.json");
writeFileSync(cfgQuebrada, "{ não é json");

/** Ambiente herdado SEM as variáveis do banco, mais as sintéticas pedidas. */
function envSem(extra = {}) {
  const env = { ...process.env };
  for (const v of VARS) delete env[v];
  return { ...env, ...extra };
}
function node(args, extra) {
  return spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", script, ...args], {
    cwd: appDir,
    encoding: "utf8",
    env: envSem(extra),
  });
}

test("sem nenhuma variável: código 3, só os nomes, banco não consultado", () => {
  const r = node([`--config=${cfgOk}`, `--csv=${csv}`]);
  assert.equal(r.status, 3, r.stderr + r.stdout);
  for (const v of VARS) assert.match(r.stderr, new RegExp(`FALTA\\s+${v}`));
  assert.match(r.stderr, /banco não consultado/);
  assert.doesNotMatch(r.stdout, /Destino|Contas de aluno a criar|apto para importar/);
});

test("com parte das variáveis: lista só as ausentes e nunca imprime valores", () => {
  const sentinela = "valor-sintetico-que-nao-pode-aparecer";
  const r = node([`--config=${cfgOk}`, `--csv=${csv}`], {
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:9/${sentinela}`,
    SUPABASE_SERVICE_ROLE_KEY: sentinela,
  });
  assert.equal(r.status, 3, r.stderr + r.stdout);
  assert.match(r.stderr, /FALTA\s+IAH_HOMOLOGATION_PROJECT_REF/);
  assert.match(r.stderr, /FALTA\s+IAH_PROTECTED_PROJECT_REFS/);
  assert.doesNotMatch(r.stderr, /FALTA\s+NEXT_PUBLIC_SUPABASE_URL|FALTA\s+SUPABASE_SERVICE_ROLE_KEY/);
  assert.ok(!(r.stdout + r.stderr).includes(sentinela), "nenhum valor de variável é exibido");
});

test("variável só com espaços conta como ausente", () => {
  const r = node([`--config=${cfgOk}`, `--csv=${csv}`], { SUPABASE_SERVICE_ROLE_KEY: "   " });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /FALTA\s+SUPABASE_SERVICE_ROLE_KEY/);
});

test("offline sem bloqueio: código 0", () => {
  const r = node([`--config=${cfgOk}`, `--csv=${csv}`, "--offline"]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /apto para importar/);
});

test("offline com divergência de dados (total): código 2", () => {
  const r = node([`--config=${cfgDiverge}`, `--csv=${csv}`, "--offline"]);
  assert.equal(r.status, 2, r.stderr + r.stdout);
  assert.match(r.stdout, /NÃO IMPORTAR/);
});

test("argumentos ausentes ou JSON ilegível: código 3", () => {
  assert.equal(node([`--csv=${csv}`, "--offline"]).status, 3);
  assert.equal(node([`--config=${cfgQuebrada}`, `--csv=${csv}`, "--offline"]).status, 3);
  assert.equal(node([`--config=${cfgOk}`, `--csv=${csv}`, "--offline", "--execute"]).status, 3);
});

test("falha técnica inesperada (CSV inexistente) não vira 0, 2 nem 3", () => {
  const r = node([`--config=${cfgOk}`, `--csv=${join(tmp, "nao-existe.csv")}`, "--offline"]);
  assert.ok(![0, 2, 3].includes(r.status), `status ${r.status}`);
});

test("wrappers .cmd: fluxo linear, sem exit dentro de parênteses nem '||'", () => {
  for (const arquivo of [wrapper, checador]) {
    const linhas = readFileSync(arquivo, "utf8").split(/\r?\n/).filter((l) => !/^\s*rem\b/i.test(l));
    const texto = linhas.join("\n");
    assert.doesNotMatch(texto, /\|\|/, `${arquivo}: sem "||"`);
    assert.doesNotMatch(texto, /\([^)\n]*exit \/b/i, `${arquivo}: sem exit /b dentro de parênteses`);
    assert.match(texto, /^endlocal & exit \/b /m, `${arquivo}: saída única em nível superior`);
  }
  const w = readFileSync(wrapper, "utf8");
  assert.match(w, /:sem_ambiente[\s\S]*set "RC=3"/, "ambiente ausente sai com 3");
  assert.match(w, /:uso[\s\S]*set "RC=3"/, "uso incorreto sai com 3");
});

// O comportamento real do cmd.exe só pode ser comprovado no Windows.
const noWindows = process.platform === "win32" ? false : "cmd.exe só existe no Windows";
function cmd(args) {
  return spawnSync("cmd.exe", ["/d", "/c", wrapper, ...args], { encoding: "utf8", env: envSem() });
}

test("Windows: .cmd sem variáveis termina com 3 e não chama o banco", { skip: noWindows }, () => {
  const r = cmd([cfgOk, csv]);
  assert.equal(r.status, 3, r.stdout + r.stderr);
  for (const v of VARS) assert.match(r.stdout, new RegExp(`FALTA\\s+${v}`));
  assert.doesNotMatch(r.stdout, /Destino|Contas de aluno a criar/);
});

test("Windows: .cmd --offline devolve 0 (apta) e 2 (bloqueio)", { skip: noWindows }, () => {
  assert.equal(cmd([cfgOk, csv, "--offline"]).status, 0);
  assert.equal(cmd([cfgDiverge, csv, "--offline"]).status, 2);
});

test("Windows: .cmd sem argumentos devolve 3", { skip: noWindows }, () => {
  assert.equal(cmd([]).status, 3);
});
