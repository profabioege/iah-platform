/**
 * Missão de dois eixos (D-053) contra o banco real — migration 0021 + as
 * policies da 0010, pelas operações da aplicação com LOGIN REAL.
 *
 * O que se prova aqui (e não nos testes puros):
 *  - o registro de uso da IA do aluno persiste em `productions`, separado
 *    do texto da produção, e o autosave da produção NÃO o apaga (upsert
 *    do PostgREST grava só as colunas enviadas);
 *  - colega, professor de outra escola e aluno de outra escola não leem
 *    o registro nem a avaliação;
 *  - o aluno não escreve avaliação por eixo;
 *  - a avaliação dos dois eixos persiste e volta ao aluno separada;
 *  - o banco recusa um eixo sem o outro (CHECK da 0021), mesmo para
 *    quem não passa pela aplicação.
 */

import "./support/pilot-hooks.mjs";

import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import {
  adminDb,
  credentialsFrom,
  loginAs,
  logout,
  OUTRA,
  PILOT,
  provisionPilotFixtures,
  resetPilotDatabase,
} from "./support/pilot-fixtures.mjs";

const { missions } = await import("@/content/missions/index.ts");
const MISSAO = missions.find((m) => m.id === "01-a-fabrica-de-noticias");
const AXES = MISSAO.axes;

let senhasA;
let senhasB;

const professorA = PILOT.teacher.email;
const professorB = OUTRA.teacher.email;
const alunoA1 = "aluno.instsinteticoaaluno01@sintetico-a.test";
const alunoA2 = "aluno.instsinteticoaaluno02@sintetico-a.test";
const alunoB1 = "aluno.instsinteticobaluno01@sintetico-b.test";
const ID_A1 = "inst-sintetico-a-aluno-01";

const escopo = (studentId) => ({
  institutionId: PILOT.institution.id,
  classroomId: PILOT.classroom.id,
  studentId,
  missionId: MISSAO.id,
});

const evidencia = {
  tool: "assistente de texto (sintético)",
  request: "Escreva uma manchete falsa e convincente sobre a escola.",
  response: "Escola sintética é a primeira do país a trocar provas por IA.",
  verification: "Sem fonte, sem data e afirmação absoluta — critérios Fonte e Evidência.",
  decision: "Descartei a manchete; usei só a análise de por que ela engana.",
};

const avaliacaoPorEixo = {
  discipline: {
    level: "atingido",
    observedCriteria: [AXES.discipline.criteria[0]],
    note: "Comparou as narrativas com datas e fontes.",
    skillCode: AXES.discipline.skill.code,
  },
  ai: {
    level: "em_desenvolvimento",
    observedCriteria: [AXES.ai.criteria[0]],
    note: "Registrou a resposta da IA, mas a verificação ficou genérica.",
    competencyIds: [...AXES.ai.competencyIds],
  },
};

async function repositories() {
  const { getRequestRepositories } = await import(
    "@/modules/platform/infrastructure/request-repositories"
  );
  return getRequestRepositories();
}

async function cicloComo(email, senhas) {
  logout();
  const ator = await loginAs(email, senhas.get(email));
  assert.ok(ator, `login de ${email} precisa funcionar`);
  const { createLearningCycleService } = await import("@/modules/platform");
  return { ator, repos: await repositories(), cycle: createLearningCycleService(await repositories()) };
}

before(async () => {
  await resetPilotDatabase();
  const reports = await provisionPilotFixtures();
  senhasA = credentialsFrom(reports.a);
  senhasB = credentialsFrom(reports.b);
  // A Missão 01 entra no registro de missões (o conteúdo fica no código).
  const { error } = await adminDb.from("missions").upsert(
    { id: MISSAO.id, number: MISSAO.number, title: MISSAO.title, module: MISSAO.module, status: "published", version: 1 },
    { onConflict: "id" },
  );
  assert.equal(error, null);
});

after(async () => {
  logout();
  await resetPilotDatabase();
});

test("aluno grava o registro de uso da IA; o autosave da produção não o apaga", async () => {
  const { cycle } = await cicloComo(alunoA1, senhasA);
  await cycle.startMission(escopo(ID_A1));
  await cycle.saveAiEvidenceDraft(escopo(ID_A1), evidencia);
  await cycle.saveProductionDraft(escopo(ID_A1), "Relatório de auditoria sintético");

  const { data } = await adminDb
    .from("productions")
    .select("content, ai_tool, ai_request, ai_response, ai_verification, ai_decision")
    .eq("student_id", ID_A1)
    .eq("mission_id", MISSAO.id)
    .maybeSingle();
  assert.equal(data.content, "Relatório de auditoria sintético");
  assert.equal(data.ai_verification, evidencia.verification, "registro de IA em coluna própria");
  assert.equal(data.ai_decision, evidencia.decision);

  // Sessão nova = outro navegador: o banco é a única fonte.
  const { cycle: outra } = await cicloComo(alunoA1, senhasA);
  const work = await outra.getStudentWork(escopo(ID_A1));
  assert.deepEqual(work.aiEvidence, evidencia);
  assert.equal(work.production, "Relatório de auditoria sintético");
});

test("entrega exige o registro completo; produção e reflexão persistem", async () => {
  const { cycle } = await cicloComo(alunoA2, senhasA);
  const scopeA2 = escopo("inst-sintetico-a-aluno-02");
  await cycle.saveProductionDraft(scopeA2, "Produção do aluno 02");
  await cycle.saveAiEvidenceDraft(scopeA2, { ...evidencia, verification: "" });
  await assert.rejects(() => cycle.setProductionDelivered(scopeA2, true, AXES), /registro de uso da IA/);
  const { data: rascunho } = await adminDb
    .from("productions")
    .select("status")
    .eq("student_id", "inst-sintetico-a-aluno-02")
    .maybeSingle();
  assert.equal(rascunho.status, "draft", "nada foi entregue");

  const { cycle: a1 } = await cicloComo(alunoA1, senhasA);
  await a1.setProductionDelivered(escopo(ID_A1), true, AXES);
  await a1.saveReflectionDraft(escopo(ID_A1), "Minha hipótese mudou quando vi a data da foto.");
  const work = await a1.setReflectionRecorded(escopo(ID_A1), true);
  assert.ok(work.productionDeliveredAt);
  assert.ok(work.reflectionRecordedAt);
  await assert.rejects(() => a1.saveAiEvidenceDraft(escopo(ID_A1), evidencia), /já foi entregue/);

  const { data: reflexao } = await adminDb
    .from("reflections")
    .select("text, recorded_at")
    .eq("student_id", ID_A1)
    .maybeSingle();
  assert.equal(reflexao.text, "Minha hipótese mudou quando vi a data da foto.");
  assert.ok(reflexao.recorded_at);
});

test("colega da turma não lê o registro de IA do aluno 01", async () => {
  const { repos } = await cicloComo(alunoA2, senhasA);
  const producoes = await repos.productions.listByClassroomMission(
    PILOT.institution.id,
    PILOT.classroom.id,
    MISSAO.id,
  );
  assert.ok(producoes.every((p) => p.studentId !== ID_A1));
});

test("outra escola (professor e aluno) não alcança registro nem avaliação", async () => {
  for (const email of [professorB, alunoB1]) {
    const { repos } = await cicloComo(email, senhasB);
    const producoes = await repos.productions.listByClassroomMission(
      PILOT.institution.id,
      PILOT.classroom.id,
      MISSAO.id,
    );
    assert.deepEqual(producoes, [], `${email} não pode ver produções da escola A`);
    const reviews = await repos.missionReviews.listByClassroomMission(
      PILOT.institution.id,
      PILOT.classroom.id,
      MISSAO.id,
    );
    assert.deepEqual(reviews, []);
  }
});

test("aluno não grava avaliação por eixo (nem a própria)", async () => {
  const { repos } = await cicloComo(alunoA1, senhasA);
  await assert.rejects(() =>
    repos.missionReviews.save(PILOT.institution.id, {
      id: `review-${ID_A1}-${MISSAO.id}`,
      institutionId: PILOT.institution.id,
      classroomId: PILOT.classroom.id,
      studentId: ID_A1,
      missionId: MISSAO.id,
      grade: "Superou",
      observedCriteria: [],
      feedback: "autoavaliação indevida",
      reviewerId: "aluno",
      reviewerName: "aluno",
      reviewedAt: new Date().toISOString(),
      axes: { ...avaliacaoPorEixo, discipline: { ...avaliacaoPorEixo.discipline, level: "superado" } },
    }),
  );
  const { count } = await adminDb
    .from("mission_reviews")
    .select("id", { count: "exact", head: true })
    .eq("student_id", ID_A1);
  assert.equal(count, 0);
});

test("professor vê o registro separado e avalia os dois eixos; o aluno lê os dois", async () => {
  const { ator, repos, cycle } = await cicloComo(professorA, senhasA);
  const producoes = await repos.productions.listByClassroomMission(
    PILOT.institution.id,
    PILOT.classroom.id,
    MISSAO.id,
  );
  const doA1 = producoes.find((p) => p.studentId === ID_A1);
  assert.deepEqual(doA1.aiEvidence, evidencia, "o professor lê o registro de IA da própria turma");

  await assert.rejects(
    () =>
      cycle.reviewSubmission(
        escopo(ID_A1),
        { grade: "Bom", observedCriteria: [], feedback: "x", reviewerId: ator.platformUserId, reviewerName: "P", axes: null },
        AXES,
      ),
    /dois eixos/,
  );

  await cycle.reviewSubmission(
    escopo(ID_A1),
    {
      grade: "Bom",
      observedCriteria: [],
      feedback: "Análise histórica sólida; falta detalhar a verificação da IA.",
      reviewerId: ator.platformUserId,
      reviewerName: PILOT.teacher.name,
      axes: avaliacaoPorEixo,
    },
    AXES,
  );

  const { data } = await adminDb
    .from("mission_reviews")
    .select("discipline_level, discipline_skill, discipline_criteria, ai_level, ai_competencies, ai_criteria, ai_note")
    .eq("student_id", ID_A1)
    .maybeSingle();
  assert.equal(data.discipline_level, "atingido");
  assert.equal(data.discipline_skill, "EM13CHS101");
  assert.equal(data.ai_level, "em_desenvolvimento");
  assert.deepEqual(data.ai_competencies, AXES.ai.competencyIds);
  assert.deepEqual(data.discipline_criteria, [AXES.discipline.criteria[0]]);

  const { cycle: aluno } = await cicloComo(alunoA1, senhasA);
  const work = await aluno.getStudentWork(escopo(ID_A1));
  assert.equal(work.review.axes.discipline.level, "atingido");
  assert.equal(work.review.axes.ai.level, "em_desenvolvimento");
  assert.equal(work.review.axes.ai.note, avaliacaoPorEixo.ai.note);
});

test("o banco recusa um eixo sem o outro e nível fora da escala", async () => {
  const base = {
    id: "review-sintetico-check",
    institution_id: PILOT.institution.id,
    classroom_id: PILOT.classroom.id,
    student_id: "inst-sintetico-a-aluno-03",
    mission_id: MISSAO.id,
    grade: "Bom",
    observed_criteria: [],
    feedback: "",
    reviewer_id: "x",
    reviewer_name: "x",
    reviewed_at: new Date().toISOString(),
  };
  const soDisciplina = await adminDb
    .from("mission_reviews")
    .insert({ ...base, discipline_level: "atingido", discipline_skill: "EM13CHS101" });
  assert.match(soDisciplina.error?.message ?? "", /mission_reviews_axis_levels_check/);

  const semHabilidade = await adminDb
    .from("mission_reviews")
    .insert({ ...base, discipline_level: "atingido", ai_level: "atingido" });
  assert.match(semHabilidade.error?.message ?? "", /mission_reviews_axis_levels_check/);

  const nivelInventado = await adminDb
    .from("mission_reviews")
    .insert({ ...base, discipline_level: "otimo", discipline_skill: "EM13CHS101", ai_level: "atingido" });
  assert.match(nivelInventado.error?.message ?? "", /mission_reviews_axis_levels_check/);

  const longo = await adminDb
    .from("productions")
    .update({ ai_request: "x".repeat(2001) })
    .eq("student_id", ID_A1);
  assert.match(longo.error?.message ?? "", /productions_ai_evidence_length_check/);
});
