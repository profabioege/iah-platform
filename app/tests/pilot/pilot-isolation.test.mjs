/**
 * Isolamento — provado contra o banco, pelas operações da aplicação.
 *
 * Cada caso entra com LOGIN REAL (senha conferida contra o banco),
 * monta os repositórios da requisição como as telas montam
 * (`getRequestRepositories`) e tenta alcançar o que não é seu. O que
 * recusa é a policy da migration 0010 — não um `if` de interface.
 *
 * Procurar palavra em arquivo não prova isolamento; por isso aqui só há
 * consulta e escrita de verdade.
 */

import "./support/pilot-hooks.mjs";

import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import {
  adminDb,
  credentialsFrom,
  forceSession,
  loginAs,
  logout,
  MISSION,
  OUTRA,
  PILOT,
  provisionPilotFixtures,
  resetPilotDatabase,
} from "./support/pilot-fixtures.mjs";

let senhasA;
let senhasB;

const alunoA1 = "aluno.instsinteticoaaluno01@sintetico-a.test";
const alunoA2 = "aluno.instsinteticoaaluno02@sintetico-a.test";
// Aluno usado só na verificação de visibilidade da reflexão: precisa de uma
// conta que nenhum teste anterior tenha redefinido.
const alunoA8 = "aluno.instsinteticoaaluno08@sintetico-a.test";
const professorA = PILOT.teacher.email;
const gestorA = PILOT.managers[0].email;
const professorB = OUTRA.teacher.email;

const TURMA_SEM_VINCULO = "class-sintetico-a-sem-vinculo";

async function repositories() {
  const { getRequestRepositories } = await import(
    "@/modules/platform/infrastructure/request-repositories"
  );
  return getRequestRepositories();
}

/** Produção semeada diretamente (service_role) para servir de alvo. */
async function seedProduction(institutionId, classroomId, studentId, content) {
  const now = new Date().toISOString();
  const { error } = await adminDb.from("productions").upsert(
    {
      id: `production-${studentId}-${MISSION.id}`,
      institution_id: institutionId,
      classroom_id: classroomId,
      student_id: studentId,
      mission_id: MISSION.id,
      content,
      status: "draft",
      started_at: now,
      updated_at: now,
    },
    { onConflict: "id" },
  );
  assert.equal(error, null);
}

before(async () => {
  await resetPilotDatabase();
  const reports = await provisionPilotFixtures();
  senhasA = credentialsFrom(reports.a);
  senhasB = credentialsFrom(reports.b);

  // Turma da mesma escola SEM vínculo com o professor A.
  await adminDb.from("classrooms").upsert(
    {
      id: TURMA_SEM_VINCULO,
      institution_id: PILOT.institution.id,
      academic_year_id: PILOT.academicYear.id,
      name: "1ª série Z",
      grade: "1ª série E.M.",
    },
    { onConflict: "id" },
  );

  await seedProduction(
    PILOT.institution.id,
    PILOT.classroom.id,
    "inst-sintetico-a-aluno-01",
    "texto do aluno 01",
  );
  await seedProduction(
    PILOT.institution.id,
    PILOT.classroom.id,
    "inst-sintetico-a-aluno-02",
    "texto do aluno 02",
  );
  await seedProduction(
    OUTRA.institution.id,
    OUTRA.classroom.id,
    "inst-sintetico-b-aluno-01",
    "texto da outra escola",
  );
});

after(async () => {
  logout();
  await resetPilotDatabase();
});

test("aluno não lê produção de colega da própria turma", async () => {
  await loginAs(alunoA1, senhasA.get(alunoA1));
  const repos = await repositories();

  const producoes = await repos.productions.listByClassroomMission(
    PILOT.institution.id,
    PILOT.classroom.id,
    MISSION.id,
  );

  assert.equal(producoes.length, 1, "a consulta pede a turma inteira; o banco devolve só o dono");
  assert.equal(producoes[0].studentId, "inst-sintetico-a-aluno-01");
  assert.equal(
    producoes.some((p) => p.content.includes("aluno 02")),
    false,
  );
});

test("aluno não altera produção de colega", async () => {
  await loginAs(alunoA1, senhasA.get(alunoA1));
  const repos = await repositories();

  await assert.rejects(
    () =>
      repos.productions.save(PILOT.institution.id, {
        id: `production-inst-sintetico-a-aluno-02-${MISSION.id}`,
        institutionId: PILOT.institution.id,
        classroomId: PILOT.classroom.id,
        studentId: "inst-sintetico-a-aluno-02",
        missionId: MISSION.id,
        content: "invasão",
        status: "draft",
        startedAt: new Date().toISOString(),
        deliveredAt: null,
        updatedAt: new Date().toISOString(),
      }),
    "gravar no lugar do colega tem de falhar",
  );

  const { data } = await adminDb
    .from("productions")
    .select("content")
    .eq("student_id", "inst-sintetico-a-aluno-02")
    .maybeSingle();
  assert.equal(data.content, "texto do aluno 02", "o texto do colega continua intacto");
});

test("professor não alcança turma sem vínculo, nem da própria escola", async () => {
  await loginAs(professorA, senhasA.get(professorA));
  const repos = await repositories();

  const turmas = await repos.classrooms.listByInstitution(PILOT.institution.id);
  assert.deepEqual(
    turmas.map((t) => t.id),
    [PILOT.classroom.id],
    "só a turma vinculada aparece",
  );

  const alheias = await repos.productions.listByClassroomMission(
    PILOT.institution.id,
    TURMA_SEM_VINCULO,
    MISSION.id,
  );
  assert.deepEqual(alheias, []);
});

test("professor não alcança dados de outra instituição", async () => {
  await loginAs(professorA, senhasA.get(professorA));
  const repos = await repositories();

  const producoes = await repos.productions.listByClassroomMission(
    OUTRA.institution.id,
    OUTRA.classroom.id,
    MISSION.id,
  );
  assert.deepEqual(producoes, [], "trocar o id da instituição na chamada não amplia acesso");

  const alunos = await repos.students.listByClassroom(
    OUTRA.institution.id,
    OUTRA.classroom.id,
  );
  assert.deepEqual(alunos, []);
});

test("gestor enxerga a própria instituição e não a outra", async () => {
  await loginAs(gestorA, senhasA.get(gestorA));
  const repos = await repositories();

  const daCasa = await repos.classrooms.listByInstitution(PILOT.institution.id);
  assert.ok(daCasa.length >= 2, "o gestor vê as turmas da própria escola");

  const daOutra = await repos.classrooms.listByInstitution(OUTRA.institution.id);
  assert.deepEqual(daOutra, []);

  const instituicaoAlheia = await repos.institutions.getById(OUTRA.institution.id);
  assert.equal(instituicaoAlheia, null);
});

test("professor da outra escola não vê a turma do piloto", async () => {
  await loginAs(professorB, senhasB.get(professorB));
  const repos = await repositories();

  const producoes = await repos.productions.listByClassroomMission(
    PILOT.institution.id,
    PILOT.classroom.id,
    MISSION.id,
  );
  assert.deepEqual(producoes, []);
});

test("adulterar as claims da sessão não amplia acesso", async () => {
  // Sessão forjada: mesmo usuário, instituição e papel trocados à mão.
  const { data: user } = await adminDb
    .from("users")
    .select("id, credentials_version")
    .eq("email", alunoA1)
    .maybeSingle();

  forceSession({
    platformUserId: user.id,
    institutionId: OUTRA.institution.id, // instituição que não é dele
    role: "administrador", // papel que não é dele
    credentialsVersion: user.credentials_version,
  });

  await assert.rejects(
    () => repositories(),
    /Sessão inválida/,
    "o ator é reconferido contra o banco: papel e instituição da sessão não bastam",
  );
});

test("sessão emitida antes de uma redefinição deixa de valer", async () => {
  await loginAs(alunoA2, senhasA.get(alunoA2));
  const antes = await repositories();
  assert.ok(await antes.productions.listByStudent(
    PILOT.institution.id,
    "inst-sintetico-a-aluno-02",
  ));

  const { resetPilotCredential } = await import(
    "../../src/modules/identity/provisioning/pilot-provisioning.ts"
  );
  await resetPilotCredential(adminDb, alunoA2, { actor: "cli:teste" });

  await assert.rejects(() => repositories(), /Sessão inválida/);
});

test("sem sessão nenhuma ação protegida executa", async () => {
  logout();
  await assert.rejects(() => repositories(), /Sessão inválida/);
});

test("conta desativada perde acesso na mesma sessão", async () => {
  const aluno = "aluno.instsinteticoaaluno07@sintetico-a.test";
  await loginAs(aluno, senhasA.get(aluno));
  assert.ok(await repositories(), "com a conta ativa, a sessão vale");

  await adminDb.from("users").update({ status: "inactive" }).eq("email", aluno);
  await assert.rejects(() => repositories(), /Sessão inválida/);
  await adminDb.from("users").update({ status: "active" }).eq("email", aluno);
});

test("reflexão respeita a visibilidade definida pelo produto", async () => {
  const agora = new Date().toISOString();
  await adminDb.from("reflections").upsert(
    [
      {
        id: "reflection-compartilhada",
        institution_id: PILOT.institution.id,
        classroom_id: PILOT.classroom.id,
        student_id: "inst-sintetico-a-aluno-01",
        mission_id: MISSION.id,
        text: "reflexão compartilhada com o professor",
        visibility: "shared_with_teacher",
        recorded_at: agora,
      },
      {
        id: "reflection-privada",
        institution_id: PILOT.institution.id,
        classroom_id: PILOT.classroom.id,
        student_id: "inst-sintetico-a-aluno-08",
        mission_id: MISSION.id,
        text: "reflexão privada do aluno",
        visibility: "private",
        recorded_at: agora,
      },
    ],
    { onConflict: "id" },
  );

  await loginAs(professorA, senhasA.get(professorA));
  const doProfessor = await repositories();
  const lidas = await doProfessor.reflections.listByClassroomMission(
    PILOT.institution.id,
    PILOT.classroom.id,
    MISSION.id,
  );
  assert.deepEqual(
    lidas.map((r) => r.id),
    ["reflection-compartilhada"],
    "o professor só lê o que foi compartilhado com ele",
  );

  await loginAs(alunoA8, senhasA.get(alunoA8));
  const doAluno = await repositories();
  const minhas = await doAluno.reflections.listByStudent(
    PILOT.institution.id,
    "inst-sintetico-a-aluno-08",
  );
  assert.deepEqual(
    minhas.map((r) => r.id),
    ["reflection-privada"],
    "a reflexão privada continua sendo do aluno",
  );
});
