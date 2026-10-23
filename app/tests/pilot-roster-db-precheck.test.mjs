/**
 * Prévia com banco de TODOS os participantes (alunos, professor, gestores)
 * e execução protegida. Banco SIMULADO em memória — nenhum banco hospedado
 * é consultado. O cliente simulado registra toda gravação (insert, upsert,
 * update, delete, rpc e auth.admin.*) para provar que caso bloqueado não
 * escreve nada. Dados 100% sintéticos (domínio .example).
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

const {
  importAfterPrecheck,
  parseClassCsv,
  precheckAgainstDatabase,
  precheckParticipantEmails,
  precheckRosterAgainstDatabase,
  staffFromConfig,
  toPilotStudents,
} = await import("@/modules/identity/provisioning/class-csv-import.ts");
const { provisionPilotClass } = await import("@/modules/identity/provisioning/pilot-provisioning.ts");

const INST = "inst-sintetica";
const OUTRA = "inst-outra-sintetica";
const CLASSE = "class-sintetica-1a";
const target = { institutionId: INST, classroomId: CLASSE };
const D = "escola.example";

function config(over = {}) {
  return {
    institution: { id: INST, name: "Escola Sintética", slug: "escola-sintetica", domain: D },
    academicYear: { id: "ay-sintetico-2026", label: "2026", startsOn: "2026-02-01", endsOn: "2026-12-15" },
    classroom: { id: CLASSE, name: "1ª série A", grade: "1ª série E.M." },
    teacher: { id: "teacher-sintetico", name: "Professora Sintética", email: `professora@${D}` },
    managers: [
      { id: "manager-sintetico-1", name: "Gestora Um", email: `gestora.um@${D}` },
      { id: "manager-sintetico-2", name: "Gestora Dois", email: `gestora.dois@${D}` },
    ],
    expected: { className: "1ª série A", expectedTotal: 3, emailDomains: [D] },
    ...over,
  };
}
const csv = (...emails) =>
  ["nome,email_institucional,turma", ...emails.map((e, i) => `Estudante ${i + 1},${e},1ª série A`)].join("\n");
const ALUNOS = [`estudante.um@${D}`, `estudante.dois@${D}`, `estudante.tres@${D}`];
const rowsOf = (text) => parseClassCsv(text).rows;

/** Cliente Supabase simulado: lê das tabelas em memória e REGISTRA gravações. */
function fakeDb(tables = {}) {
  const writes = [];
  const reads = [];
  const record = (what) => {
    writes.push(what);
    return Promise.resolve({ data: null, error: null });
  };
  function from(table) {
    const filters = [];
    const run = () => {
      reads.push(table);
      return { data: (tables[table] ?? []).filter((r) => filters.every((f) => f(r))), error: null };
    };
    const b = {
      select: () => b,
      eq: (c, v) => (filters.push((r) => r[c] === v), b),
      in: (c, vs) => (filters.push((r) => vs.includes(r[c])), b),
      limit: () => b,
      order: () => b,
      maybeSingle: async () => ({ data: run().data[0] ?? null, error: null }),
      single: async () => ({ data: run().data[0] ?? null, error: null }),
      insert: () => record(`${table}.insert`),
      upsert: () => record(`${table}.upsert`),
      update: () => record(`${table}.update`),
      delete: () => record(`${table}.delete`),
      then: (res, rej) => Promise.resolve(run()).then(res, rej),
    };
    return b;
  }
  const admin = new Proxy({}, { get: (_t, k) => () => record(`auth.admin.${String(k)}`) });
  return { from, rpc: (fn) => record(`rpc.${fn}`), auth: { admin }, writes, reads };
}

let seq = 0;
/** Conta sintética: user + perfil (papel/status/instituição configuráveis). */
function conta(t, email, { inst = INST, status = "active", role = null, profileStatus = "active", profileInst = inst } = {}) {
  const id = `user-${++seq}`;
  (t.users ??= []).push({ id, email, institution_id: inst, status });
  if (role) (t.profiles ??= []).push({ user_id: id, role, status: profileStatus, institution_id: profileInst });
  return id;
}
function alunoVinculado(t, email) {
  conta(t, email, { role: "aluno" });
  const sid = `aluno-${++seq}`;
  (t.students ??= []).push({ id: sid, email, institution_id: INST });
  (t.enrollments ??= []).push({ student_id: sid, institution_id: INST, classroom_id: CLASSE });
}
/** Estado de uma turma já importada (todas as contas compatíveis). */
function jaImportada() {
  const t = {};
  conta(t, `professora@${D}`, { role: "professor" });
  conta(t, `gestora.um@${D}`, { role: "administrador" });
  conta(t, `gestora.dois@${D}`, { role: "administrador" });
  for (const e of ALUNOS) alunoVinculado(t, e);
  return t;
}

test("banco vazio: tudo novo, contagens por papel, sem bloqueio e sem gravação", async () => {
  const db = fakeDb();
  const r = await precheckRosterAgainstDatabase(db, rowsOf(csv(...ALUNOS)), staffFromConfig(config()), target);
  assert.equal(r.blocking, false, JSON.stringify(r.issues));
  assert.deepEqual(r.byRole, {
    aluno: { total: 3, novas: 3, compativeis: 0, bloqueadas: 0 },
    professor: { total: 1, novas: 1, compativeis: 0, bloqueadas: 0 },
    administrador: { total: 2, novas: 2, compativeis: 0, bloqueadas: 0 },
  });
  assert.deepEqual(db.writes, []);
  assert.ok(db.reads.includes("users") && db.reads.length > 0, "a prévia consulta as contas");
});

test("turma já importada: todas compatíveis (idempotência preservada)", async () => {
  const db = fakeDb(jaImportada());
  const r = await precheckRosterAgainstDatabase(db, rowsOf(csv(...ALUNOS)), staffFromConfig(config()), target);
  assert.equal(r.blocking, false, JSON.stringify(r.issues));
  assert.equal(r.students.alreadyLinked, 3);
  assert.deepEqual(r.byRole.professor, { total: 1, novas: 0, compativeis: 1, bloqueadas: 0 });
  assert.deepEqual(r.byRole.administrador, { total: 2, novas: 0, compativeis: 2, bloqueadas: 0 });
  assert.deepEqual(r.staff.map((e) => e.state), ["existente_compativel", "existente_compativel", "existente_compativel"]);
  assert.deepEqual(db.writes, []);
});

test("conflitos de professor e gestoras bloqueiam sem correção automática", async () => {
  const t = {};
  conta(t, `professora@${D}`, { role: "administrador" }); // outro papel
  conta(t, `gestora.um@${D}`, { inst: OUTRA, role: "administrador" }); // outra instituição
  conta(t, `gestora.dois@${D}`, { status: "inactive", role: "administrador" }); // conta inativa
  const db = fakeDb(t);
  const r = await precheckRosterAgainstDatabase(db, rowsOf(csv(...ALUNOS)), staffFromConfig(config()), target);
  assert.equal(r.blocking, true);
  assert.deepEqual(
    r.staff.map((e) => [e.reference, e.state]),
    [["professor", "outro_papel"], ["gestor 1", "outra_instituicao"], ["gestor 2", "inativa"]],
  );
  const kinds = r.issues.filter((i) => i.blocking).map((i) => i.kind).sort();
  assert.deepEqual(kinds, ["conta_inativa", "conta_outra_instituicao", "conta_outro_papel"]);
  assert.deepEqual(r.byRole.administrador, { total: 2, novas: 0, compativeis: 0, bloqueadas: 2 });
  assert.deepEqual(db.writes, []);
});

test("conta sem perfil ativo compatível bloqueia (professor, gestora e aluno)", async () => {
  const t = {};
  conta(t, `professora@${D}`); // sem perfil algum
  conta(t, `gestora.um@${D}`, { role: "administrador", profileStatus: "inactive" }); // perfil desativado
  conta(t, `gestora.dois@${D}`, { role: "administrador", profileInst: OUTRA }); // perfil só em outra instituição
  conta(t, ALUNOS[0], { role: "aluno", profileStatus: "inactive" });
  conta(t, ALUNOS[1], { role: "professor" }); // aluno com papel de professor
  const db = fakeDb(t);
  const r = await precheckRosterAgainstDatabase(db, rowsOf(csv(...ALUNOS)), staffFromConfig(config()), target);
  assert.deepEqual(r.staff.map((e) => e.state), ["sem_perfil_ativo", "sem_perfil_ativo", "sem_perfil_ativo"]);
  assert.deepEqual(r.students.byState.sem_perfil_ativo, [2]);
  assert.deepEqual(r.students.byState.outro_papel, [3]);
  assert.deepEqual(r.students.byState.nova, [4]);
  assert.deepEqual(r.byRole.aluno, { total: 3, novas: 1, compativeis: 0, bloqueadas: 2 });
  assert.equal(r.blocking, true);
  assert.deepEqual(db.writes, []);
});

test("e-mail repetido entre professor, gestoras e alunos é bloqueio (também sem banco)", async () => {
  const c = config();
  c.managers[0].email = c.teacher.email; // gestora = professor
  c.managers[1].email = ALUNOS[2].toUpperCase(); // gestora = aluno (caixa diferente)
  const rows = rowsOf(csv(...ALUNOS));
  const pure = precheckParticipantEmails(rows, staffFromConfig(c));
  assert.equal(pure.length, 1);
  assert.equal(pure[0].kind, "email_repetido_entre_papeis");
  assert.equal(pure[0].blocking, true);
  assert.deepEqual(pure[0].lines, [4]);
  assert.deepEqual(pure[0].refs.sort(), ["gestor 1", "gestor 2", "professor"]);

  const db = fakeDb();
  const r = await precheckRosterAgainstDatabase(db, rows, staffFromConfig(c), target);
  assert.ok(r.issues.some((i) => i.kind === "email_repetido_entre_papeis"));
  assert.equal(r.blocking, true);
  assert.deepEqual(db.writes, []);
});

test("sem repetição entre papéis, a checagem pura não acusa nada", () => {
  assert.deepEqual(precheckParticipantEmails(rowsOf(csv(...ALUNOS)), staffFromConfig(config())), []);
});

test("relatório não carrega nomes completos, e-mails completos nem credenciais", async () => {
  const t = {};
  conta(t, `professora@${D}`, { role: "aluno" });
  conta(t, ALUNOS[0], { inst: OUTRA, role: "aluno" });
  const r = await precheckRosterAgainstDatabase(fakeDb(t), rowsOf(csv(...ALUNOS)), staffFromConfig(config()), target);
  const texto = JSON.stringify({ issues: r.issues, staff: r.staff, byRole: r.byRole });
  for (const proibido of [`professora@${D}`, ...ALUNOS, "Estudante 1", "Professora Sintética", "senha", "password"]) {
    assert.ok(!texto.toLowerCase().includes(proibido.toLowerCase()), proibido);
  }
});

test("execução protegida: com bloqueio, a importação inteira é recusada e nada é gravado", async () => {
  const t = {};
  conta(t, `gestora.dois@${D}`, { role: "professor" }); // um único conflito
  const db = fakeDb(t);
  const c = config();
  const rows = rowsOf(csv(...ALUNOS));
  const roster = {
    institution: c.institution,
    academicYear: c.academicYear,
    classroom: c.classroom,
    teacher: c.teacher,
    managers: c.managers,
    students: toPilotStudents(rows, INST),
  };
  let chamadas = 0;
  const { precheck, result } = await importAfterPrecheck(db, rows, staffFromConfig(c), target, () => {
    chamadas += 1;
    return provisionPilotClass(db, roster, { dryRun: false, actor: "cli:teste" });
  });
  assert.equal(result, null);
  assert.equal(precheck.blocking, true);
  assert.equal(chamadas, 0, "o provisionamento (primeiro upsert) nem é chamado");
  assert.deepEqual(db.writes, [], "nenhuma gravação");
});

test("execução protegida: sem bloqueio, o provisionamento é chamado uma vez", async () => {
  const db = fakeDb(jaImportada());
  let chamadas = 0;
  const { result } = await importAfterPrecheck(db, rowsOf(csv(...ALUNOS)), staffFromConfig(config()), target, async () => {
    chamadas += 1;
    return "provisionado";
  });
  assert.equal(result, "provisionado");
  assert.equal(chamadas, 1);
  assert.deepEqual(db.writes, [], "a prévia em si não grava");
});

test("formato anterior de precheckAgainstDatabase preservado para os ensaios", async () => {
  const t = jaImportada();
  conta(t, `estudante.quatro@${D}`, { inst: OUTRA, role: "aluno" });
  const rows = rowsOf(csv(...ALUNOS, `estudante.quatro@${D}`, `estudante.cinco@${D}`, `professora@${D}`));
  const r = await precheckAgainstDatabase(fakeDb(t), rows, target);
  assert.deepEqual(r.byState.existente_vinculada, [2, 3, 4]);
  assert.deepEqual(r.byState.outra_instituicao, [5]);
  assert.deepEqual(r.byState.nova, [6]);
  assert.deepEqual(r.byState.outro_papel, [7]);
  assert.equal(r.alreadyLinked, 3);
  assert.equal(r.toCreate, 1);
  assert.equal(r.issues.filter((i) => i.blocking).length, 2);
});

// ------------------------------------------------------------- CLI offline
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "iah-papeis-teste-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

test("CLI --offline: e-mail de gestora igual ao de aluno bloqueia, com e-mail mascarado", () => {
  const c = config();
  c.managers[1].email = ALUNOS[1];
  const cfg = join(tmp, "cfg.json");
  const alunos = join(tmp, "alunos.csv");
  writeFileSync(cfg, JSON.stringify(c));
  writeFileSync(alunos, csv(...ALUNOS));
  const r = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", "scripts/pilot-import-turma.mjs", `--config=${cfg}`, `--csv=${alunos}`, "--offline"],
    { cwd: appDir, encoding: "utf8" },
  );
  assert.equal(r.status, 2, r.stderr + r.stdout);
  assert.match(r.stdout, /\[BLOQUEIA\] O mesmo e-mail aparece para mais de um participante/);
  assert.match(r.stdout, /linhas 3 \(es\*\*\*@escola\.example\) — gestor 2 \(es\*\*\*@escola\.example\)/);
  assert.ok(!r.stdout.includes(ALUNOS[1]), "e-mail completo não aparece");
  assert.ok(!r.stdout.includes("Gestora Dois") && !r.stdout.includes("Estudante 2"), "nomes não aparecem");
});

test("CLI --offline: configuração sintética válida continua apta e informa professor/gestores", () => {
  const cfg = join(tmp, "cfg-ok.json");
  const alunos = join(tmp, "alunos-ok.csv");
  writeFileSync(cfg, JSON.stringify(config()));
  writeFileSync(alunos, csv(...ALUNOS));
  const r = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", "scripts/pilot-import-turma.mjs", `--config=${cfg}`, `--csv=${alunos}`, "--offline"],
    { cwd: appDir, encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /Professor e gestores:\s+3 na configuração/);
  assert.match(r.stdout, /apto para importar/);
});
