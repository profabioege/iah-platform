/**
 * Provisionamento da turma e ciclo de vida da credencial.
 *
 * Tudo contra o banco real, pelo mesmo módulo que a CLI administrativa
 * usa, e com login exercitado de verdade (`verifyCredentials`) — nada de
 * cookie injetado.
 */

import "./support/pilot-hooks.mjs";

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";

import {
  adminDb,
  credentialsFrom,
  loginAs,
  PILOT,
  resetPilotDatabase,
  rosterFor,
} from "./support/pilot-fixtures.mjs";

const actor = "cli:teste-do-piloto";

async function provisioning() {
  return import("../../src/modules/identity/provisioning/pilot-provisioning.ts");
}

before(async () => {
  await resetPilotDatabase();
});

beforeEach(async () => {
  await resetPilotDatabase();
});

after(async () => {
  await resetPilotDatabase();
});

test("simulação não escreve nada e mostra o plano completo", async () => {
  const { provisionPilotClass } = await provisioning();
  const report = await provisionPilotClass(adminDb, rosterFor(PILOT), {
    dryRun: true,
    actor,
  });

  assert.equal(report.dryRun, true);
  assert.equal(report.accounts.length, PILOT.studentCount + 2, "45 alunos + professor + gestor");
  assert.equal(report.summary.failed, 0);

  const { count: usuarios } = await adminDb
    .from("users")
    .select("id", { count: "exact", head: true });
  assert.equal(usuarios, 0, "simulação não pode criar usuário");
  const { count: auditoria } = await adminDb
    .from("admin_audit_log")
    .select("id", { count: "exact", head: true });
  assert.equal(auditoria, 0, "simulação não registra operação");
});

test("provisiona 45 estudantes com credencial individual e sem duplicidade", async () => {
  const { provisionPilotClass } = await provisioning();
  const report = await provisionPilotClass(adminDb, rosterFor(PILOT), {
    dryRun: false,
    actor,
  });

  assert.equal(report.summary.failed, 0, JSON.stringify(report.accounts.filter((a) => a.error)));
  assert.equal(report.summary.created, PILOT.studentCount + 2);
  assert.equal(report.enrollments.created, PILOT.studentCount);

  const senhas = [...credentialsFrom(report).values()];
  assert.equal(senhas.length, PILOT.studentCount + 2, "toda conta criada recebe senha própria");
  assert.equal(new Set(senhas).size, senhas.length, "nenhuma senha se repete entre contas");

  const { count: alunos } = await adminDb
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("institution_id", PILOT.institution.id);
  assert.equal(alunos, PILOT.studentCount);

  const { data: usuarios } = await adminDb
    .from("users")
    .select("must_change_password, credentials_version, password_hash")
    .eq("institution_id", PILOT.institution.id);
  assert.equal(usuarios.length, PILOT.studentCount + 2);
  for (const u of usuarios) {
    assert.equal(u.must_change_password, true, "toda conta nasce obrigada a trocar a senha");
    assert.equal(u.credentials_version, 1);
    assert.match(u.password_hash, /^scrypt:1:/, "senha guardada como hash scrypt");
  }
});

test("repetir o provisionamento não recria usuário nem duplica matrícula", async () => {
  const { provisionPilotClass } = await provisioning();
  await provisionPilotClass(adminDb, rosterFor(PILOT), { dryRun: false, actor });
  const segundo = await provisionPilotClass(adminDb, rosterFor(PILOT), { dryRun: false, actor });

  assert.equal(segundo.summary.created, 0);
  assert.equal(segundo.summary.existing, PILOT.studentCount + 2);
  assert.equal(segundo.enrollments.created, 0);
  assert.equal(segundo.enrollments.existing, PILOT.studentCount);

  const { count: usuarios } = await adminDb
    .from("users")
    .select("id", { count: "exact", head: true });
  assert.equal(usuarios, PILOT.studentCount + 2);
  const { count: matriculas } = await adminDb
    .from("enrollments")
    .select("id", { count: "exact", head: true });
  assert.equal(matriculas, PILOT.studentCount);
});

test("falha em uma linha não derruba a turma e aparece no relatório", async () => {
  const { provisionPilotClass } = await provisioning();
  const roster = rosterFor(PILOT);
  roster.students = [
    ...roster.students.slice(0, 3),
    // 1) linha repetida no lote (erro de planilha);
    { ...roster.students[0] },
    // 2) e-mail de acesso já usado por outra conta (o do professor).
    {
      externalId: "aluno-colidente",
      name: "Colisão sintética",
      email: PILOT.teacher.email,
    },
  ];

  const report = await provisionPilotClass(adminDb, roster, { dryRun: false, actor });
  assert.equal(report.summary.created, 3 + 2, "as linhas válidas entram");
  assert.equal(report.summary.failed, 2, "as duas linhas problemáticas são reportadas");
  for (const falha of report.accounts.filter((a) => a.outcome === "falhou")) {
    assert.ok(falha.error, "toda falha explica o motivo");
  }
  assert.ok(
    report.accounts.some((a) => (a.error ?? "").includes("duplicada")),
    "duplicidade no lote é nomeada",
  );

  const { count } = await adminDb
    .from("students")
    .select("id", { count: "exact", head: true });
  assert.equal(count, 3, "as linhas válidas continuam valendo");
});

test("a trilha administrativa registra a operação, sem senha nem hash", async () => {
  const { provisionPilotClass } = await provisioning();
  const report = await provisionPilotClass(adminDb, rosterFor(PILOT), { dryRun: false, actor });

  const { data: trilha } = await adminDb.from("admin_audit_log").select("*");
  assert.equal(trilha.length, 1);
  assert.equal(trilha[0].actor, actor);
  assert.equal(trilha[0].action, "provision.class");
  assert.equal(trilha[0].institution_id, PILOT.institution.id);

  const texto = JSON.stringify(trilha);
  for (const senha of credentialsFrom(report).values()) {
    assert.equal(texto.includes(senha), false, "senha não pode entrar na trilha");
  }
  assert.equal(/scrypt:/.test(texto), false, "hash não pode entrar na trilha");
});

test("estudante entra com a credencial temporária e é marcado para trocá-la", async () => {
  const { provisionPilotClass } = await provisioning();
  const report = await provisionPilotClass(adminDb, rosterFor(PILOT), { dryRun: false, actor });
  const credenciais = credentialsFrom(report);
  const email = "aluno.instsinteticoaaluno01@sintetico-a.test";
  const senha = credenciais.get(email);
  assert.ok(senha, "o aluno 01 precisa ter recebido credencial");

  assert.equal(await loginAs(email, "senha-errada"), null, "senha errada não entra");

  const sessao = await loginAs(email, senha);
  assert.ok(sessao, "a credencial temporária entra");
  assert.equal(sessao.role, "aluno");
  assert.equal(sessao.institutionId, PILOT.institution.id);
  assert.equal(sessao.mustChangePassword, true);
  assert.equal(sessao.credentialsVersion, 1);
});

test("troca da credencial inicial: entra com a nova, não com a antiga", async () => {
  const { provisionPilotClass, changeOwnPassword } = await provisioning();
  const report = await provisionPilotClass(adminDb, rosterFor(PILOT), { dryRun: false, actor });
  const email = "aluno.instsinteticoaaluno02@sintetico-a.test";
  const inicial = credentialsFrom(report).get(email);
  const sessao = await loginAs(email, inicial);

  await changeOwnPassword(adminDb, sessao.platformUserId, "nova-senha-sintetica-2026");

  assert.equal(await loginAs(email, inicial), null, "a senha inicial deixa de valer");
  const depois = await loginAs(email, "nova-senha-sintetica-2026");
  assert.ok(depois);
  assert.equal(depois.mustChangePassword, false);
  assert.equal(depois.credentialsVersion, 1, "troca pelo próprio usuário não derruba a sessão em uso");
});

test("recuperação assistida redefine, obriga nova troca e invalida sessões anteriores", async () => {
  const { provisionPilotClass, resetPilotCredential } = await provisioning();
  const report = await provisionPilotClass(adminDb, rosterFor(PILOT), { dryRun: false, actor });
  const email = "aluno.instsinteticoaaluno03@sintetico-a.test";
  const inicial = credentialsFrom(report).get(email);
  const antes = await loginAs(email, inicial);
  assert.equal(antes.credentialsVersion, 1);

  const reset = await resetPilotCredential(adminDb, email, {
    actor: "cli:coordenacao-sintetica",
    reason: "aluno esqueceu a senha",
  });

  assert.notEqual(reset.temporaryPassword, inicial);
  assert.equal(reset.credentialsVersion, 2);
  assert.equal(await loginAs(email, inicial), null, "a credencial anterior não vale mais");

  const depois = await loginAs(email, reset.temporaryPassword);
  assert.equal(depois.mustChangePassword, true);
  assert.equal(depois.credentialsVersion, 2);

  const { data: trilha } = await adminDb
    .from("admin_audit_log")
    .select("action, actor, details")
    .eq("action", "credential.reset");
  assert.equal(trilha.length, 1);
  assert.equal(trilha[0].actor, "cli:coordenacao-sintetica");
  assert.equal(JSON.stringify(trilha).includes(reset.temporaryPassword), false);
});

test("conta desativada não entra, mesmo com a senha certa", async () => {
  const { provisionPilotClass } = await provisioning();
  const report = await provisionPilotClass(adminDb, rosterFor(PILOT), { dryRun: false, actor });
  const email = "aluno.instsinteticoaaluno04@sintetico-a.test";
  const senha = credentialsFrom(report).get(email);
  assert.ok(await loginAs(email, senha));

  await adminDb.from("users").update({ status: "inactive" }).eq("email", email);
  assert.equal(await loginAs(email, senha), null);
});

test("limitador bloqueia insistência na mesma conta e não pune quem acerta", async () => {
  const { provisionPilotClass } = await provisioning();
  const { EMAIL_FAILURE_LIMIT } = await import("../../src/lib/login-throttle.ts");
  const report = await provisionPilotClass(adminDb, rosterFor(PILOT), { dryRun: false, actor });
  const credenciais = credentialsFrom(report);
  const alvo = "aluno.instsinteticoaaluno05@sintetico-a.test";
  const vizinho = "aluno.instsinteticoaaluno06@sintetico-a.test";
  const origem = "200.100.50.25"; // a escola inteira sai por este IP

  for (let i = 0; i < EMAIL_FAILURE_LIMIT; i += 1) {
    assert.equal(await loginAs(alvo, `tentativa-${i}`, { origin: origem }), null);
  }

  // Conta sob ataque: recusada mesmo com a senha correta.
  assert.equal(
    await loginAs(alvo, credenciais.get(alvo), { origin: origem }),
    null,
    "a conta alvo fica protegida durante a janela",
  );

  // Colega no mesmo IP continua entrando normalmente.
  const colega = await loginAs(vizinho, credenciais.get(vizinho), { origin: origem });
  assert.ok(colega, "o IP compartilhado da escola não pode bloquear a turma");
});
