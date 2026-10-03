/**
 * Banco de questões (reformulação, incremento 1) — provado contra o
 * banco real (PostgreSQL + PostgREST efêmeros, migrations 0001–0017).
 *
 * Cada caso entra com LOGIN REAL e usa o mesmo caminho das telas:
 * `getQuestionBankContext()` → ator conferido no banco → JWT `iah_app`
 * → policies e triggers decidem. Dados 100% sintéticos (duas escolas
 * fictícias); nenhum aluno real, nenhum segredo.
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
const gestorB = OUTRA.managers[0].email;
const aluno = (escola, n) =>
  `aluno.instsintetico${escola}aluno${String(n).padStart(2, "0")}@sintetico-${escola}.test`;
const studentId = (escola, n) => `inst-sintetico-${escola}-aluno-${String(n).padStart(2, "0")}`;

const TURMA_SEM_VINCULO = "class-sintetico-a-sem-vinculo";

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

/** Cliente PostgREST do ator atual (para provar o que o BANCO recusa). */
async function scopedDb() {
  const { getDatabaseActor } = await import(
    "@/modules/platform/infrastructure/database/request-actor"
  );
  const { getScopedDatabaseClient } = await import(
    "@/modules/platform/infrastructure/database/scoped-client"
  );
  return getScopedDatabaseClient(await getDatabaseActor());
}

async function userId(email) {
  const { data, error } = await adminDb.from("users").select("id").eq("email", email).single();
  assert.equal(error, null);
  return data.id;
}

const MAT = "bncc-em13mat101";
const CHS = "bncc-em13chs101";
const vA = (code) => `qv:${PILOT.institution.id}:${code}:1`;
const vB = (code) => `qv:${OUTRA.institution.id}:${code}:1`;

before(async () => {
  await resetPilotDatabase();
  const reports = await provisionPilotFixtures();
  senhas = new Map([...credentialsFrom(reports.a), ...credentialsFrom(reports.b)]);
  users = {
    professorA: await userId(professorA),
    gestorA: await userId(gestorA),
    professorB: await userId(professorB),
    gestorB: await userId(gestorB),
  };

  await adminDb.from("classrooms").update({ grade_code: "em1" }).in("id", [
    PILOT.classroom.id,
    OUTRA.classroom.id,
  ]);
  await adminDb.from("classrooms").upsert(
    {
      id: TURMA_SEM_VINCULO,
      institution_id: PILOT.institution.id,
      academic_year_id: PILOT.academicYear.id,
      name: "1ª série Z",
      grade: "1ª série E.M.",
      grade_code: "em1",
    },
    { onConflict: "id" },
  );

  const { loadReferenceCatalog, loadProvisionalCut } = await import(RECORTE);
  await loadReferenceCatalog(adminDb);
  const a = await loadProvisionalCut(adminDb, {
    institutionId: PILOT.institution.id,
    academicYearId: PILOT.academicYear.id,
    authorUserId: users.professorA,
    reviewerUserId: users.gestorA,
  });
  const b = await loadProvisionalCut(adminDb, {
    institutionId: OUTRA.institution.id,
    academicYearId: OUTRA.academicYear.id,
    authorUserId: users.professorB,
    reviewerUserId: users.gestorB,
  });
  assert.deepEqual(a, { planEntries: 4, approvedVersions: 8 });
  assert.deepEqual(b, { planEntries: 4, approvedVersions: 8 });
});

after(async () => {
  logout();
  await resetPilotDatabase();
});

// ---------------------------------------------------------------------
// 1. Fluxo completo
// ---------------------------------------------------------------------
let listaMat;

test("fluxo: professor escolhe habilidade e questão revisada → aluno responde → professor vê resposta e devolutiva", async () => {
  // Professor: habilidades do recorte (provisório) para a turma.
  let { service } = await as(professorA);
  const plano = await service.plannedSkillsForClassroom(PILOT.classroom.id);
  assert.equal(plano.gradeKnown, true);
  assert.equal(plano.entries.length, 4, "uma habilidade por área no recorte");
  assert.deepEqual(
    [...new Set(plano.entries.map((e) => e.skill.areaId))].sort(),
    ["chs", "cnt", "lgg", "mat"],
  );
  assert.ok(plano.entries.every((e) => e.plan.status === "provisional"));

  const banco = await service.approvedForSkill(MAT);
  assert.deepEqual(banco.map((b) => b.version.id).sort(), [vA("mat101-01"), vA("mat101-02")]);
  assert.ok(banco.every((b) => b.version.status === "aprovada" && b.source?.rightsStatus === "verificado"));

  listaMat = await service.createList({
    classroomId: PILOT.classroom.id,
    componentId: "comp-mat-matematica",
    kind: "diagnostica",
    title: "Diagnóstica — taxa de variação",
    versionIds: [vA("mat101-01"), vA("mat101-02")],
    publish: true,
  });
  const criada = (await service.listsForClassrooms([PILOT.classroom.id])).find((l) => l.id === listaMat);
  assert.equal(criada.status, "publicada");
  assert.equal(criada.curriculumProvisional, true, "recorte provisório marca a lista");

  // Aluno: vê a lista, responde (1 certa, 1 errada) e entrega.
  ({ service } = await as(aluno("a", 1)));
  const minhas = await service.myLists();
  assert.deepEqual(minhas.map((m) => m.list.id), [listaMat]);
  let view = await service.openList(listaMat);
  assert.equal(view.items.length, 2);
  assert.equal(view.report, null, "sem devolutiva antes da entrega");
  await service.answer(listaMat, view.items[0].id, "B"); // correta
  await service.answer(listaMat, view.items[1].id, "D"); // errada (correta: C)
  const entregue = await service.submit(listaMat);
  assert.equal(entregue.status, "entregue");
  assert.equal(entregue.scoreCorrect, 1);
  assert.equal(entregue.scoreTotal, 2);

  view = await service.openList(listaMat);
  assert.equal(view.report.correct, 1);
  assert.deepEqual(view.report.items.map((i) => i.answerKey), ["B", "C"], "gabarito liberado após a entrega");
  assert.ok(view.report.items.every((i) => i.resolution.length > 20));
  assert.equal(view.feedback, null);

  // Professor: consulta resposta e registra devolutiva.
  ({ service } = await as(professorA));
  let resultado = await service.listResults(listaMat);
  assert.equal(resultado.students.length, PILOT.studentCount);
  const linha = resultado.students.find((s) => s.student.id === studentId("a", 1));
  assert.equal(linha.attempt.status, "entregue");
  assert.deepEqual(linha.report.items.map((i) => [i.selectedKey, i.isCorrect]), [["B", true], ["D", false]]);
  assert.deepEqual(linha.report.bySkill, [{ skillId: MAT, skillCode: "EM13MAT101", correct: 1, total: 2 }]);
  assert.equal(resultado.students.filter((s) => s.attempt).length, 1);

  await service.saveFeedback(listaMat, studentId("a", 1), "Reveja a diferença entre custo médio e custo por km adicional.");
  resultado = await service.listResults(listaMat);
  assert.match(
    resultado.students.find((s) => s.student.id === studentId("a", 1)).feedback.comment,
    /custo por km adicional/,
  );

  // Aluno lê a devolutiva.
  ({ service } = await as(aluno("a", 1)));
  view = await service.openList(listaMat);
  assert.match(view.feedback.comment, /custo por km adicional/);

  // Gestão lê resultados, mas não escreve devolutiva.
  ({ service } = await as(gestorA));
  assert.equal((await service.listResults(listaMat)).students.length, PILOT.studentCount);
  await assert.rejects(() => service.saveFeedback(listaMat, studentId("a", 1), "x"), /professor/);
});

// ---------------------------------------------------------------------
// 2. Gravação e releitura
// ---------------------------------------------------------------------
test("gravação e releitura: respostas, correção e devolutiva persistem no banco", async () => {
  logout();
  const { service } = await as(aluno("a", 1));
  const view = await service.openList(listaMat);
  assert.equal(view.attempt.status, "entregue");
  assert.deepEqual(Object.values(view.answers).sort(), ["B", "D"]);

  const linhas = await sql(
    `select a.selected_key, a.is_correct, t.score_correct, t.score_total, f.comment is not null as tem_devolutiva
       from attempt_answers a join list_attempts t on t.id = a.attempt_id
       left join attempt_feedback f on f.attempt_id = t.id
      where t.list_id = $1 and t.student_id = $2 order by a.selected_key`,
    [listaMat, studentId("a", 1)],
  );
  assert.deepEqual(linhas, [
    { selected_key: "B", is_correct: true, score_correct: 1, score_total: 2, tem_devolutiva: true },
    { selected_key: "D", is_correct: false, score_correct: 1, score_total: 2, tem_devolutiva: true },
  ]);
});

// ---------------------------------------------------------------------
// 3. Ausência de duplicatas
// ---------------------------------------------------------------------
test("sem duplicatas: respostas repetidas/concorrentes, entrega repetida e item repetido", async () => {
  const { service } = await as(aluno("a", 2));
  const { items } = await service.openList(listaMat);

  // Cinco cliques simultâneos na mesma alternativa + troca de resposta.
  await Promise.all(Array.from({ length: 5 }, () => service.answer(listaMat, items[0].id, "A")));
  await service.answer(listaMat, items[0].id, "B");
  await service.answer(listaMat, items[1].id, "C");
  const [contagem] = await sql(
    `select count(distinct t.id)::int as tentativas, count(a.id)::int as respostas,
            max(a.selected_key) filter (where a.list_item_id = $3) as primeira
       from list_attempts t left join attempt_answers a on a.attempt_id = t.id
      where t.list_id = $1 and t.student_id = $2`,
    [listaMat, studentId("a", 2), items[0].id],
  );
  assert.deepEqual(contagem, { tentativas: 1, respostas: 2, primeira: "B" });

  const primeira = await service.submit(listaMat);
  const segunda = await service.submit(listaMat);
  assert.deepEqual(segunda, primeira, "entregar de novo não muda nada");
  assert.equal(primeira.scoreCorrect, 2);
  await assert.rejects(() => service.answer(listaMat, items[0].id, "A"), /já entregou/);

  // No banco, a unicidade não depende do código: inserir 2ª tentativa falha.
  const db = await scopedDb();
  const { error } = await db.from("list_attempts").insert({
    id: "tentativa-duplicada",
    institution_id: PILOT.institution.id,
    classroom_id: PILOT.classroom.id,
    list_id: listaMat,
    student_id: studentId("a", 2),
  });
  assert.ok(error, "segunda tentativa recusada");

  // Item repetido na mesma lista: o serviço deduplica e o banco recusa.
  const prof = (await as(professorA)).service;
  const lista = await prof.createList({
    classroomId: PILOT.classroom.id,
    componentId: "comp-mat-matematica",
    kind: "revisao",
    title: "Revisão com item repetido",
    versionIds: [vA("mat101-01"), vA("mat101-01")],
    publish: false,
  });
  const [{ n }] = await sql("select count(*)::int as n from practice_list_items where list_id = $1", [lista]);
  assert.equal(n, 1);
  const { error: dup } = await (await scopedDb()).from("practice_list_items").insert({
    id: "item-repetido",
    institution_id: PILOT.institution.id,
    list_id: lista,
    position: 2,
    question_version_id: vA("mat101-01"),
  });
  assert.ok(dup, "mesma versão duas vezes na lista recusada pelo banco");
});

// ---------------------------------------------------------------------
// 4. Só questões revisadas são publicadas
// ---------------------------------------------------------------------
test("publicação só de questões revisadas: rascunho, autorrevisão, fonte pendente e versão imutável", async () => {
  let { service } = await as(professorA);
  const fonte = await service.registerSource({
    kind: "autoral_escola",
    title: "Banco autoral da área de Humanas",
    rightsHolder: "Colégio Sintético A",
    license: "Produção docente cedida à escola",
  });
  const { questionId, versionId } = await service.createQuestionDraft({
    componentId: "comp-chs-historia",
    skillId: CHS,
    sourceId: fonte,
    stem: "Qual procedimento ajuda a avaliar duas narrativas opostas sobre um mesmo evento?",
    options: [
      { key: "A", text: "Escolher a mais curta." },
      { key: "B", text: "Comparar autoria, interesses e outras fontes." },
    ],
    answerKey: "B",
    resolution: "Narrativas precisam ser contextualizadas e confrontadas.",
    editorialDifficulty: "facil",
    authorship: "Professor(a) Sintético(a) A",
  });

  // Rascunho não entra em lista (serviço e banco).
  await assert.rejects(
    () => service.createList({
      classroomId: PILOT.classroom.id,
      componentId: "comp-chs-historia",
      kind: "diagnostica",
      title: "Com rascunho",
      versionIds: [versionId],
      publish: true,
    }),
    /aprovada/,
  );
  const listaRascunho = await service.createList({
    classroomId: PILOT.classroom.id,
    componentId: "comp-chs-historia",
    kind: "diagnostica",
    title: "Humanas",
    versionIds: [vA("chs101-01")],
    publish: false,
  });
  const { error: itemRascunho } = await (await scopedDb()).from("practice_list_items").insert({
    id: "item-rascunho",
    institution_id: PILOT.institution.id,
    list_id: listaRascunho,
    position: 2,
    question_version_id: versionId,
  });
  assert.match(itemRascunho?.message ?? "", /aprovadas/);

  // O autor não aprova o próprio item, nem pula a revisão.
  const db = await scopedDb();
  const { error: pulo } = await db.from("question_versions").update({ status: "aprovada" }).eq("id", versionId);
  assert.ok(pulo, "autor não marca a própria versão como aprovada");
  await service.submitForReview(versionId);
  const tudoOk = { gabarito: true, habilidade: true, direitos: true, linguagem: true };
  await assert.rejects(() => service.reviewVersion(versionId, "aprovada", tudoOk, null), /escreveu/);

  // Gestão: checklist incompleto e fonte pendente impedem aprovação.
  ({ service } = await as(gestorA));
  await assert.rejects(
    () => service.reviewVersion(versionId, "aprovada", { ...tudoOk, direitos: false }, null),
    /todos os itens/,
  );
  await assert.rejects(() => service.reviewVersion(versionId, "aprovada", tudoOk, null), /direitos verificados/);
  await assert.rejects(() => service.reviewVersion(versionId, "devolvida", tudoOk, " "), /comentário/);

  // Professor não verifica direitos; gestão verifica e aprova.
  const prof = (await as(professorA)).service;
  await assert.rejects(() => prof.verifySourceRights(fonte), /gestão/);
  ({ service } = await as(gestorA));
  await service.verifySourceRights(fonte, "Termo de cessão arquivado na secretaria (sintético).");
  await service.reviewVersion(versionId, "aprovada", tudoOk, "Ok.");

  // Versão aprovada é imutável; corrigir = nova versão, que volta ao início.
  ({ service } = await as(professorA));
  // A policy só deixa o autor editar rascunho: a tentativa não alcança linha nenhuma.
  await (await scopedDb()).from("question_versions").update({ stem: "alterado" }).eq("id", versionId);
  const [{ stem, status: st }] = await sql("select stem, status from question_versions where id = $1", [versionId]);
  assert.notEqual(stem, "alterado", "versão aprovada não muda");
  assert.equal(st, "aprovada");
  // Nem a service_role altera conteúdo de versão já enviada (trigger).
  const { error: edicaoAdmin } = await adminDb.from("question_versions").update({ stem: "alterado" }).eq("id", versionId);
  assert.match(edicaoAdmin?.message ?? "", /nova versão/);
  const v2 = await service.createNextVersion(questionId, {
    sourceId: fonte,
    stem: "Versão 2 do enunciado.",
    options: [{ key: "A", text: "x" }, { key: "B", text: "y" }],
    answerKey: "A",
    resolution: "Resolução da versão 2.",
    editorialDifficulty: "media",
    authorship: "Professor(a) Sintético(a) A",
  });
  const [{ version, status }] = await sql("select version, status from question_versions where id = $1", [v2]);
  assert.deepEqual({ version, status }, { version: 2, status: "rascunho" });

  // A versão aprovada (1) já pode ir para lista.
  const ok = await service.createList({
    classroomId: PILOT.classroom.id,
    componentId: "comp-chs-historia",
    kind: "diagnostica",
    title: "Humanas — com item da escola",
    versionIds: [versionId, vA("chs101-02")],
    publish: true,
  });
  assert.ok(ok);

  // Lista vazia ou com item que deixou de estar aprovado não publica.
  const vazia = await sql(
    `insert into practice_lists (id, institution_id, classroom_id, component_id, title, created_by)
     values ('lista-vazia', $1, $2, 'comp-mat-matematica', 'vazia', $3) returning id`,
    [PILOT.institution.id, PILOT.classroom.id, users.professorA],
  );
  assert.equal(vazia.length, 1);
  await assert.rejects(() => service.publishList("lista-vazia"), /sem itens/);
});

// ---------------------------------------------------------------------
// 5. Gabarito e acerto não vazam antes da entrega
// ---------------------------------------------------------------------
test("gabarito, resolução e acerto só aparecem para o aluno depois da entrega", async () => {
  const { service } = await as(aluno("a", 3));
  const { items } = await service.openList(listaMat);
  await service.answer(listaMat, items[0].id, "B");

  const db = await scopedDb();
  const { data: chaves } = await db.from("question_version_keys").select("version_id");
  assert.deepEqual(chaves, [], "antes da entrega o aluno não lê gabarito");
  const { data: respostas } = await db.from("attempt_answers").select("is_correct");
  assert.deepEqual(respostas, [{ is_correct: null }], "acerto não é calculado antes da entrega");

  // Tentar informar o próprio acerto não adianta.
  await db.from("attempt_answers").update({ is_correct: true }).eq("list_item_id", items[0].id);
  const [{ is_correct }] = await sql(
    "select is_correct from attempt_answers where student_id = $1 and list_item_id = $2",
    [studentId("a", 3), items[0].id],
  );
  assert.equal(is_correct, null);

  await service.answer(listaMat, items[1].id, "A");
  await service.submit(listaMat);
  const { data: depois } = await (await scopedDb()).from("question_version_keys").select("version_id");
  assert.equal(depois.length, 2, "depois da entrega, só os gabaritos desta lista");
});

// ---------------------------------------------------------------------
// 6. Isolamento entre escolas
// ---------------------------------------------------------------------
test("isolamento: materiais, listas e respostas de uma escola não alcançam a outra", async () => {
  let { service } = await as(professorB);
  const bancoB = await service.approvedForSkill(MAT);
  assert.deepEqual(bancoB.map((b) => b.version.id).sort(), [vB("mat101-01"), vB("mat101-02")]);
  assert.equal(await (await service.listsForClassrooms([PILOT.classroom.id])).length, 0);
  await assert.rejects(() => service.listResults(listaMat), /não encontrada/);
  await assert.rejects(
    () => service.createList({
      classroomId: PILOT.classroom.id,
      componentId: "comp-mat-matematica",
      kind: "diagnostica",
      title: "Invasão",
      versionIds: [vB("mat101-01")],
      publish: false,
    }),
    /fora do seu alcance/,
  );
  // Lista na própria turma com versão da escola A: recusada.
  await assert.rejects(
    () => service.createList({
      classroomId: OUTRA.classroom.id,
      componentId: "comp-mat-matematica",
      kind: "diagnostica",
      title: "Com item alheio",
      versionIds: [vA("mat101-01")],
      publish: false,
    }),
    /aprovada/,
  );
  // Mesmas tentativas direto no banco, sem passar pelo serviço:
  const db = await scopedDb();
  const { error: listaAlheia } = await db.from("practice_lists").insert({
    id: "lista-na-turma-alheia",
    institution_id: OUTRA.institution.id,
    classroom_id: PILOT.classroom.id,
    component_id: "comp-mat-matematica",
    title: "Invasão",
    created_by: users.professorB,
  });
  assert.ok(listaAlheia, "professor B não cria lista na turma da escola A");
  const listaPropria = await service.createList({
    classroomId: OUTRA.classroom.id,
    componentId: "comp-mat-matematica",
    kind: "diagnostica",
    title: "Própria",
    versionIds: [vB("mat101-01")],
    publish: false,
  });
  for (const institution_id of [OUTRA.institution.id, PILOT.institution.id]) {
    const { error: itemAlheio } = await db.from("practice_list_items").insert({
      id: `item-alheio-${institution_id}`,
      institution_id,
      list_id: listaPropria,
      position: 2,
      question_version_id: vA("mat101-01"),
    });
    assert.ok(itemAlheio, `versão da escola A recusada na lista da B (institution_id=${institution_id})`);
  }
  for (const tabela of ["questions", "question_versions", "question_version_keys", "content_sources", "practice_lists", "list_attempts", "attempt_answers", "attempt_feedback", "school_curriculum_plans"]) {
    const { data } = await db.from(tabela).select("institution_id");
    assert.ok(
      (data ?? []).every((r) => r.institution_id === OUTRA.institution.id),
      `${tabela}: só linhas da escola B`,
    );
  }

  ({ service } = await as(gestorB));
  await assert.rejects(() => service.listResults(listaMat), /não encontrada/);

  ({ service } = await as(aluno("b", 1)));
  assert.deepEqual(await service.myLists(), []);
  await assert.rejects(() => service.openList(listaMat), /não encontrada/);
  await assert.rejects(() => service.answer(listaMat, "qualquer-item", "A"), /não está aberta/);
  const { error: tentativaAlheia } = await (await scopedDb()).from("list_attempts").insert({
    id: "tentativa-alheia",
    institution_id: PILOT.institution.id,
    classroom_id: PILOT.classroom.id,
    list_id: listaMat,
    student_id: studentId("b", 1),
  });
  assert.ok(tentativaAlheia, "aluno da B não abre tentativa em lista da A");

  // Nem a service_role cruza escolas: fonte da A em questão da B.
  const { error } = await adminDb.from("question_versions").insert({
    id: "versao-cruzada",
    institution_id: OUTRA.institution.id,
    question_id: `q:${OUTRA.institution.id}:mat101-01`,
    version: 9,
    stem: "x",
    options: [{ key: "A", text: "x" }, { key: "B", text: "y" }],
    source_id: `src:${PILOT.institution.id}:sinteticos-recorte-provisorio`,
    authorship: "x",
    created_by: users.professorB,
  });
  assert.match(error?.message ?? "", /outra instituição/);
});

// ---------------------------------------------------------------------
// 7. Permissões entre perfis da mesma escola
// ---------------------------------------------------------------------
test("perfis: aluno não lê banco nem colegas; professor sem vínculo não monta lista; gestão não monta lista", async () => {
  let { service } = await as(aluno("a", 4));
  const db = await scopedDb();
  for (const tabela of ["questions", "content_sources", "question_reviews"]) {
    const { data } = await db.from(tabela).select("id");
    assert.deepEqual(data ?? [], [], `aluno não lê ${tabela}`);
  }
  const { data: tentativas } = await db.from("list_attempts").select("student_id");
  assert.ok((tentativas ?? []).every((t) => t.student_id === studentId("a", 4)), "aluno não vê tentativa de colega");
  await assert.rejects(() => service.approvedForSkill(MAT), /equipe/);
  await assert.rejects(() => service.listResults(listaMat), /equipe/);
  await db.from("practice_lists").update({ status: "encerrada" }).eq("id", listaMat);
  const [{ status }] = await sql("select status from practice_lists where id = $1", [listaMat]);
  assert.equal(status, "publicada", "aluno não encerra lista");

  ({ service } = await as(professorA));
  await assert.rejects(
    () => service.createList({
      classroomId: TURMA_SEM_VINCULO,
      componentId: "comp-mat-matematica",
      kind: "diagnostica",
      title: "Turma alheia",
      versionIds: [vA("mat101-01")],
      publish: false,
    }),
    /fora do seu alcance/,
  );
  const { error: semVinculo } = await (await scopedDb()).from("practice_lists").insert({
    id: "lista-sem-vinculo",
    institution_id: PILOT.institution.id,
    classroom_id: TURMA_SEM_VINCULO,
    component_id: "comp-mat-matematica",
    title: "Turma alheia",
    created_by: users.professorA,
  });
  assert.ok(semVinculo, "banco recusa lista em turma sem vínculo");

  ({ service } = await as(gestorA));
  await assert.rejects(
    () => service.createList({
      classroomId: PILOT.classroom.id,
      componentId: "comp-mat-matematica",
      kind: "diagnostica",
      title: "Gestão",
      versionIds: [vA("mat101-01")],
      publish: false,
    }),
    /professor/,
  );
});
