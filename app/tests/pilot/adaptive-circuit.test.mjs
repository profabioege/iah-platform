/**
 * Circuito adaptativo (D-051) — provado contra o banco real (PostgreSQL +
 * PostgREST efêmeros, migrations 0001–0019), com LOGIN REAL.
 *
 * Híbrido: o reforço é automático (o aluno pede, o banco escolhe e
 * confere); o avanço de habilidade é do professor. Prova também:
 * rodada pessoal (só o próprio aluno alcança), nunca repete questão,
 * sugestão não revisada não entra em rodada automática, banco esgotado é
 * avisado, circuito pausado não gera rodada. Dados 100% sintéticos.
 */

import "./support/pilot-hooks.mjs";

import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import pg from "pg";

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

const RECORTE = "../../src/modules/question-bank/seeds/recorte-provisorio.ts";
const CONTEXT = "@/modules/question-bank/infrastructure/request-context";

const professorA = PILOT.teacher.email;
const gestorA = PILOT.managers[0].email;
const professorB = OUTRA.teacher.email;
const aluno = (escola, n) =>
  `aluno.instsintetico${escola}aluno${String(n).padStart(2, "0")}@sintetico-${escola}.test`;
const studentId = (escola, n) => `inst-sintetico-${escola}-aluno-${String(n).padStart(2, "0")}`;

const A = PILOT.institution.id;
const TURMA = PILOT.classroom.id;
const MAT = "bncc-em13mat101";
const CHS = "bncc-em13chs101";
const CIRCUITO = `circuit:${TURMA}`;

let senhas;
let users;

async function sql(text, params = []) {
  const client = new pg.Client({ connectionString: process.env.PILOT_TEST_DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(text, params)).rows;
  } finally {
    await client.end();
  }
}

async function as(email) {
  const actor = await loginAs(email, senhas.get(email));
  assert.ok(actor, `login de ${email}`);
  const { getQuestionBankContext } = await import(CONTEXT);
  return getQuestionBankContext();
}

async function scopedDb() {
  const { getDatabaseActor } = await import("@/modules/platform/infrastructure/database/request-actor");
  const { getScopedDatabaseClient } = await import("@/modules/platform/infrastructure/database/scoped-client");
  return getScopedDatabaseClient(await getDatabaseActor());
}

async function userId(email) {
  const { data, error } = await adminDb.from("users").select("id").eq("email", email).single();
  assert.equal(error, null);
  return data.id;
}

function ok(step, { error }) {
  assert.equal(error, null, `${step}: ${error?.message}`);
}

/** Item sintético aprovado pelo fluxo editorial real (autor ≠ revisor). */
async function approvedItem(code, skillId, componentId, difficulty) {
  const q = `q:${A}:${code}`;
  const v = `qv:${A}:${code}:1`;
  ok(`questão ${code}`, await adminDb.from("questions").insert({
    id: q, institution_id: A, component_id: componentId, skill_id: skillId, created_by: users.professorA,
  }));
  ok(`versão ${code}`, await adminDb.from("question_versions").insert({
    id: v, institution_id: A, question_id: q, version: 1,
    stem: `Item sintético do circuito ${code}.`,
    options: ["A", "B", "C", "D"].map((key) => ({ key, text: `opção ${key}` })),
    editorial_difficulty: difficulty, source_id: `src:${A}:sinteticos-recorte-provisorio`,
    authorship: "Teste sintético do circuito", created_by: users.professorA,
  }));
  ok(`gabarito ${code}`, await adminDb.from("question_version_keys").insert({
    version_id: v, institution_id: A, answer_key: "A", resolution: `Resolução sintética de ${code}.`,
  }));
  ok(`envio ${code}`, await adminDb.from("question_versions").update({ status: "em_revisao" }).eq("id", v));
  ok(`revisão ${code}`, await adminDb.from("question_reviews").insert({
    id: `rev:${v}`, institution_id: A, version_id: v, reviewer_id: users.gestorA, decision: "aprovada",
    checklist: { gabarito: true, habilidade: true, direitos: true, linguagem: true }, comment: null,
  }));
  return { q, v };
}

/** Responde a rodada com o gabarito (lido pelo banco de teste) e entrega. */
async function answerRound(service, listId, { wrong = 0 } = {}) {
  const view = await service.openList(listId);
  const keys = await sql(
    `select i.id, k.answer_key from practice_list_items i
       join question_version_keys k on k.version_id = i.question_version_id where i.list_id = $1`,
    [listId],
  );
  const keyByItem = new Map(keys.map((k) => [k.id, k.answer_key]));
  for (const [index, item] of view.items.entries()) {
    const right = keyByItem.get(item.id);
    const pick = index < wrong ? item.options.find((o) => o.key !== right).key : right;
    await service.answer(listId, item.id, pick);
  }
  return service.submit(listId);
}

async function roundQuestions(listId) {
  return (await sql(
    `select v.question_id from practice_list_items i join question_versions v on v.id = i.question_version_id
      where i.list_id = $1 order by i.position`,
    [listId],
  )).map((r) => r.question_id);
}

let sugerida;
let confirmada;

before(async () => {
  await resetPilotDatabase();
  const reports = await provisionPilotFixtures();
  senhas = new Map([...credentialsFrom(reports.a), ...credentialsFrom(reports.b)]);
  users = {
    professorA: await userId(professorA),
    gestorA: await userId(gestorA),
  };
  await adminDb.from("classrooms").update({ grade_code: "em1" }).in("id", [TURMA, OUTRA.classroom.id]);
  const { loadReferenceCatalog, loadProvisionalCut } = await import(RECORTE);
  await loadReferenceCatalog(adminDb);
  await loadProvisionalCut(adminDb, {
    institutionId: A, academicYearId: PILOT.academicYear.id,
    authorUserId: users.professorA, reviewerUserId: users.gestorA,
  });
  // Sequência do circuito: MAT primeiro, CHS depois (as demais por último).
  ok("ordem", await adminDb.from("school_curriculum_plans").update({ period_order: 3 }).eq("institution_id", A).neq("skill_id", MAT));
  ok("ordem CHS", await adminDb.from("school_curriculum_plans").update({ period_order: 2 }).eq("institution_id", A).eq("skill_id", CHS));

  // Banco de MAT: 2 do recorte + 6 sintéticos = 8 com vínculo oficial.
  const dificuldades = ["facil", "facil", "media", "media", "dificil", "dificil"];
  for (const [i, d] of dificuldades.entries()) await approvedItem(`circ-mat-${i + 1}`, MAT, "comp-mat-matematica", d);
  // Questão oficialmente de CHS com correspondência MAT confirmada (entra)…
  confirmada = await approvedItem("circ-chs-confirmada", CHS, "comp-chs-historia", "media");
  ok("sugestão confirmada", await adminDb.from("question_skill_suggestions").insert({
    id: "sug:confirmada", institution_id: A, question_id: confirmada.q, skill_id: MAT, origin: "equipe",
    confidence: "alta", rationale: "teste", status: "confirmada", reviewed_by: users.gestorA, reviewed_at: new Date().toISOString(),
  }));
  // …e outra só SUGERIDA (nunca entra em rodada automática).
  sugerida = await approvedItem("circ-chs-sugerida", CHS, "comp-chs-historia", "facil");
  ok("sugestão não revisada", await adminDb.from("question_skill_suggestions").insert({
    id: "sug:sugerida", institution_id: A, question_id: sugerida.q, skill_id: MAT, origin: "ia",
    confidence: "alta", rationale: "teste",
  }));
});

after(async () => {
  logout();
  await resetPilotDatabase();
});

test("professor liga o circuito: primeira habilidade liberada para toda a turma (idempotente)", async () => {
  const { circuit } = await as(professorA);
  await circuit.activate(TURMA);
  await circuit.activate(TURMA);
  const panel = await circuit.panel(TURMA);
  assert.equal(panel.circuit.status, "ativo");
  assert.equal(panel.sequence[0].skill.id, MAT);
  assert.equal(panel.sequence[1].skill.id, CHS);
  assert.equal(panel.students.length, PILOT.studentCount);
  assert.ok(panel.students.every((s) => s.unlocked.length === 1 && s.unlocked[0] === MAT));
  assert.ok(panel.students.every((s) => s.position.status === "praticando" && s.position.currentSkillId === MAT));
  assert.deepEqual(panel.pool[MAT], { total: 9, catalog: 0 }, "8 oficiais + 1 confirmada; sugerida fora");
  const [{ n }] = await sql("select count(*)::int as n from adaptive_unlocks where circuit_id = $1", [CIRCUITO]);
  assert.equal(n, PILOT.studentCount);
});

let rodada1;
test("aluno pede rodada: banco escolhe 3 aprovadas da habilidade; repetir devolve a mesma", async () => {
  const { circuit } = await as(aluno("a", 1));
  rodada1 = await circuit.startRound();
  assert.equal(await circuit.startRound(), rodada1, "rodada aberta é devolvida");
  const qs = await roundQuestions(rodada1);
  assert.equal(qs.length, 3);
  assert.ok(!qs.includes(sugerida.q), "sugestão não revisada não entra");
  const [lista] = await sql("select kind, target_student_id, target_skill_id, status from practice_lists where id = $1", [rodada1]);
  assert.deepEqual(lista, { kind: "circuito", target_student_id: studentId("a", 1), target_skill_id: MAT, status: "publicada" });
  const mine = await circuit.mine();
  assert.equal(mine.openRound.id, rodada1);
  assert.equal(mine.mastery[MAT].state, "sem_evidencia");
});

test("rodada é pessoal: colega da turma não alcança; não aparece em Listas", async () => {
  const { service } = await as(aluno("a", 2));
  await assert.rejects(() => service.openList(rodada1));
  const db = await scopedDb();
  const { data } = await db.from("practice_lists").select("id").eq("id", rodada1);
  assert.deepEqual(data, []);
  const { data: itens } = await db.from("practice_list_items").select("id").eq("list_id", rodada1);
  assert.deepEqual(itens, []);
  const dono = await as(aluno("a", 1));
  assert.ok(!(await dono.service.myLists()).some((l) => l.list.id === rodada1));
});

test("reforço contínuo: entregou, recebe nova rodada sem repetir questão; consolidou → aguarda o professor", async () => {
  const { service, circuit } = await as(aluno("a", 1));
  const primeira = await answerRound(service, rodada1);
  assert.equal(primeira.scoreCorrect, 3);
  let mine = await circuit.mine();
  assert.equal(mine.mastery[MAT].state, "consolidando", "3 de 3, mas evidência curta");
  assert.equal(mine.openRound, null);

  const rodada2 = await circuit.startRound();
  assert.notEqual(rodada2, rodada1);
  const vistas = new Set(await roundQuestions(rodada1));
  assert.ok((await roundQuestions(rodada2)).every((q) => !vistas.has(q)), "nunca repete questão");
  await answerRound(service, rodada2);
  mine = await circuit.mine();
  assert.equal(mine.mastery[MAT].state, "consolidado");
  assert.deepEqual(mine.mastery[MAT], { state: "consolidado", correct: 5, total: 5, answered: 6, insufficient: false });
  assert.equal(mine.position.status, "pronto_para_avancar");
  assert.equal(mine.position.nextSkillId, CHS);

  // Híbrido: sem o professor, a próxima rodada continua em MAT.
  const rodada3 = await circuit.startRound();
  const [alvo] = await sql("select target_skill_id from practice_lists where id = $1", [rodada3]);
  assert.equal(alvo.target_skill_id, MAT);
});

test("banco esgotado é avisado em vez de repetir questão", async () => {
  const { service, circuit } = await as(aluno("a", 1));
  const mine = await circuit.mine();
  await answerRound(service, mine.openRound.id, { wrong: 1 });
  await assert.rejects(() => circuit.startRound(), /Sem questões novas/);
  const [{ n }] = await sql(
    "select count(distinct v.question_id)::int as n from practice_lists l join practice_list_items i on i.list_id = l.id join question_versions v on v.id = i.question_version_id where l.target_student_id = $1",
    [studentId("a", 1)],
  );
  assert.equal(n, 9, "usou exatamente as 9 elegíveis, sem repetir");
});

test("avanço é do professor; aluno recebe rodada da habilidade liberada", async () => {
  let { circuit } = await as(professorA);
  let panel = await circuit.panel(TURMA);
  const linha = panel.students.find((s) => s.student.id === studentId("a", 1));
  assert.equal(linha.rounds, 3);
  await circuit.unlock(TURMA, studentId("a", 1), CHS);
  panel = await circuit.panel(TURMA);
  assert.equal(panel.students.find((s) => s.student.id === studentId("a", 1)).position.currentSkillId, CHS);

  ({ circuit } = await as(aluno("a", 1)));
  const rodada = await circuit.startRound();
  const [alvo] = await sql("select target_skill_id from practice_lists where id = $1", [rodada]);
  assert.equal(alvo.target_skill_id, CHS);
  const qs = await roundQuestions(rodada);
  assert.ok(!qs.includes(confirmada.q), "questão já vista em MAT não volta em CHS");
});

test("barreiras do banco: habilidade não liberada, rodada forjada, liberação por aluno ou outra escola", async () => {
  // Aluno 2 tenta pular para CHS direto pela função.
  await as(aluno("a", 2));
  let db = await scopedDb();
  const pulo = await db.rpc("iah_circuit_next_round", { p_circuit: CIRCUITO, p_skill: CHS, p_level: "regular" });
  assert.match(pulo.error?.message ?? "", /não liberada/);
  const liberacao = await db.from("adaptive_unlocks").insert({
    id: "u:forjada", institution_id: A, circuit_id: CIRCUITO, student_id: studentId("a", 2),
    skill_id: CHS, reason: "avanco", unlocked_by: await userId(aluno("a", 2)),
  });
  assert.ok(liberacao.error, "aluno não se libera");

  // Professor não cria rodada "na mão".
  await as(professorA);
  db = await scopedDb();
  const forjada = await db.from("practice_lists").insert({
    id: "circ:forjada", institution_id: A, classroom_id: TURMA, component_id: "comp-mat-matematica",
    kind: "circuito", title: "x", created_by: users.professorA, target_student_id: studentId("a", 2), target_skill_id: MAT,
  });
  assert.ok(forjada.error, "rodada só nasce pela função");
  // Professor não chama a função de aluno.
  const rpc = await db.rpc("iah_circuit_next_round", { p_circuit: CIRCUITO, p_skill: MAT, p_level: "regular" });
  assert.match(rpc.error?.message ?? "", /Apenas alunos/);

  // Professor de outra escola não libera nem enxerga o circuito.
  const outra = await as(professorB);
  await assert.rejects(() => outra.circuit.unlock(TURMA, studentId("a", 2), CHS));
  db = await scopedDb();
  const { data } = await db.from("adaptive_circuits").select("id").eq("id", CIRCUITO);
  assert.deepEqual(data, []);
  const [{ n }] = await sql("select count(*)::int as n from adaptive_unlocks where student_id = $1", [studentId("a", 2)]);
  assert.equal(n, 1, "só a liberação inicial");
});

test("circuito pausado não gera rodada nova", async () => {
  let { circuit } = await as(professorA);
  await circuit.pause(TURMA);
  ({ circuit } = await as(aluno("a", 3)));
  await assert.rejects(() => circuit.startRound(), /pausado/);
  ({ circuit } = await as(professorA));
  await circuit.activate(TURMA);
  ({ circuit } = await as(aluno("a", 3)));
  assert.match(await circuit.startRound(), /^circ:/);
});

test("lista do professor guarda a habilidade-alvo e vira evidência", async () => {
  const { service, circuit } = await as(professorA);
  const lista = await service.createList({
    classroomId: TURMA, componentId: "comp-chs-historia", kind: "diagnostica", title: "Diagnóstica com alvo",
    versionIds: [confirmada.v], publish: true, skillId: MAT,
  });
  const [row] = await sql("select target_skill_id from practice_lists where id = $1", [lista]);
  assert.equal(row.target_skill_id, MAT);
  assert.ok(!(await service.listsForClassrooms([TURMA])).some((l) => l.kind === "circuito"), "rodadas fora das listas do professor");

  const aluno4 = await as(aluno("a", 4));
  await answerRound(aluno4.service, lista);
  const mine = await aluno4.circuit.mine();
  assert.equal(mine.mastery[MAT].answered, 1, "resposta conta para a habilidade-alvo");
  assert.equal(mine.mastery[CHS].answered, 0);
  assert.equal((await circuit.panel(TURMA)).students.find((s) => s.student.id === studentId("a", 4)).mastery[MAT].answered, 1);
});
