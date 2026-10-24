/**
 * Configuração da turma do piloto — recusa de campos obrigatórios vazios,
 * marcador "PREENCHER" e e-mails inválidos de professor/gestores ANTES de
 * qualquer acesso ao banco. Dados 100% sintéticos (domínio .example);
 * arquivos temporários ficam fora do repositório.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

const { validatePilotConfig } = await import("@/modules/identity/provisioning/class-csv-import.ts");

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(appDir, "scripts", "pilot-import-turma.mjs");
const modelo = join(appDir, "..", "docs", "piloto", "modelos", "piloto-1a-config.modelo.json");

function valida() {
  return {
    institution: { id: "inst-sintetica", name: "Escola Sintética", slug: "escola-sintetica", domain: "escola.example" },
    academicYear: { id: "ay-sintetico-2026", label: "2026", startsOn: "2026-02-01", endsOn: "2026-12-15" },
    classroom: { id: "class-sintetica-1a", name: "1ª série A", grade: "1ª série E.M." },
    teacher: { id: "teacher-sintetico", name: "Professora Sintética", email: "professora@escola.example" },
    managers: [{ id: "manager-sintetico", name: "Gestora Sintética", email: "gestora@escola.example" }],
    expected: { className: "1ª série A", expectedTotal: 2, emailDomains: ["escola.example"] },
  };
}
const paths = (issues) => issues.map((i) => i.path).sort();

test("configuração sintética completa é aceita", () => {
  assert.deepEqual(validatePilotConfig(valida()), []);
});

test("institution.domain é opcional, como no PilotRoster", () => {
  const c = valida();
  delete c.institution.domain;
  assert.deepEqual(validatePilotConfig(c), []);
});

test("o modelo versionado (com PREENCHER) é recusado nos campos certos", () => {
  const c = JSON.parse(readFileSync(modelo, "utf8"));
  const p = paths(validatePilotConfig(c));
  for (const esperado of ["institution.domain", "teacher.email", "managers[0].name", "managers[0].email"]) {
    assert.ok(p.includes(esperado), `deveria recusar ${esperado}: ${p.join(", ")}`);
  }
});

test("campos obrigatórios vazios ou ausentes são recusados", () => {
  const c = valida();
  c.teacher.name = "   ";
  delete c.teacher.id;
  c.managers[0].id = "";
  c.classroom.grade = null;
  assert.deepEqual(paths(validatePilotConfig(c)), [
    "classroom.grade",
    "managers[0].id",
    "teacher.id",
    "teacher.name",
  ]);
});

test("PREENCHER é recusado em qualquer caixa", () => {
  const c = valida();
  c.managers[0].name = "preencher-nome";
  c.academicYear.id = "PREENCHER";
  assert.deepEqual(paths(validatePilotConfig(c)), ["academicYear.id", "managers[0].name"]);
});

test("e-mail inválido de professor ou gestor é recusado", () => {
  for (const ruim of ["professora", "professora@", "@escola.example", "pro fessora@escola.example", "a@b"]) {
    const c = valida();
    c.teacher.email = ruim;
    c.managers[0].email = ruim;
    assert.deepEqual(paths(validatePilotConfig(c)), ["managers[0].email", "teacher.email"], ruim);
  }
});

test("gestores ausentes, vazios ou não-objeto são recusados", () => {
  for (const managers of [undefined, [], [null], ["gestora@escola.example"]]) {
    const c = valida();
    c.managers = managers;
    assert.ok(validatePilotConfig(c).some((i) => i.path.startsWith("managers")), JSON.stringify(managers));
  }
});

test("objetos principais ausentes e total inválido são recusados", () => {
  const c = valida();
  delete c.classroom;
  c.expected.expectedTotal = 0;
  assert.deepEqual(paths(validatePilotConfig(c)), ["classroom", "expected.expectedTotal"]);
  assert.ok(validatePilotConfig(null).length > 0);
  assert.ok(validatePilotConfig([]).length > 0);
});

test("mensagens citam o caminho, nunca o valor", () => {
  const c = valida();
  c.teacher.email = "segredo-nao-mostrar";
  const texto = JSON.stringify(validatePilotConfig(c));
  assert.ok(!texto.includes("segredo-nao-mostrar"));
});

// ------------------------------------------------------------- CLI
const tmp = mkdtempSync(join(tmpdir(), "iah-config-teste-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
const csvPath = join(tmp, "alunos.csv");
writeFileSync(
  csvPath,
  "nome,email_institucional,turma\nAluno Um,aluno.um@escola.example,1ª série A\nAluna Dois,aluna.dois@escola.example,1ª série A\n",
);

function rodar(config, extra = [], env = {}) {
  const cfgPath = join(tmp, `cfg-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(cfgPath, JSON.stringify(config));
  const base = { ...process.env };
  for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "IAH_HOMOLOGATION_PROJECT_REF", "IAH_PROTECTED_PROJECT_REFS"]) {
    delete base[k];
  }
  return spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", script, `--config=${cfgPath}`, `--csv=${csvPath}`, ...extra],
    { cwd: appDir, encoding: "utf8", env: { ...base, ...env } },
  );
}

test("CLI: configuração incompleta para antes do banco, mesmo com variáveis do banco presentes", () => {
  const c = valida();
  c.teacher.email = "PREENCHER-email";
  // Endereço que recusaria conexão: se o script tentasse o banco, a mensagem seria outra.
  const r = rodar(c, [], {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
    SUPABASE_SERVICE_ROLE_KEY: "chave-sintetica-de-teste",
  });
  assert.equal(r.status, 3, r.stderr);
  assert.match(r.stderr, /Configuração incompleta ou inválida \(1\) — nada foi consultado/);
  assert.match(r.stderr, /teacher\.email/);
  assert.doesNotMatch(r.stdout, /Validação prévia|Destino|Contas a criar/);
});

test("CLI: configuração incompleta também é recusada no modo --offline", () => {
  const c = valida();
  c.managers = [];
  const r = rodar(c, ["--offline"]);
  assert.equal(r.status, 3, r.stderr);
  assert.match(r.stderr, /managers: informe ao menos um gestor/);
});

test("CLI: configuração sintética válida continua aceita (--offline)", () => {
  const r = rodar(valida(), ["--offline"]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /apto para importar/);
});

test("CLI: configuração válida passa do portão e chega à exigência das variáveis do banco", () => {
  const r = rodar(valida());
  assert.equal(r.status, 3);
  assert.match(r.stderr, /Variáveis de ambiente ausentes nesta janela — banco não consultado/);
  assert.doesNotMatch(r.stderr, /Configuração incompleta/);
});
