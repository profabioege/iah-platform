/**
 * Catálogo IAH (D-050) — provado contra o banco real (PostgreSQL +
 * PostgREST efêmeros, migrations 0001–0018), com LOGIN REAL.
 *
 * Um inquilino sintético `kind = 'catalogo'` recebe uma carga no formato
 * do Enem com itens 100% SINTÉTICOS (nenhum enunciado do Enem no
 * repositório) e passa pelo fluxo editorial real. Prova:
 *  - carga idempotente, tudo em rascunho, sem resolução, fonte pendente;
 *  - nada do catálogo é visível às escolas antes de aprovado;
 *  - aprovação exige resolução e licença verificada;
 *  - depois de aprovado, toda escola lê; nenhuma escola escreve;
 *  - lista da escola com item do catálogo: figura, gabarito só após a
 *    entrega, devolutiva; BNCC sugerida rotulada e confirmável só pelo
 *    catálogo.
 */

import "./support/pilot-hooks.mjs";

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

const IMPORT = "../../src/modules/question-bank/catalog/enem-import.ts";
const RECORTE = "../../src/modules/question-bank/seeds/recorte-provisorio.ts";
const CONTEXT = "@/modules/question-bank/infrastructure/request-context";
const REFERENCE = new URL("../../db/reference/", import.meta.url);

const CATALOGO = {
  institution: { id: "iah-catalogo-sintetico", name: "Catálogo IAH (sintético)", slug: "catalogo-iah-sintetico", domain: "catalogo-iah.test" },
  academicYear: { id: "ay-catalogo-2026", label: "2026", startsOn: "2026-02-01", endsOn: "2026-12-15" },
  classroom: { id: "class-catalogo-equipe", name: "Equipe editorial", grade: "—" },
  teacher: { id: "teacher-catalogo-autor", name: "Autoria IAH (sintética)", email: "autoria@catalogo-iah.test" },
  managers: [{ id: "manager-catalogo-gestao", name: "Gestão IAH (sintética)", email: "gestao@catalogo-iah.test" }],
  students: [{ externalId: "iah-catalogo-sintetico-aluno-01", name: "Estudante sintético 01" }],
};

const professorA = PILOT.teacher.email;
const gestorA = PILOT.managers[0].email;
const professorB = OUTRA.teacher.email;
const autoria = CATALOGO.teacher.email;
const gestaoIah = CATALOGO.managers[0].email;
const aluno = (escola, n) =>
  `aluno.instsintetico${escola}aluno${String(n).padStart(2, "0")}@sintetico-${escola}.test`;

// PNG 1×1 válido.
const PNG = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
));

const opts = (n) => ["A", "B", "C", "D", "E"].map((key) => ({ key, text: `opção sintética ${n}${key}` }));
const EXTRACTION = {
  meta: { ano: 2099, dia: 2, caderno: 5, arquivo_prova: "sintetico.pdf", arquivo_gabarito: "sintetico-gb.pdf" },
  itens: [
    { numero: 91, area: "CN", gabarito: "B", anulada: false, paginas: [1], alertas: [],
      enunciado: "Item sintético de CN com H<sub>2</sub>O.\n\n{{figura:1}}\n\n<small>Fonte sintética.</small>\n\nQual opção?",
      alternativas: opts(91), figuras: [{ n: 1, arquivo: "q091-fig1.png", pagina: 1 }] },
    { numero: 92, area: "CN", gabarito: null, anulada: true, paginas: [1], alertas: [],
      enunciado: "Item sintético anulado.", alternativas: opts(92), figuras: [] },
    { numero: 136, area: "MT", gabarito: "E", anulada: false, paginas: [2], alertas: [],
      enunciado: "Item sintético de MT: x<sup>2</sup> = 4.", alternativas: opts(136), figuras: [] },
  ],
};
const CSV = [
  "CO_POSICAO;SG_AREA;CO_ITEM;TX_GABARITO;CO_HABILIDADE;NU_PARAM_A;NU_PARAM_B;NU_PARAM_C;TX_COR;CO_PROVA",
  "91;CN;880091;B;5;1,4;0,9;0,2;AZUL;9001",
  "92;CN;880092;X;7;;;;AZUL;9001",
  "136;MT;880136;E;20;1,1;-0,4;0,2;AZUL;9001",
].join("\n");
const SUGESTOES = {
  origem: "sugestao_ia",
  aviso: "sintético",
  sugestoes: [{ numero: 91, bncc: "EM13CNT101", confianca: "media", motivo: "correspondência sintética de teste" }],
};

const CNT = "bncc-em13cnt101";
let senhas;
let users;
let mod;
let catVersion91;
let catVersion136;
let catQuestion91;

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

async function runImport() {
  const plan = mod.buildCatalogImportPlan({
    extraction: EXTRACTION,
    microdados: mod.parseItensProvaCsv(CSV),
    suggestions: SUGESTOES,
    catalogInstitutionId: CATALOGO.institution.id,
    authorUserId: users.autoria,
  });
  return mod.applyCatalogImport(adminDb, plan, async (arquivo) => {
    assert.equal(arquivo, "q091-fig1.png");
    return PNG;
  });
}

before(async () => {
  await resetPilotDatabase();
  const reports = await provisionPilotFixtures();
  const { provisionPilotClass } = await import("../../src/modules/identity/provisioning/pilot-provisioning.ts");
  const cat = await provisionPilotClass(adminDb, CATALOGO, { dryRun: false, actor: "cli:teste-do-catalogo" });
  senhas = new Map([...credentialsFrom(reports.a), ...credentialsFrom(reports.b), ...credentialsFrom(cat)]);
  users = {
    autoria: await userId(autoria),
    gestaoIah: await userId(gestaoIah),
    professorA: await userId(professorA),
    gestorA: await userId(gestorA),
  };
  await adminDb.from("classrooms").update({ grade_code: "em1" }).eq("id", PILOT.classroom.id);

  const { loadReferenceCatalog, loadProvisionalCut } = await import(RECORTE);
  await loadReferenceCatalog(adminDb);
  await loadProvisionalCut(adminDb, {
    institutionId: PILOT.institution.id,
    academicYearId: PILOT.academicYear.id,
    authorUserId: users.professorA,
    reviewerUserId: users.gestorA,
  });

  mod = await import(IMPORT);
  const refs = await mod.loadCatalogReferences(adminDb, {
    bncc: JSON.parse(await readFile(new URL("bncc-ensino-medio-2018.json", REFERENCE), "utf8")),
    matriz: JSON.parse(await readFile(new URL("matriz-enem-2009-cn-mt.json", REFERENCE), "utf8")),
  });
  assert.deepEqual(refs, { bncc: 183, matriz: 60 });
  catVersion91 = mod.versionIdFor(CATALOGO.institution.id, "880091");
  catVersion136 = mod.versionIdFor(CATALOGO.institution.id, "880136");
  catQuestion91 = mod.questionIdFor(CATALOGO.institution.id, "880091");
});

after(async () => {
  logout();
  await resetPilotDatabase();
});

test("carga só entra em inquilino kind='catalogo'", async () => {
  await assert.rejects(runImport, /não é o Catálogo IAH/);
  const { error } = await adminDb.from("institutions").update({ kind: "catalogo" }).eq("id", CATALOGO.institution.id);
  assert.equal(error, null);
});

test("carga: rascunho sem resolução, fonte pendente, anulada fora — e repetir não duplica", async () => {
  const first = await runImport();
  assert.deepEqual(first, { created: 2, alreadyPresent: 0, figures: 1, suggestions: 1 });
  const second = await runImport();
  assert.deepEqual(second, { created: 0, alreadyPresent: 2, figures: 0, suggestions: 0 });

  const [counts] = await sql(
    `select (select count(*) from questions where institution_id = $1)::int as questoes,
            (select count(*) from question_versions where institution_id = $1 and status = 'rascunho')::int as rascunhos,
            (select count(*) from question_version_keys where institution_id = $1 and resolution is null)::int as sem_resolucao,
            (select count(*) from question_assets where institution_id = $1)::int as figuras,
            (select count(*) from question_skill_suggestions where institution_id = $1 and status = 'sugerida')::int as sugestoes,
            (select rights_status from content_sources where institution_id = $1) as direitos,
            (select count(*) from question_versions where institution_id = $1 and editorial_difficulty is not null)::int as com_dificuldade`,
    [CATALOGO.institution.id],
  );
  assert.deepEqual(counts, {
    questoes: 2, rascunhos: 2, sem_resolucao: 2, figuras: 1, sugestoes: 1, direitos: "pendente", com_dificuldade: 0,
  });
  const [ref] = await sql("select skill_id, external_ref from questions where id = $1", [catQuestion91]);
  assert.equal(ref.skill_id, "enem-cn-h5", "habilidade oficial = Matriz do Enem");
  assert.equal(ref.external_ref.tri.b, 0.9);
});

test("antes de aprovado, nenhuma escola vê o item do catálogo (nem a figura)", async () => {
  const { service } = await as(professorA);
  const banco = await service.approvedForSkill(CNT);
  assert.ok(banco.every((b) => b.origin === "escola"));
  assert.equal(await service.figure(catVersion91, 1), null);
  const db = await scopedDb();
  const { data } = await db.from("question_versions").select("id").eq("id", catVersion91);
  assert.deepEqual(data, []);
});

test("aprovação exige resolução e licença verificada; autor ≠ revisor", async () => {
  let { service } = await as(autoria);
  await service.submitForReview(catVersion136);
  ({ service } = await as(gestaoIah));
  const checklist = { gabarito: true, habilidade: true, direitos: true, linguagem: true };
  await assert.rejects(() => service.reviewVersion(catVersion136, "aprovada", checklist, null), /resolução|direitos/);
  await service.verifySourceRights(mod.sourceIdFor(CATALOGO.institution.id, 2099), "Termo sintético de teste (evidência fictícia).");
  await assert.rejects(() => service.reviewVersion(catVersion136, "aprovada", checklist, null), /resolução/);
  await service.reviewVersion(catVersion136, "devolvida", checklist, "Falta a resolução comentada.");

  ({ service } = await as(autoria));
  await service.writeResolution(catVersion91, "Resolução sintética: a opção B decorre do enunciado de teste.");
  await service.submitForReview(catVersion91);
  await assert.rejects(() => service.reviewVersion(catVersion91, "aprovada", checklist, null), /escreveu|revisá-la/);
  await assert.rejects(() => service.writeResolution(catVersion91, "trocar depois do envio"), /rascunho/);

  ({ service } = await as(gestaoIah));
  await service.reviewVersion(catVersion91, "aprovada", checklist, null);
  const [v] = await sql("select status from question_versions where id = $1", [catVersion91]);
  assert.equal(v.status, "aprovada");
});

test("aprovado: toda escola lê, com rótulos; nenhuma escola escreve no catálogo", async () => {
  for (const email of [professorA, professorB]) {
    const { service } = await as(email);
    const banco = await service.approvedForSkill(CNT);
    const cat = banco.find((b) => b.version.id === catVersion91);
    assert.ok(cat, `${email} vê o item aprovado do catálogo`);
    assert.equal(cat.origin, "catalogo");
    assert.equal(cat.officialSkill.code, "ENEM-CN-H5");
    assert.deepEqual(cat.link, { kind: "sugerida", confidence: "media", rationale: "correspondência sintética de teste", suggestedBy: "ia" });
    assert.equal(cat.version.contentFormat, "marcacao_v1");
    assert.equal(cat.key.answerKey, "B");
    assert.deepEqual([...(await service.figure(catVersion91, 1))], [...PNG]);
    assert.ok(!banco.some((b) => b.version.id === catVersion136), "devolvida não aparece");
    // Pela habilidade oficial (Matriz), o mesmo item aparece como oficial.
    const porMatriz = await service.approvedForSkill("enem-cn-h5");
    assert.deepEqual(porMatriz.map((b) => [b.version.id, b.link.kind]), [[catVersion91, "oficial"]]);
  }

  const { service } = await as(professorA);
  const db = await scopedDb();
  const cat = CATALOGO.institution.id;
  const { error: insertError } = await db.from("questions").insert({
    id: "q:invasao", institution_id: cat, component_id: "comp-cnt-area", skill_id: "enem-cn-h5", created_by: users.professorA,
  });
  assert.ok(insertError, "escola não cria questão no catálogo");
  const { data: updated } = await db.from("question_versions").update({ stem: "adulterado" }).eq("id", catVersion91).select("id");
  assert.deepEqual(updated ?? [], [], "escola não altera versão do catálogo");
  const { error: sugError } = await db.from("question_skill_suggestions").insert({
    id: "sug:invasao", institution_id: cat, question_id: catQuestion91, skill_id: "bncc-em13cnt102",
    origin: "equipe", confidence: "alta", rationale: "x",
  });
  assert.ok(sugError, "escola não sugere habilidade em questão do catálogo");
  const [suggestion] = await sql("select id from question_skill_suggestions where question_id = $1", [catQuestion91]);
  await assert.rejects(() => service.decideSuggestion(suggestion.id, "confirmada"), /alcance/);
  const { error: assetError } = await db.from("question_assets").insert({
    id: "qa:invasao", institution_id: cat, version_id: catVersion91, n: 9, content: "\\x00", sha256: "x",
  });
  assert.ok(assetError, "escola não grava figura no catálogo");
});

test("lista da escola com item do catálogo: figura ao aluno, gabarito só após a entrega", async () => {
  let { service } = await as(professorA);
  const listId = await service.createList({
    classroomId: PILOT.classroom.id,
    componentId: "comp-cnt-fisica",
    kind: "diagnostica",
    title: "Diagnóstica com item do catálogo",
    versionIds: [catVersion91],
    publish: true,
  });
  const lista = (await service.listsForClassrooms([PILOT.classroom.id])).find((l) => l.id === listId);
  assert.equal(lista.curriculumProvisional, true, "sugestão não revisada não tira o provisório");

  ({ service } = await as(aluno("a", 2)));
  let view = await service.openList(listId);
  assert.equal(view.items.length, 1);
  assert.equal(view.items[0].versionId, catVersion91);
  assert.equal(view.items[0].contentFormat, "marcacao_v1");
  assert.match(view.items[0].stem, /\{\{figura:1\}\}/);
  assert.deepEqual([...(await service.figure(catVersion91, 1))], [...PNG], "aluno da lista vê a figura");
  const db = await scopedDb();
  const { data: keysBefore } = await db.from("question_version_keys").select("answer_key").eq("version_id", catVersion91);
  assert.deepEqual(keysBefore, [], "gabarito do catálogo fechado antes da entrega");
  await service.answer(listId, view.items[0].id, "B");
  await service.submit(listId);
  view = await service.openList(listId);
  assert.equal(view.report.correct, 1);
  assert.equal(view.report.items[0].answerKey, "B");
  assert.match(view.report.items[0].resolution, /Resolução sintética/);
  assert.equal(view.report.bySkill[0].skillCode, "ENEM-CN-H5");

  // Aluno de outra escola não alcança a figura (não está em lista dele).
  ({ service } = await as(aluno("b", 1)));
  assert.equal(await service.figure(catVersion91, 1), null);

  ({ service } = await as(professorA));
  const resultado = await service.listResults(listId);
  const linha = resultado.students.find((s) => s.attempt?.status === "entregue");
  assert.deepEqual(linha.report.items.map((i) => [i.selectedKey, i.isCorrect]), [["B", true]]);
});

test("sugestão BNCC: só o catálogo confirma; confirmada muda o rótulo para as escolas", async () => {
  const [suggestion] = await sql("select id from question_skill_suggestions where question_id = $1", [catQuestion91]);
  let { service } = await as(gestaoIah);
  await service.decideSuggestion(suggestion.id, "confirmada");
  const [row] = await sql("select status, reviewed_by from question_skill_suggestions where id = $1", [suggestion.id]);
  assert.deepEqual(row, { status: "confirmada", reviewed_by: users.gestaoIah });

  ({ service } = await as(professorA));
  const cat = (await service.approvedForSkill(CNT)).find((b) => b.version.id === catVersion91);
  assert.equal(cat.link.kind, "confirmada");
});
