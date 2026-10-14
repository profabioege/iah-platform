/**
 * Diagnóstico por etapas e plano semanal (D-054) contra o banco real —
 * migration 0022 + policies, pelo mesmo caminho das telas
 * (`getStudyContext()` → ator conferido → JWT `iah_app`), com LOGIN REAL.
 *
 * Prova: diagnóstico interrompido e retomado; questão incorreta × não
 * respondida × diagnóstico incompleto; marca "demonstrativo" calculada
 * pelo banco; plano que não passa dos minutos; ausência de duplicatas;
 * histórico só de inserção; permissões entre alunos, professores, turmas
 * e escolas. Dados 100% sintéticos.
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
const CONTEXT = "@/modules/study/infrastructure/request-context";

const professorA = PILOT.teacher.email;
const gestorA = PILOT.managers[0].email;
const professorB = OUTRA.teacher.email;
const gestorB = OUTRA.managers[0].email;
const aluno = (escola, n) =>
  `aluno.instsintetico${escola}aluno${String(n).padStart(2, "0")}@sintetico-${escola}.test`;
const studentId = (escola, n) => `inst-sintetico-${escola}-aluno-${String(n).padStart(2, "0")}`;
const MAT = "bncc-em13mat101";
const CHS = "bncc-em13chs101";

let senhas;
let diagnosticId;
let planA1;

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
  logout();
  const actor = await loginAs(email, senhas.get(email));
  assert.ok(actor, `login de ${email}`);
  const { getStudyContext } = await import(CONTEXT);
  return getStudyContext();
}

async function scopedDb() {
  const { getDatabaseActor } = await import("@/modules/platform/infrastructure/database/request-actor");
  const { getScopedDatabaseClient } = await import("@/modules/platform/infrastructure/database/scoped-client");
  return getScopedDatabaseClient(await getDatabaseActor());
}

async function userId(email) {
  const { data } = await adminDb.from("users").select("id").eq("email", email).single();
  return data.id;
}

/** Gabarito (só para o teste montar respostas certas e erradas). */
async function keysOf(listId) {
  return sql(
    `select i.id, k.answer_key from practice_list_items i
       join question_version_keys k on k.version_id = i.question_version_id
      where i.list_id = $1 order by i.position`,
    [listId],
  );
}
const wrong = (key) => (key === "A" ? "B" : "A");

before(async () => {
  await resetPilotDatabase();
  const reports = await provisionPilotFixtures();
  senhas = new Map([...credentialsFrom(reports.a), ...credentialsFrom(reports.b)]);
  await adminDb.from("classrooms").update({ grade_code: "em1" }).in("id", [PILOT.classroom.id, OUTRA.classroom.id]);
  const { loadReferenceCatalog, loadProvisionalCut, loadDemonstrativeDiagnosticItems } = await import(RECORTE);
  await loadReferenceCatalog(adminDb);
  for (const [escola, prof, gestor] of [
    [PILOT, professorA, gestorA],
    [OUTRA, professorB, gestorB],
  ]) {
    const target = {
      institutionId: escola.institution.id,
      academicYearId: escola.academicYear.id,
      authorUserId: await userId(prof),
      reviewerUserId: await userId(gestor),
    };
    await loadProvisionalCut(adminDb, target);
    assert.equal(await loadDemonstrativeDiagnosticItems(adminDb, target), 8);
  }
});

after(async () => {
  logout();
  await resetPilotDatabase();
});

test("professor monta o diagnóstico com itens aprovados; rascunho não chega ao aluno; banco marca demonstrativo", async () => {
  let ctx = await as(professorA);
  const { skills } = await ctx.diagnostic.candidates(PILOT.classroom.id);
  assert.equal(skills.length, 4);
  assert.ok(skills.every((s) => s.eligible === 4 && s.synthetic === 4 && s.enough && s.planProvisional));

  diagnosticId = await ctx.diagnostic.create({ classroomId: PILOT.classroom.id, title: "Diagnóstico de entrada", skillIds: [MAT, CHS] });
  const [draft] = await sql("select status, demonstrative, curriculum_provisional from diagnostics where id = $1", [diagnosticId]);
  assert.deepEqual(draft, { status: "rascunho", demonstrative: true, curriculum_provisional: true });

  // Cliente não desliga a marca: o trigger recalcula.
  const db = await scopedDb();
  await db.from("diagnostics").update({ demonstrative: false, curriculum_provisional: false }).eq("id", diagnosticId);
  const [ainda] = await sql("select demonstrative, curriculum_provisional from diagnostics where id = $1", [diagnosticId]);
  assert.deepEqual(ainda, { demonstrative: true, curriculum_provisional: true });

  ctx = await as(aluno("a", 1));
  assert.equal(await ctx.diagnostic.mine(), null, "rascunho é invisível ao aluno");

  ctx = await as(professorA);
  await ctx.diagnostic.publish(diagnosticId);
  const etapas = await sql(
    `select b.position, l.status, l.kind, l.target_skill_id, count(i.id)::int as questoes
       from diagnostic_blocks b join practice_lists l on l.id = b.list_id
       join practice_list_items i on i.list_id = l.id
      where b.diagnostic_id = $1 group by b.position, l.status, l.kind, l.target_skill_id order by b.position`,
    [diagnosticId],
  );
  assert.deepEqual(etapas, [
    { position: 1, status: "publicada", kind: "diagnostica", target_skill_id: MAT, questoes: 4 },
    { position: 2, status: "publicada", kind: "diagnostica", target_skill_id: CHS, questoes: 4 },
  ]);
});

test("aluno interrompe a etapa, sai, volta e retoma de onde parou", async () => {
  let ctx = await as(aluno("a", 1));
  let mine = await ctx.diagnostic.mine();
  assert.equal(mine.evidence.status, "nao_iniciado");
  const etapa1 = mine.blocks[0].listId;
  const keys = await keysOf(etapa1);
  await ctx.bank.answer(etapa1, keys[0].id, keys[0].answer_key);
  await ctx.bank.answer(etapa1, keys[1].id, wrong(keys[1].answer_key));

  // "Outro dispositivo": sessão nova, cliente novo.
  ctx = await as(aluno("a", 1));
  mine = await ctx.diagnostic.mine();
  assert.equal(mine.evidence.status, "incompleto");
  assert.equal(mine.evidence.nextBlock.listId, etapa1, "retoma a etapa em andamento");
  assert.equal(mine.evidence.skills[0].savedNotSubmitted, 2);
  const view = await ctx.bank.openList(etapa1);
  assert.equal(Object.keys(view.answers).length, 2, "respostas salvas voltam marcadas");
});

test("entrega com questão em branco: distingue correta, incorreta, não respondida e etapa pendente", async () => {
  let ctx = await as(aluno("a", 1));
  let mine = await ctx.diagnostic.mine();
  const [etapa1, etapa2] = mine.blocks.map((b) => b.listId);
  const keys = await keysOf(etapa1);
  await ctx.bank.answer(etapa1, keys[2].id, keys[2].answer_key);
  // Lista comum exigiria tudo; etapa do diagnóstico aceita em branco.
  await assert.rejects(() => ctx.bank.submit(etapa1), /Faltam 1 questão/);
  assert.equal(await ctx.diagnostic.isDiagnosticList(etapa1), true);
  await ctx.bank.submit(etapa1, { allowUnanswered: true });

  mine = await ctx.diagnostic.mine();
  const s1 = mine.evidence.skills[0];
  assert.deepEqual(
    { correct: s1.correct, incorrect: s1.incorrect, unanswered: s1.unanswered, level: s1.level },
    { correct: 2, incorrect: 1, unanswered: 1, level: "em_desenvolvimento" },
  );
  assert.equal(mine.evidence.skills[1].level, "pendente");
  assert.equal(mine.evidence.status, "incompleto");

  // Registro por resposta: questão, versão, habilidade, resposta e acerto.
  const linhas = await sql(
    `select i.question_version_id, i.skill_id, a.selected_key, a.is_correct
       from attempt_answers a join practice_list_items i on i.id = a.list_item_id
      where a.student_id = $1 and i.list_id = $2`,
    [studentId("a", 1), etapa1],
  );
  assert.equal(linhas.length, 3);
  assert.ok(linhas.every((l) => l.question_version_id && l.skill_id === MAT && l.selected_key && typeof l.is_correct === "boolean"));

  // Etapa 2 entregue sem nenhuma resposta: evidência insuficiente, não "erro".
  ctx = await as(aluno("a", 1));
  await ctx.bank.submit(etapa2, { allowUnanswered: true });
  mine = await ctx.diagnostic.mine();
  assert.equal(mine.evidence.skills[1].level, "evidencia_insuficiente");
  assert.equal(mine.evidence.skills[1].unanswered, 4);
  assert.equal(mine.evidence.skills[1].incorrect, 0);
  assert.equal(mine.evidence.status, "concluido");
});

test("acompanhamento docente: turma toda, por aluno e por habilidade; outra escola não alcança", async () => {
  let ctx = await as(professorA);
  const view = await ctx.diagnostic.classroomView(diagnosticId);
  assert.equal(view.students.length, PILOT.studentCount);
  const a1 = view.students.find((s) => s.student.id === studentId("a", 1));
  assert.equal(a1.evidence.status, "concluido");
  const mat = view.bySkill.find((s) => s.skillId === MAT);
  assert.equal(mat.counts.em_desenvolvimento, 1);
  assert.equal(mat.counts.pendente, PILOT.studentCount - 1);

  ctx = await as(professorB);
  assert.deepEqual(await ctx.diagnostic.forClassroom(PILOT.classroom.id), []);
  await assert.rejects(() => ctx.diagnostic.classroomView(diagnosticId), /fora do seu alcance/);
  ctx = await as(aluno("b", 1));
  assert.equal(await ctx.diagnostic.mine(), null, "aluno de outra escola não vê o diagnóstico");
});

test("plano: respeita a disponibilidade, não duplica e registra o histórico", async () => {
  const { todayIso, mondayOf } = await import("@/modules/study");
  const today = todayIso();
  let ctx = await as(aluno("a", 1));
  const context = await ctx.planContextFor(PILOT.classroom.id);
  assert.ok(context.diagnostic.blocks.length === 2);
  const first = await ctx.plan.generate(PILOT.classroom.id, context, { days: [1, 2, 3, 4, 5, 6, 7], minutesPerDay: 20 }, today);
  planA1 = first.view.plan.id;
  await ctx.plan.generate(PILOT.classroom.id, await ctx.planContextFor(PILOT.classroom.id), { days: [1, 2, 3, 4, 5, 6, 7], minutesPerDay: 20 }, today);

  const planos = await sql("select week_start::text, minutes_per_day from study_plans where student_id = $1", [studentId("a", 1)]);
  assert.equal(planos.length, 1, "um plano por aluno, turma e semana");
  assert.equal(planos[0].week_start, mondayOf(today));
  const excesso = await sql(
    `select day, sum(minutes)::int as total from study_plan_items
      where plan_id = $1 and status in ('planejada','concluida') group by day having sum(minutes) > 20`,
    [planA1],
  );
  assert.deepEqual(excesso, [], "nenhum dia acima dos minutos informados");
  const duplicadas = await sql(
    `select kind, ref_id, count(*)::int from study_plan_items
      where plan_id = $1 and status in ('planejada','adiada') group by kind, ref_id, skill_id having count(*) > 1`,
    [planA1],
  );
  assert.deepEqual(duplicadas, []);
  const eventos = await sql("select action, actor_role from study_plan_events where plan_id = $1", [planA1]);
  assert.ok(eventos.some((e) => e.action === "gerado") && eventos.some((e) => e.action === "regerado"));
  assert.ok(eventos.every((e) => e.actor_role === "aluno"));
});

test("plano: o banco recusa estouro de minutos, dia indisponível, origem falsa e alteração do histórico", async () => {
  await as(aluno("a", 1));
  const db = await scopedDb();
  const [plan] = await sql("select * from study_plans where id = $1", [planA1]);
  const free = await sql(
    `select d::date::text as day from generate_series($1::date, $1::date + 6, '1 day') d
      where coalesce((select sum(minutes) from study_plan_items where plan_id = $2 and day = d::date and status in ('planejada','concluida')), 0) = 0
      limit 1`,
    [plan.week_start, planA1],
  );
  const day = free[0]?.day ?? plan.week_start;
  const base = {
    institution_id: PILOT.institution.id,
    plan_id: planA1,
    student_id: studentId("a", 1),
    classroom_id: PILOT.classroom.id,
    day,
    kind: "orientacao",
    title: "Atividade do teste",
    reason: "Teste do orçamento",
    origin: "aluno",
    created_by: (await sql("select user_id from students where id = $1", [studentId("a", 1)]))[0].user_id,
  };
  const estouro = await db.from("study_plan_items").insert({ ...base, id: "t-estouro", minutes: 21 });
  assert.match(estouro.error?.message ?? "", /Ultrapassa os 20 minutos/);
  const origem = await db.from("study_plan_items").insert({ ...base, id: "t-origem", minutes: 5, origin: "professor" });
  assert.match(origem.error?.message ?? "", /Origem da atividade/);
  const forada = await db.from("study_plan_items").insert({ ...base, id: "t-fora", minutes: 5, day: "2020-01-06" });
  assert.match(forada.error?.message ?? "", /fora da semana/);

  const [evento] = await sql("select id from study_plan_events where plan_id = $1 limit 1", [planA1]);
  const editar = await db.from("study_plan_events").update({ note: "apagar rastro" }).eq("id", evento.id).select("id");
  assert.ok(editar.error || !editar.data?.length, "histórico não é editável");
  const [depois] = await sql("select note from study_plan_events where id = $1", [evento.id]);
  assert.notEqual(depois.note, "apagar rastro");
});

test("plano: colega, professor de outra escola e gestão não alteram; professor da turma ajusta e orienta", async () => {
  const [item] = await sql(
    "select id, day::text from study_plan_items where plan_id = $1 and status = 'planejada' order by day limit 1",
    [planA1],
  );
  for (const email of [aluno("a", 2), professorB, gestorA]) {
    await as(email);
    const db = await scopedDb();
    const r = await db.from("study_plan_items").update({ status: "removida" }).eq("id", item.id).select("id");
    assert.ok(r.error || !r.data?.length, `${email} não altera o plano do aluno 01`);
  }
  const [continua] = await sql("select status from study_plan_items where id = $1", [item.id]);
  assert.equal(continua.status, "planejada");

  let ctx = await as(aluno("a", 2));
  await assert.rejects(() => ctx.plan.byId(planA1), /fora do seu alcance/);
  ctx = await as(gestorA);
  assert.equal((await ctx.plan.byId(planA1)).plan.id, planA1, "gestão da escola acompanha (só leitura)");

  ctx = await as(professorA);
  await ctx.plan.postpone(item.id, "Semana de provas da escola");
  const [plan] = await sql("select week_start::text, minutes_per_day from study_plans where id = $1", [planA1]);
  const vazio = await sql(
    `select d::date::text as day from generate_series($1::date, $1::date + 6, '1 day') d
      where coalesce((select sum(minutes) from study_plan_items where plan_id = $2 and day = d::date and status in ('planejada','concluida')), 0) <= 10
      limit 1`,
    [plan.week_start, planA1],
  );
  const g = await ctx.plan.addGuidance(planA1, { day: vazio[0].day, title: "Reler a resolução da etapa 1", minutes: 10, reason: "Erro em taxa de variação" });
  assert.equal(g.origin, "professor");
  const ev = await sql("select action, actor_role from study_plan_events where plan_id = $1 and actor_role = 'professor'", [planA1]);
  assert.deepEqual(ev.map((e) => e.action).sort(), ["adiado", "adicionado"]);
});

test("aluno não cria plano em nome de outro aluno", async () => {
  await as(aluno("a", 2));
  const db = await scopedDb();
  const { mondayOf, todayIso } = await import("@/modules/study");
  const r = await db.from("study_plans").insert({
    id: "plan:falso",
    institution_id: PILOT.institution.id,
    classroom_id: PILOT.classroom.id,
    student_id: studentId("a", 3),
    week_start: mondayOf(todayIso()),
    available_days: [1],
    minutes_per_day: 30,
    rule_version: "plano-v1",
    created_by: (await sql("select user_id from students where id = $1", [studentId("a", 2)]))[0].user_id,
  });
  assert.ok(r.error, "RLS recusa");
});
