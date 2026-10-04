/**
 * Acervo autoral IAH + revisão editorial (D-052) — provado contra o banco
 * real (migrations 0001–0020), com LOGIN REAL. Itens 100% SINTÉTICOS no
 * formato dos acervos (nenhuma questão real do acervo no repositório).
 *
 * Prova: carga em revisão (idempotente, devolutivas guardadas, direitos
 * pendentes), fila só do próprio inquilino, aprovação recusada sem
 * direitos, autor ≠ revisor, devolução → nova versão pelo autor com troca
 * de habilidade, confirmação de sugestão, devolutiva por alternativa só
 * depois da entrega, validação das devolutivas pelo banco.
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
  PILOT,
  provisionPilotFixtures,
  resetPilotDatabase,
} from "./support/pilot-fixtures.mjs";

const ENEM = "../../src/modules/question-bank/catalog/enem-import.ts";
const AUTHORED = "../../src/modules/question-bank/catalog/iah-authored-import.ts";
const RECORTE = "../../src/modules/question-bank/seeds/recorte-provisorio.ts";
const CONTEXT = "@/modules/question-bank/infrastructure/request-context";
const REFERENCE = new URL("../../db/reference/", import.meta.url);

const CAT = "iah-catalogo-autoral";
const CATALOGO = {
  institution: { id: CAT, name: "Catálogo IAH (sintético)", slug: "catalogo-iah-autoral", domain: "catalogo-autoral.test" },
  academicYear: { id: "ay-catalogo-autoral", label: "2026", startsOn: "2026-02-01", endsOn: "2026-12-15" },
  classroom: { id: "class-catalogo-autoral", name: "Equipe editorial", grade: "—" },
  teacher: { id: "teacher-catalogo-autoral", name: "Autoria IAH", email: "autoria@catalogo-autoral.test" },
  managers: [{ id: "manager-catalogo-autoral", name: "Gestão IAH", email: "gestao@catalogo-autoral.test" }],
  students: [{ externalId: "iah-catalogo-autoral-aluno-01", name: "Estudante sintético 01" }],
};
const autoria = CATALOGO.teacher.email;
const gestaoIah = CATALOGO.managers[0].email;
const professorA = PILOT.teacher.email;
const alunoA = "aluno.instsinteticoaaluno01@sintetico-a.test";

const devolutivas = (correta, extra = "") =>
  ["A", "B", "C", "D", "E"]
    .map((l) => `**${l} — ${l === correta ? "correta" : "incorreta"}:** Devolutiva sintética ${l}.${l === correta ? extra : ""}`)
    .join("\n\n");

const ACERVO = `# Acervo sintético

## IAH-EM-CN-901 — Item sintético com tabela

**Área:** Ciências da Natureza · **Série sugerida:** 1ª · **Versão:** 1.0.0

Dados sintéticos:

| Condição | Valor |
| --- | --- |
| P | 4 |

Qual opção?

**A)** opção A

**B)** opção B

**C)** opção C

**D)** opção D

**E)** opção E

**Gabarito: B.**

### Devolutivas por alternativa

${devolutivas("B", " Habilidade trabalhada (CN-H17): Texto editorial sintético.")}

**BNCC:** EM13CNT101. Associação editorial por recorte: Recorte sintético.

---

## Questão 02 — Ciências da Natureza

**ID:** IAH-EM-CN-902

Item sintético sem classificação do autor.

**A)** um

**B)** dois

**C)** três

**D)** quatro

**E)** cinco

**Gabarito: D.**

### Devolutivas

${devolutivas("D")}

---

## IAH-EM-LC-903 — Item sintético de Língua Portuguesa

**Área:** Linguagens · **Série sugerida:** 1ª · **Versão:** 1.0.0

Texto sintético para leitura.

**A)** a

**B)** b

**C)** c

**D)** d

**E)** e

**Gabarito: A.**

### Devolutivas por alternativa

${devolutivas("A", " Habilidade trabalhada (LC-H18): Texto editorial sintético.")}

**BNCC:** EM13LP01. Associação editorial por recorte: Recorte sintético.
`;

let senhas;
let users;
let mod;
let auth;
const v1 = (code) => `qv:${CAT}:${code}:1`;
const qid = (code) => `q:${CAT}:${code}`;

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

const CHECK = { gabarito: true, habilidade: true, direitos: true, linguagem: true };

async function runImport() {
  const { items } = auth.parseAuthoredMarkdown(ACERVO, "acervo-sintetico.md");
  const known = new Set((await sql("select id from curriculum_skills")).map((r) => r.id));
  const plan = auth.buildAuthoredImportPlan({
    files: [{ arquivo: "acervo-sintetico.md", items }],
    proposals: [{ codigo: "IAH-EM-CN-902", bncc: "EM13CNT301", confianca_bncc: "media", matriz: "CN-H17", confianca_matriz: "baixa", serie: "2ª", motivo: "proposta sintética" }],
    catalogInstitutionId: CAT,
    authorUserId: users.autoria,
    knownSkillIds: known,
  });
  assert.deepEqual(plan.problems, []);
  return auth.applyAuthoredImport(adminDb, plan);
}

before(async () => {
  await resetPilotDatabase();
  const reports = await provisionPilotFixtures();
  const { provisionPilotClass } = await import("../../src/modules/identity/provisioning/pilot-provisioning.ts");
  const cat = await provisionPilotClass(adminDb, CATALOGO, { dryRun: false, actor: "cli:teste-acervo" });
  senhas = new Map([...credentialsFrom(reports.a), ...credentialsFrom(cat)]);
  users = { autoria: await userId(autoria), gestaoIah: await userId(gestaoIah), professorA: await userId(professorA) };
  await adminDb.from("institutions").update({ kind: "catalogo" }).eq("id", CAT);
  await adminDb.from("classrooms").update({ grade_code: "em1" }).eq("id", PILOT.classroom.id);
  const { loadReferenceCatalog, loadProvisionalCut } = await import(RECORTE);
  await loadReferenceCatalog(adminDb);
  await loadProvisionalCut(adminDb, {
    institutionId: PILOT.institution.id, academicYearId: PILOT.academicYear.id,
    authorUserId: users.professorA, reviewerUserId: await userId(PILOT.managers[0].email),
  });
  mod = await import(ENEM);
  auth = await import(AUTHORED);
  const json = async (f) => JSON.parse(await readFile(new URL(f, REFERENCE), "utf8"));
  const refs = await mod.loadCatalogReferences(adminDb, {
    bncc: await json("bncc-ensino-medio-2018.json"),
    matriz: [await json("matriz-enem-2009-cn-mt.json"), await json("matriz-enem-2009-lc-ch.json")],
  });
  assert.deepEqual(refs, { bncc: 183, matriz: 120 });
});

after(async () => {
  logout();
  await resetPilotDatabase();
});

test("carga: em revisão, devolutivas e tabela guardadas, direitos pendentes; repetir não duplica", async () => {
  assert.deepEqual(await runImport(), { created: 3, alreadyPresent: 0, suggestions: 3 });
  assert.deepEqual(await runImport(), { created: 0, alreadyPresent: 3, suggestions: 0 });
  const rows = await sql(
    `select v.id, v.status, v.content_format, k.answer_key, k.resolution, k.option_feedback, q.skill_id,
            q.external_ref -> 'classificacao' ->> 'origem' as origem
       from question_versions v join question_version_keys k on k.version_id = v.id join questions q on q.id = v.question_id
      where v.institution_id = $1 order by v.id`,
    [CAT],
  );
  assert.equal(rows.length, 3);
  assert.ok(rows.every((r) => r.status === "em_revisao" && r.content_format === "marcacao_v2"));
  assert.deepEqual(rows.map((r) => [r.skill_id, r.origem]), [
    ["bncc-em13cnt101", "autor"], ["bncc-em13cnt301", "ia"], ["bncc-em13lp01", "autor"],
  ]);
  const [lp] = await sql("select component_id from questions where id = $1", [qid("IAH-EM-LC-903")]);
  assert.equal(lp.component_id, "comp-lgg-lingua-portuguesa", "habilidade de LP leva o componente de LP");
  assert.equal(rows[0].resolution, "Devolutiva sintética B.");
  assert.equal(Object.keys(rows[0].option_feedback).length, 5);
  const [src] = await sql("select kind, rights_status from content_sources where institution_id = $1", [CAT]);
  assert.deepEqual(src, { kind: "autoral_iah", rights_status: "pendente" });
});

test("fila: só do próprio inquilino; autor vê como seu, gestão como revisável", async () => {
  let { editorial } = await as(autoria);
  let fila = await editorial.queue("em_revisao");
  assert.deepEqual(fila.rows.map((r) => r.code), ["IAH-EM-CN-901", "IAH-EM-CN-902", "IAH-EM-LC-903"]);
  assert.ok(fila.rows.every((r) => r.mine));
  assert.equal(fila.rows[1].classification, "ia");
  const meu = await editorial.item(v1("IAH-EM-CN-901"));
  assert.equal(meu.canReview, false);
  await assert.rejects(() => editorial.decide(v1("IAH-EM-CN-901"), "aprovada", CHECK, null), /escreveu|revisá-la/);

  ({ editorial } = await as(gestaoIah));
  fila = await editorial.queue("em_revisao");
  assert.ok(fila.rows.every((r) => !r.mine));
  assert.equal((await editorial.item(v1("IAH-EM-CN-901"))).canReview, true);

  ({ editorial } = await as(professorA));
  fila = await editorial.queue("em_revisao");
  assert.ok(!fila.rows.some((r) => r.code?.startsWith("IAH-EM-CN-90")), "escola não vê a fila do catálogo");
  assert.equal(await editorial.item(v1("IAH-EM-CN-901")), null);
  await assert.rejects(() => editorial.decide(v1("IAH-EM-CN-901"), "aprovada", CHECK, null));
});

test("aprovação recusada sem direitos; gestão verifica a fonte e aprova", async () => {
  const { editorial } = await as(gestaoIah);
  await assert.rejects(() => editorial.decide(v1("IAH-EM-CN-901"), "aprovada", CHECK, null), /direitos/);
  const [fonte] = await editorial.sources();
  await editorial.verifySource(fonte.id, null);
  await assert.rejects(() => editorial.decide(v1("IAH-EM-CN-901"), "aprovada", { ...CHECK, habilidade: false }, null), /conferência/);
  await editorial.decide(v1("IAH-EM-CN-901"), "aprovada", CHECK, null);
  const [v] = await sql("select status from question_versions where id = $1", [v1("IAH-EM-CN-901")]);
  assert.equal(v.status, "aprovada");
});

let v2;
test("devolução → autor corrige com nova versão e troca a habilidade; revisor confirma a Matriz e aprova", async () => {
  let { editorial, service } = await as(gestaoIah);
  await assert.rejects(() => editorial.decide(v1("IAH-EM-CN-902"), "devolvida", CHECK, null), /comentário/);
  await editorial.decide(v1("IAH-EM-CN-902"), "devolvida", CHECK, "Habilidade proposta não confere: use EM13CNT101.");

  ({ editorial } = await as(autoria));
  const item = await editorial.item(v1("IAH-EM-CN-902"));
  assert.equal(item.canEdit, true);
  v2 = await editorial.saveNewVersion(v1("IAH-EM-CN-902"), {
    stem: "Item corrigido.\n\n| a | b |\n| --- | --- |\n| 1 | 2 |",
    options: item.version.options,
    answerKey: "D",
    resolution: "Resolução revista.",
    optionFeedback: { ...item.key.optionFeedback, A: "Devolutiva A revista." },
    editorialDifficulty: "media",
    skillId: "bncc-em13cnt101",
    submit: true,
  });
  const [q] = await sql("select skill_id from questions where id = $1", [qid("IAH-EM-CN-902")]);
  assert.equal(q.skill_id, "bncc-em13cnt101");
  const versoes = await sql("select version, status, content_format from question_versions where question_id = $1 order by version", [qid("IAH-EM-CN-902")]);
  assert.deepEqual(versoes, [
    { version: 1, status: "devolvida", content_format: "marcacao_v2" },
    { version: 2, status: "em_revisao", content_format: "marcacao_v2" },
  ]);
  assert.equal((await editorial.item(v1("IAH-EM-CN-902"))).canEdit, false, "só a última versão é editável");

  ({ editorial, service } = await as(gestaoIah));
  const revisar = await editorial.item(v2);
  const sugestao = revisar.suggestions.find((s) => s.skill?.code === "ENEM-CN-H17");
  assert.equal(sugestao.status, "sugerida");
  await service.decideSuggestion(sugestao.id, "confirmada");
  await editorial.decide(v2, "aprovada", CHECK, null);
  assert.equal((await editorial.queue("aprovada")).rows.length, 2);

  // Depois de aprovada, a habilidade não muda mais (0020).
  await as(autoria);
  const db = await scopedDb();
  const { error } = await db.from("questions").update({ skill_id: "bncc-em13cnt301" }).eq("id", qid("IAH-EM-CN-902"));
  assert.match(error?.message ?? "", /já aprovada/);
});

test("devolutiva por alternativa: fechada até a entrega; depois, a da alternativa marcada", async () => {
  let { service } = await as(professorA);
  const banco = await service.approvedForSkill("bncc-em13cnt101");
  const cat = banco.filter((b) => b.origin === "catalogo").map((b) => b.version.id).sort();
  assert.deepEqual(cat, [v1("IAH-EM-CN-901"), v2].sort());
  const lista = await service.createList({
    classroomId: PILOT.classroom.id, componentId: "comp-cnt-fisica", kind: "diagnostica",
    title: "Lista com acervo IAH", versionIds: [v1("IAH-EM-CN-901")], publish: true, skillId: "bncc-em13cnt101",
  });

  ({ service } = await as(alunoA));
  let view = await service.openList(lista);
  assert.equal(view.items[0].contentFormat, "marcacao_v2");
  const db = await scopedDb();
  const { data: antes } = await db.from("question_version_keys").select("option_feedback").eq("version_id", v1("IAH-EM-CN-901"));
  assert.deepEqual(antes, []);
  await service.answer(lista, view.items[0].id, "A");
  await service.submit(lista);
  view = await service.openList(lista);
  assert.equal(view.report.items[0].isCorrect, false);
  assert.equal(view.report.items[0].selectedFeedback, "Devolutiva sintética A.");
  assert.equal(view.report.items[0].resolution, "Devolutiva sintética B.");
});

test("o banco valida as devolutivas: letra inexistente ou texto vazio são recusados", async () => {
  const id = `qv:${CAT}:IAH-EM-CN-901:9`;
  const { error: vErr } = await adminDb.from("question_versions").insert({
    id, institution_id: CAT, question_id: qid("IAH-EM-CN-901"), version: 9, stem: "x",
    options: ["A", "B"].map((key) => ({ key, text: key })), source_id: `src:${CAT}:iah-autoral`,
    authorship: "teste", created_by: users.autoria, content_format: "marcacao_v2",
  });
  assert.equal(vErr, null);
  const inexistente = await adminDb.from("question_version_keys").insert({
    version_id: id, institution_id: CAT, answer_key: "A", resolution: "r", option_feedback: { Z: "?" },
  });
  assert.match(inexistente.error?.message ?? "", /inexistente/);
  const vazia = await adminDb.from("question_version_keys").insert({
    version_id: id, institution_id: CAT, answer_key: "A", resolution: "r", option_feedback: { B: "  " },
  });
  assert.match(vazia.error?.message ?? "", /vazia/);
});
