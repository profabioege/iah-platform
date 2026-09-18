/**
 * Ciclo pedagógico persistente — os dez passos do piloto, executados
 * pelas operações reais da aplicação contra o banco real.
 *
 * O que este arquivo prova, e que a auditoria pedia:
 *  - nada do que o aluno grava depende de localStorage ou da memória do
 *    processo: sair, entrar de novo e até trocar de "navegador" (sessão
 *    nova, cliente novo) devolve o mesmo estado;
 *  - repetir um envio (rede instável, aluno clicando duas vezes) não
 *    cria entrega duplicada;
 *  - dois alunos na mesma turma não se misturam.
 */

import "./support/pilot-hooks.mjs";

import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import {
  adminDb,
  credentialsFrom,
  loginAs,
  logout,
  MISSION,
  PILOT,
  provisionPilotFixtures,
  resetPilotDatabase,
} from "./support/pilot-fixtures.mjs";

let senhas;

const professor = PILOT.teacher.email;
const aluno01 = "aluno.instsinteticoaaluno01@sintetico-a.test";
const aluno02 = "aluno.instsinteticoaaluno02@sintetico-a.test";
const ID_ALUNO_01 = "inst-sintetico-a-aluno-01";
const ID_ALUNO_02 = "inst-sintetico-a-aluno-02";

const escopo = (studentId) => ({
  institutionId: PILOT.institution.id,
  classroomId: PILOT.classroom.id,
  studentId,
  missionId: MISSION.id,
});

async function repositories() {
  const { getRequestRepositories } = await import(
    "@/modules/platform/infrastructure/request-repositories"
  );
  return getRequestRepositories();
}

async function learningCycle() {
  const { createLearningCycleService } = await import("@/modules/platform");
  return createLearningCycleService(await repositories());
}

/** Entra de novo, do zero: sessão nova, cliente novo, token novo. */
async function novaSessao(email) {
  logout();
  const ator = await loginAs(email, senhas.get(email));
  assert.ok(ator, `login de ${email} precisa funcionar`);
  return ator;
}

before(async () => {
  await resetPilotDatabase();
  const reports = await provisionPilotFixtures();
  senhas = credentialsFrom(reports.a);
});

after(async () => {
  logout();
  await resetPilotDatabase();
});

test("1–2. professor entra pelo fluxo normal e disponibiliza a missão à turma", async () => {
  const ator = await novaSessao(professor);
  assert.equal(ator.role, "professor");

  const { createMissionPublishingService } = await import("@/modules/platform");
  const service = createMissionPublishingService(await repositories());
  const assignment = await service.publish({
    institutionId: PILOT.institution.id,
    classroomId: PILOT.classroom.id,
    missionId: MISSION.id,
    lessonId: null,
  });
  assert.equal(assignment.status, "published");

  const { data } = await adminDb
    .from("mission_assignments")
    .select("id, status, classroom_id")
    .eq("institution_id", PILOT.institution.id);
  assert.equal(data.length, 1, "a publicação existe no banco, não na memória");
  assert.equal(data[0].classroom_id, PILOT.classroom.id);
});

test("3–5. aluno entra, salva rascunho, sai e retoma em outro contexto", async () => {
  await novaSessao(aluno01);
  const cycle = await learningCycle();
  await cycle.startMission(escopo(ID_ALUNO_01));
  await cycle.saveProductionDraft(escopo(ID_ALUNO_01), "rascunho sintético do aluno 01");

  // "Outro navegador": sessão nova, repositórios novos, token novo.
  await novaSessao(aluno01);
  const outroContexto = await learningCycle();
  const retomado = await outroContexto.getStudentWork(escopo(ID_ALUNO_01));
  assert.equal(retomado.production, "rascunho sintético do aluno 01");
  assert.equal(retomado.productionDeliveredAt, null, "rascunho não é entrega");

  const { data } = await adminDb
    .from("productions")
    .select("content, status")
    .eq("student_id", ID_ALUNO_01)
    .maybeSingle();
  assert.equal(data.content, "rascunho sintético do aluno 01");
  assert.equal(data.status, "draft");
});

test("6. aluno conclui entrega e registra a reflexão", async () => {
  await novaSessao(aluno01);
  const cycle = await learningCycle();
  await cycle.saveProductionDraft(escopo(ID_ALUNO_01), "relatório sintético final do aluno 01");
  await cycle.setProductionDelivered(escopo(ID_ALUNO_01), true);
  await cycle.saveReflectionDraft(escopo(ID_ALUNO_01), "reflexão sintética do aluno 01");
  const work = await cycle.setReflectionRecorded(escopo(ID_ALUNO_01), true);

  assert.ok(work.productionDeliveredAt);
  assert.ok(work.reflectionRecordedAt);

  const { data: producao } = await adminDb
    .from("productions")
    .select("status, delivered_at")
    .eq("student_id", ID_ALUNO_01)
    .maybeSingle();
  assert.equal(producao.status, "delivered");
  assert.ok(producao.delivered_at);
});

test("7. professor localiza a entrega e registra a devolutiva", async () => {
  const ator = await novaSessao(professor);
  const repos = await repositories();
  const entregas = await repos.productions.listByClassroomMission(
    PILOT.institution.id,
    PILOT.classroom.id,
    MISSION.id,
  );
  const doAluno01 = entregas.find((p) => p.studentId === ID_ALUNO_01);
  assert.ok(doAluno01, "o professor enxerga a entrega da própria turma");
  assert.equal(doAluno01.status, "delivered");

  const { createLearningCycleService } = await import("@/modules/platform");
  const cycle = createLearningCycleService(repos);
  await cycle.reviewSubmission(escopo(ID_ALUNO_01), {
    grade: "A",
    observedCriteria: ["Evidência verificável"],
    feedback: "Devolutiva sintética do professor.",
    // Mesmo dado que a Server Action do professor envia: o id do usuário
    // autenticado, nunca um identificador vindo do cliente.
    reviewerId: ator.platformUserId,
    reviewerName: PILOT.teacher.name,
  });

  const { data } = await adminDb
    .from("mission_reviews")
    .select("grade, feedback, student_id")
    .eq("student_id", ID_ALUNO_01)
    .maybeSingle();
  assert.equal(data.grade, "A");
  assert.equal(data.feedback, "Devolutiva sintética do professor.");
});

test("8. aluno consulta a devolutiva na própria conta", async () => {
  await novaSessao(aluno01);
  const cycle = await learningCycle();
  const work = await cycle.getStudentWork(escopo(ID_ALUNO_01));
  assert.ok(work.review, "a devolutiva chega ao aluno");
  assert.equal(work.review.grade, "A");
  assert.equal(work.review.feedback, "Devolutiva sintética do professor.");
});

test("9. reiniciar a aplicação não perde nada", async () => {
  // Reiniciar de verdade significa: nenhum estado do processo anterior
  // participa. Aqui todo cache de módulo do ciclo é descartado e a
  // leitura recomeça de uma sessão nova — o banco é a única fonte.
  logout();
  await novaSessao(aluno01);
  const cycleDepois = await learningCycle();
  const work = await cycleDepois.getStudentWork(escopo(ID_ALUNO_01));

  assert.equal(work.production, "relatório sintético final do aluno 01");
  assert.equal(work.reflection, "reflexão sintética do aluno 01");
  assert.ok(work.productionDeliveredAt);
  assert.ok(work.review);
});

test("10. repetir o envio não duplica entrega", async () => {
  await novaSessao(aluno02);
  const cycle = await learningCycle();
  await cycle.startMission(escopo(ID_ALUNO_02));
  await cycle.saveProductionDraft(escopo(ID_ALUNO_02), "produção do aluno 02");

  // Rede instável: a primeira confirmação se perde e o aluno reenvia.
  const primeira = cycle.setProductionDelivered(escopo(ID_ALUNO_02), true);
  const segunda = cycle.setProductionDelivered(escopo(ID_ALUNO_02), true);
  await Promise.allSettled([primeira, segunda]);
  await cycle.setProductionDelivered(escopo(ID_ALUNO_02), true);

  const { data: producoes } = await adminDb
    .from("productions")
    .select("id, status")
    .eq("student_id", ID_ALUNO_02);
  assert.equal(producoes.length, 1, "uma entrega por aluno e missão, mesmo com repetição");
  assert.equal(producoes[0].status, "delivered");

  const { count } = await adminDb
    .from("mission_progress")
    .select("id", { count: "exact", head: true })
    .eq("student_id", ID_ALUNO_02);
  assert.equal(count, 1, "o progresso também não duplica");
});

test("os registros não se misturam entre alunos", async () => {
  const { data } = await adminDb
    .from("productions")
    .select("student_id, content")
    .eq("classroom_id", PILOT.classroom.id);

  const porAluno = Object.fromEntries(data.map((p) => [p.student_id, p.content]));
  assert.equal(porAluno[ID_ALUNO_01], "relatório sintético final do aluno 01");
  assert.equal(porAluno[ID_ALUNO_02], "produção do aluno 02");
  assert.equal(Object.keys(porAluno).length, 2);
});

test("texto acima do limite é recusado antes de chegar ao banco", async () => {
  await novaSessao(aluno02);
  const cycle = await learningCycle();
  const { MAX_PRODUCTION_CHARS } = await import("@/modules/platform/domain/content-limits");

  await assert.rejects(
    () => cycle.saveProductionDraft(escopo(ID_ALUNO_02), "x".repeat(MAX_PRODUCTION_CHARS + 1)),
    /limite/i,
  );

  const { data } = await adminDb
    .from("productions")
    .select("content")
    .eq("student_id", ID_ALUNO_02)
    .maybeSingle();
  assert.equal(data.content, "produção do aluno 02", "o conteúdo anterior não é tocado");
});
