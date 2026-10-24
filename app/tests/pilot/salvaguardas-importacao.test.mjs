/**
 * Salvaguardas da importação real, no banco EFÊMERO (dados sintéticos):
 *
 *  1. idempotência da CLI de importação (`pilot-import-turma.mjs --execute`)
 *     rodada de novo — exatamente o mesmo comando e o mesmo comando com
 *     outro arquivo de credenciais;
 *  2. cópia restrita antes da importação (`pilot-backup-pre-importacao.mjs`):
 *     só a instituição-alvo, verificável, sem escrever no banco e recusada
 *     quando a prévia bloqueia ou um identificador já é de outra escola;
 *  3. credenciais da CLI: individuais, no formato gerado, fora do relatório
 *     e com troca obrigatória no primeiro acesso.
 *
 * As duas escolas sintéticas das demais suítes ficam no banco o tempo todo,
 * para provar que nenhuma operação toca outra instituição.
 */

import "./support/pilot-hooks.mjs";

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";

import {
  loginAs,
  logout,
  OUTRA,
  provisionPilotFixtures,
  resetPilotDatabase,
} from "./support/pilot-fixtures.mjs";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const D = "sintetico-c.test";
const INST = "inst-sintetico-c";
const ALUNOS = 5;
const config = (over = {}) => ({
  institution: { id: INST, name: "Colégio Sintético C", slug: "colegio-sintetico-c", domain: D },
  academicYear: { id: "ay-sintetico-c-2026", label: "2026", startsOn: "2026-02-01", endsOn: "2026-12-15" },
  classroom: { id: "class-sintetico-c-1", name: "1ª série A", grade: "1ª série E.M." },
  teacher: { id: "teacher-sintetico-c", name: "Professor(a) Sintético(a) C", email: `professor.c@${D}` },
  managers: [
    { id: "manager-sintetico-c-1", name: "Gestão Sintética C1", email: `gestora.c1@${D}` },
    { id: "manager-sintetico-c-2", name: "Gestão Sintética C2", email: `gestora.c2@${D}` },
  ],
  expected: { className: "1ª série A", expectedTotal: ALUNOS, emailDomains: [D] },
  ...over,
});
const emailAluno = (i) => `estudante.c${String(i).padStart(2, "0")}@${D}`;
const csvText = (emails) =>
  ["nome,email_institucional,turma", ...emails.map((e, i) => `Estudante Sintético C${i + 1},${e},1ª série A`)].join("\n");

const tmp = mkdtempSync(join(tmpdir(), "iah-salvaguardas-"));
const file = (name, content) => {
  const path = join(tmp, name);
  writeFileSync(path, content);
  return path;
};
const cfg = file("config.json", JSON.stringify(config()));
const csv = file("alunos.csv", csvText(Array.from({ length: ALUNOS }, (_, i) => emailAluno(i + 1))));
const backupRoot = join(tmp, "backups");

const env = {
  ...process.env,
  IAH_HOMOLOGATION_PROJECT_REF: "local-sintetico",
  IAH_PROTECTED_PROJECT_REFS: "ref-protegido-sintetico",
};
function cli(script, args, extra = {}) {
  return spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", join("scripts", script), ...args], {
    cwd: appDir,
    encoding: "utf8",
    env: { ...env, ...extra },
  });
}
const importar = (credenciais) =>
  cli("pilot-import-turma.mjs", [
    `--config=${cfg}`,
    `--csv=${csv}`,
    "--execute",
    `--confirm-institution=${INST}`,
    `--confirm-total=${ALUNOS}`,
    `--credentials-out=${credenciais}`,
    "--actor=cli:teste-salvaguardas",
  ]);
const copiar = (args, extra = {}) =>
  cli("pilot-backup-pre-importacao.mjs", args, { IAH_PILOT_BACKUP_ROOT: backupRoot, ...extra });

const TABELAS = [
  "institutions", "academic_years", "classrooms", "users", "profiles", "teachers", "students",
  "classroom_teachers", "enrollments", "mission_assignments", "admin_audit_log",
];
/** Contagem e md5 de cada tabela inteira (users sem last_login_at), via SQL direto. */
async function assinaturas() {
  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: process.env.PILOT_TEST_DATABASE_URL });
  await client.connect();
  try {
    const out = {};
    for (const t of TABELAS) {
      const linha = t === "users" ? "(to_jsonb(x) - 'last_login_at')::text" : "to_jsonb(x)::text";
      const { rows } = await client.query(
        `select count(*)::int as n, md5(coalesce(string_agg(${linha}, '|' order by ${linha}), '')) as sig from ${t} x`,
      );
      out[t] = rows[0];
    }
    return out;
  } finally {
    await client.end();
  }
}
async function contarDaInstituicao(inst) {
  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: process.env.PILOT_TEST_DATABASE_URL });
  await client.connect();
  try {
    const out = {};
    for (const t of TABELAS.filter((x) => x !== "institutions")) {
      const { rows } = await client.query(`select count(*)::int as n from ${t} where institution_id = $1`, [inst]);
      out[t] = rows[0].n;
    }
    return out;
  } finally {
    await client.end();
  }
}
const sha = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
function lerCredenciais(path) {
  const [cabecalho, ...linhas] = readFileSync(path, "utf8").replace(/^﻿/, "").trim().split("\n");
  assert.equal(cabecalho, "perfil;nome;email;senha_inicial");
  return linhas.map((l) => {
    const [perfil, , email, senha] = l.split(";");
    return { perfil, email, senha };
  });
}

before(async () => {
  await resetPilotDatabase();
  await provisionPilotFixtures();
});
after(async () => {
  logout();
  await resetPilotDatabase();
  rmSync(tmp, { recursive: true, force: true });
});

const cred1 = join(tmp, "credenciais-1.csv");
let depoisDaPrimeira;

test("prévia com banco real: códigos 0 (apta) e 2 (bloqueio) chegam intactos e nada é escrito", async () => {
  // Regressão: no Windows (Node 24), process.exit() logo depois do fetch
  // abortava o processo (0xC0000409) e a prévia nunca devolvia 0 nem 2.
  const antes = await assinaturas();
  const apta = cli("pilot-import-turma.mjs", [`--config=${cfg}`, `--csv=${csv}`]);
  assert.equal(apta.status, 0, apta.stderr);
  assert.match(apta.stdout, /aluno\s+5\s+5\s+0\s+0/);
  assert.match(apta.stdout, /administrador\s+2\s+2\s+0\s+0/);
  const cfgTotal = file("config-total.json", JSON.stringify(config({
    expected: { className: "1ª série A", expectedTotal: ALUNOS + 1, emailDomains: [D] },
  })));
  const bloqueio = cli("pilot-import-turma.mjs", [`--config=${cfgTotal}`, `--csv=${csv}`]);
  assert.equal(bloqueio.status, 2, bloqueio.stderr);
  assert.deepEqual(await assinaturas(), antes);
});

test("pasta do arquivo de credenciais inexistente: recusada antes de criar qualquer conta", async () => {
  const antes = await assinaturas();
  const r = importar(join(tmp, "pasta-que-nao-existe", "credenciais.csv"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /não existe — crie-a antes de importar/);
  assert.deepEqual(await assinaturas(), antes);
});

test("1ª importação pela CLI: 3 contas de equipe + 5 alunos, sem tocar as outras escolas", async () => {
  const outrasAntes = await contarDaInstituicao(OUTRA.institution.id);
  const r = importar(cred1);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Contas: 8 criadas · 0 já existentes · 0 com falha/);
  assert.match(r.stdout, /5 novas · 0 existentes · 0 com falha/);
  assert.equal(lerCredenciais(cred1).length, 8);
  assert.deepEqual(await contarDaInstituicao(INST), {
    academic_years: 1, classrooms: 1, users: 8, profiles: 8, teachers: 1, students: 5,
    classroom_teachers: 1, enrollments: 5, mission_assignments: 0, admin_audit_log: 1,
  });
  assert.deepEqual(await contarDaInstituicao(OUTRA.institution.id), outrasAntes);
  depoisDaPrimeira = await assinaturas();
});

test("2ª execução com EXATAMENTE o mesmo comando: recusada antes de escrever (arquivo de credenciais já existe)", async () => {
  const antes = sha(cred1);
  const r = importar(cred1);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /já existe/);
  assert.equal(sha(cred1), antes, "credenciais anteriores intactas");
  assert.deepEqual(await assinaturas(), depoisDaPrimeira, "banco idêntico, inclusive a trilha");
});

test("2ª execução completa (outro arquivo de credenciais): nada duplica, nenhuma credencial nova", async () => {
  const cred2 = join(tmp, "credenciais-2.csv");
  const r = importar(cred2);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Contas: 0 criadas · 8 já existentes · 0 com falha/);
  assert.match(r.stdout, /0 novas · 5 existentes · 0 com falha/);
  assert.equal(existsSync(cred2), false, "nenhuma senha nova gerada");

  const agora = await assinaturas();
  for (const t of TABELAS.filter((x) => x !== "admin_audit_log")) {
    assert.deepEqual(agora[t], depoisDaPrimeira[t], `${t}: idêntica após repetir`);
  }
  assert.equal(agora.admin_audit_log.n, depoisDaPrimeira.admin_audit_log.n + 1, "só a trilha ganha o registro da execução");
});

test("cópia pré-importação: só a instituição-alvo, verificável e sem escrever no banco", async () => {
  const antes = await assinaturas();
  const r = copiar([`--config=${cfg}`, `--csv=${csv}`]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(await assinaturas().then((a) => JSON.stringify(a)), JSON.stringify(antes), "cópia não escreve");

  const [pasta] = readdirSync(backupRoot);
  const dir = join(backupRoot, pasta);
  const manifesto = JSON.parse(readFileSync(join(dir, "manifesto.json"), "utf8"));
  const contagens = Object.fromEntries(Object.entries(manifesto.tables).map(([t, v]) => [t, v.count]));
  assert.deepEqual(contagens, {
    institutions: 1, academic_years: 1, classrooms: 1, users: 8, profiles: 8, teachers: 1, students: 5,
    classroom_teachers: 1, enrollments: 5, admin_audit_log: 2,
  });
  assert.equal(manifesto.precheck.apta, true);
  assert.equal(manifesto.precheck.porPapel.aluno.total, ALUNOS);
  assert.equal(/@|scrypt|Sintético C\d/.test(JSON.stringify(manifesto)), false, "manifesto sanitizado");
  const dados = readFileSync(join(dir, "dados.json"), "utf8");
  assert.equal(/sintetico-a|sintetico-b/.test(dados), false, "nada das outras escolas");

  assert.equal(copiar([`--verify=${dir}`]).status, 0);
  writeFileSync(join(dir, "dados.json"), dados.replace("Colégio Sintético C", "Colegio Sintetico C"));
  assert.equal(copiar([`--verify=${dir}`]).status, 2, "adulteração detectada");
});

test("cópia recusada com prévia bloqueada ou identificador de outra escola — nada é gravado", async () => {
  const pastas = readdirSync(backupRoot).length;
  const antes = await assinaturas();

  // Aluno com o e-mail do professor da OUTRA escola: conta de outra instituição.
  const cfgB = file("config-bloqueio.json", JSON.stringify(config({
    expected: { className: "1ª série A", expectedTotal: 1, emailDomains: [D, OUTRA.institution.domain] },
  })));
  const csvB = file("alunos-bloqueio.csv", csvText([OUTRA.teacher.email]));
  const r1 = copiar([`--config=${cfgB}`, `--csv=${csvB}`]);
  assert.equal(r1.status, 2);
  assert.match(r1.stderr, /conta_outra_instituicao/);

  // Turma nova, mas com o identificador da turma da OUTRA escola.
  const cfgC = file("config-colisao.json", JSON.stringify(config({
    institution: { id: "inst-sintetico-d", name: "Colégio Sintético D", slug: "colegio-sintetico-d", domain: D },
    academicYear: { id: "ay-sintetico-d-2026", label: "2026", startsOn: "2026-02-01", endsOn: "2026-12-15" },
    classroom: { id: OUTRA.classroom.id, name: "1ª série A", grade: "1ª série E.M." },
    teacher: { id: "teacher-sintetico-d", name: "Professor(a) D", email: `professor.d@${D}` },
    managers: [{ id: "manager-sintetico-d", name: "Gestão D", email: `gestora.d@${D}` }],
    expected: { className: "1ª série A", expectedTotal: 1, emailDomains: [D] },
  })));
  const csvC = file("alunos-colisao.csv", csvText([`estudante.d01@${D}`]));
  const r2 = copiar([`--config=${cfgC}`, `--csv=${csvC}`]);
  assert.equal(r2.status, 2);
  assert.match(r2.stderr, /outra instituição \(classrooms\)/);

  assert.equal(readdirSync(backupRoot).length, pastas, "nenhuma pasta nova");
  assert.deepEqual(await assinaturas(), antes);
});

test("credenciais da CLI: individuais, formato aleatório, fora do relatório e com troca obrigatória", async () => {
  const contas = lerCredenciais(cred1);
  const senhas = contas.map((c) => c.senha);
  assert.equal(new Set(senhas).size, senhas.length, "uma senha diferente por pessoa");
  for (const s of senhas) assert.match(s, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}(-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}){3}$/);
  assert.deepEqual(contas.map((c) => c.perfil).sort(), ["aluno", "aluno", "aluno", "aluno", "aluno", "gestor", "gestor", "professor"]);

  const r = importar(join(tmp, "credenciais-3.csv"));
  for (const s of senhas) assert.equal(`${r.stdout}${r.stderr}`.includes(s), false, "senha nunca no terminal");

  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: process.env.PILOT_TEST_DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query("select must_change_password, password_hash from users where institution_id = $1", [INST]);
    assert.equal(rows.length, 8);
    for (const u of rows) {
      assert.equal(u.must_change_password, true, "toda conta nasce obrigada a trocar a senha");
      assert.match(u.password_hash, /^scrypt:1:/);
      assert.equal(senhas.some((s) => u.password_hash.includes(s)), false, "senha não fica em claro");
    }
  } finally {
    await client.end();
  }

  const aluno = contas.find((c) => c.email === emailAluno(1));
  const sessao = await loginAs(aluno.email, aluno.senha);
  assert.ok(sessao, "a credencial temporária entra");
  assert.equal(sessao.mustChangePassword, true, "primeiro acesso exige troca");

  const { changeOwnPassword } = await import("../../src/modules/identity/provisioning/pilot-provisioning.ts");
  await changeOwnPassword((await import("./support/pilot-fixtures.mjs")).adminDb, sessao.platformUserId, "nova-senha-sintetica-c-2026");
  assert.equal(await loginAs(aluno.email, aluno.senha), null, "a senha inicial deixa de valer");
  const depois = await loginAs(aluno.email, "nova-senha-sintetica-c-2026");
  assert.equal(depois.mustChangePassword, false);
});
