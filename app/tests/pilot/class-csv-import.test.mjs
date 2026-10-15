/**
 * Importação da 1ª série A contra o banco real (efêmero): validação prévia
 * das contas existentes, repetição sem duplicar e bloqueio de e-mail de
 * outra instituição. Dados sintéticos.
 */

import "./support/pilot-hooks.mjs";

import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";

import { adminDb, OUTRA, PILOT, resetPilotDatabase, rosterFor } from "./support/pilot-fixtures.mjs";

const actor = "cli:teste-importacao";
const { provisionPilotClass } = await import(
  "../../src/modules/identity/provisioning/pilot-provisioning.ts"
);
const { parseClassCsv, precheckAgainstDatabase, precheckClassRows, toPilotStudents } = await import(
  "../../src/modules/identity/provisioning/class-csv-import.ts"
);

const dominio = PILOT.institution.domain;
const target = { institutionId: PILOT.institution.id, classroomId: PILOT.classroom.id };

function csvAlunos(n) {
  const linhas = ["nome,email_institucional,turma"];
  for (let i = 1; i <= n; i += 1) {
    const k = String(i).padStart(2, "0");
    linhas.push(`Estudante CSV ${k},estudante.csv.${k}@${dominio},1ª série A`);
  }
  return linhas.join("\n");
}

function rosterCsv(text) {
  const rows = parseClassCsv(text).rows;
  return { ...rosterFor({ ...PILOT, studentCount: 0 }), students: toPilotStudents(rows, PILOT.institution.id) };
}

async function contar(tabela, filtro = {}) {
  let q = adminDb.from(tabela).select("id", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filtro)) q = q.eq(k, v);
  const { count } = await q;
  return count;
}

beforeEach(async () => {
  await resetPilotDatabase();
});
after(async () => {
  await resetPilotDatabase();
});

test("importar o CSV duas vezes não duplica contas, alunos nem matrículas", async () => {
  const text = csvAlunos(35);
  const pre = precheckClassRows(parseClassCsv(text), {
    className: "1ª série A",
    expectedTotal: 35,
    emailDomains: [dominio],
  });
  assert.equal(pre.blocking, false, JSON.stringify(pre.issues));

  const antes = await precheckAgainstDatabase(adminDb, pre.rows, target);
  assert.equal(antes.toCreate, 35);

  const r1 = await provisionPilotClass(adminDb, rosterCsv(text), { dryRun: false, actor });
  assert.equal(r1.summary.failed, 0, JSON.stringify(r1.accounts.filter((a) => a.error)));
  const r2 = await provisionPilotClass(adminDb, rosterCsv(text), { dryRun: false, actor });
  assert.equal(r2.summary.created, 0);
  assert.equal(r2.enrollments.created, 0);
  assert.equal(r2.enrollments.existing, 35);

  assert.equal(await contar("students", { institution_id: PILOT.institution.id }), 35);
  assert.equal(await contar("enrollments", { classroom_id: PILOT.classroom.id }), 35);
  assert.equal(await contar("users"), 35 + 2);

  const depois = await precheckAgainstDatabase(adminDb, pre.rows, target);
  assert.equal(depois.alreadyLinked, 35);
  assert.equal(depois.toCreate, 0);
  assert.equal(depois.issues.length, 0);
});

test("aluno já cadastrado com outro identificador é reaproveitado, não duplicado", async () => {
  const roster = rosterFor({ ...PILOT, studentCount: 2 });
  roster.students = roster.students.map((s, i) => ({
    ...s,
    email: `estudante.csv.0${i + 1}@${dominio}`,
  }));
  await provisionPilotClass(adminDb, roster, { dryRun: false, actor });
  assert.equal(await contar("students", { institution_id: PILOT.institution.id }), 2);

  const r = await provisionPilotClass(adminDb, rosterCsv(csvAlunos(3)), { dryRun: false, actor });
  assert.equal(r.summary.failed, 0, JSON.stringify(r.accounts.filter((a) => a.error)));
  assert.equal(await contar("students", { institution_id: PILOT.institution.id }), 3, "só o terceiro é novo");
  assert.equal(await contar("enrollments", { classroom_id: PILOT.classroom.id }), 3);
});

test("e-mail de outra instituição ou de professor é divergência e não é vinculado", async () => {
  await provisionPilotClass(adminDb, rosterFor(OUTRA), { dryRun: false, actor });
  await provisionPilotClass(adminDb, rosterFor({ ...PILOT, studentCount: 0 }), { dryRun: false, actor });
  const { data: alunoB } = await adminDb
    .from("students")
    .select("email")
    .eq("institution_id", OUTRA.institution.id)
    .limit(1)
    .single();

  const text = [
    "nome,email_institucional,turma",
    `Novo,estudante.novo@${dominio},1ª série A`,
    `Colisão escola B,${alunoB.email},1ª série A`,
    `Colisão professor,${PILOT.teacher.email},1ª série A`,
  ].join("\n");
  const rows = parseClassCsv(text).rows;
  const pre = await precheckAgainstDatabase(adminDb, rows, target);
  assert.deepEqual(pre.byState.nova, [2]);
  assert.deepEqual(pre.byState.outra_instituicao, [3]);
  assert.deepEqual(pre.byState.outro_papel, [4]);
  assert.equal(pre.issues.filter((i) => i.blocking).length, 2);

  // Mesmo que alguém force a importação, a conta de B não é ligada à escola A.
  const r = await provisionPilotClass(adminDb, rosterCsv(text), { dryRun: false, actor });
  const falhas = r.accounts.filter((a) => a.outcome === "falhou").map((a) => a.email).sort();
  assert.deepEqual(falhas, [alunoB.email, PILOT.teacher.email].sort());
  const { count } = await adminDb
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("institution_id", PILOT.institution.id)
    .eq("email", alunoB.email);
  assert.equal(count, 0, "nenhum registro da escola A aponta para a conta da escola B");
});
