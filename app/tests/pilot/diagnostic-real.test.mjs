/**
 * Primeiro diagnóstico NÃO demonstrativo (D-055) contra o banco real.
 *
 * Com o planejamento provisório e só itens sintéticos, o banco marca o
 * diagnóstico como demonstrativo e provisório. Depois que a escola carrega
 * o planejamento validado e há 3 questões revisadas de fonte não
 * sintética na habilidade, o diagnóstico novo nasce sem as duas marcas —
 * e as questões demonstrativas ficam de fora da etapa. Sem mudar código.
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

const RECORTE = "../../src/modules/question-bank/seeds/recorte-provisorio.ts";
const IMPORT = "../../src/modules/question-bank/seeds/school-plan-import.ts";
const MAT = "bncc-em13mat101";
const INST = PILOT.institution.id;
let senhas;
let autor;
let gestor;

async function sql(text, params = []) {
  const client = new pg.Client({ connectionString: process.env.PILOT_TEST_DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(text, params)).rows;
  } finally {
    await client.end();
  }
}
const ok = ({ error }, step) => assert.equal(error, null, `${step}: ${error?.message}`);
async function userId(email) {
  const { data } = await adminDb.from("users").select("id").eq("email", email).single();
  return data.id;
}

async function professorCtx() {
  logout();
  await loginAs(PILOT.teacher.email, senhas.get(PILOT.teacher.email));
  const { getStudyContext } = await import("@/modules/study/infrastructure/request-context");
  return getStudyContext();
}

async function readiness(ctx) {
  const { buildDiagnosticReadiness } = await import("@/modules/study");
  const { skills } = await ctx.diagnostic.candidates(PILOT.classroom.id);
  return buildDiagnosticReadiness(
    skills.map((c) => ({
      skillId: c.skill.id, skillCode: c.skill.code, componentName: c.componentName,
      planProvisional: c.planProvisional, eligible: c.eligible, synthetic: c.synthetic,
    })),
  );
}

async function flagsOf(diagnosticId) {
  const [d] = await sql("select demonstrative, curriculum_provisional from diagnostics where id = $1", [diagnosticId]);
  const [{ sinteticas }] = await sql(
    `select count(*)::int as sinteticas from diagnostic_blocks b
       join practice_list_items i on i.list_id = b.list_id
       join question_versions v on v.id = i.question_version_id
       join content_sources s on s.id = v.source_id
      where b.diagnostic_id = $1 and s.synthetic`,
    [diagnosticId],
  );
  return { ...d, sinteticas };
}

before(async () => {
  await resetPilotDatabase();
  senhas = credentialsFrom((await provisionPilotFixtures()).a);
  await adminDb.from("classrooms").update({ grade_code: "em1" }).eq("id", PILOT.classroom.id);
  autor = await userId(PILOT.teacher.email);
  gestor = await userId(PILOT.managers[0].email);
  const { loadReferenceCatalog, loadProvisionalCut, loadDemonstrativeDiagnosticItems } = await import(RECORTE);
  await loadReferenceCatalog(adminDb);
  const { loadCatalogReferences } = await import("../../src/modules/question-bank/catalog/enem-import.ts");
  const ref = async (f) => JSON.parse(await readFile(new URL(`../../db/reference/${f}`, import.meta.url), "utf8"));
  await loadCatalogReferences(adminDb, {
    bncc: await ref("bncc-ensino-medio-2018.json"),
    matriz: [await ref("matriz-enem-2009-cn-mt.json"), await ref("matriz-enem-2009-lc-ch.json")],
  });
  const target = { institutionId: INST, academicYearId: PILOT.academicYear.id, authorUserId: autor, reviewerUserId: gestor };
  await loadProvisionalCut(adminDb, target);
  await loadDemonstrativeDiagnosticItems(adminDb, target);
});

after(async () => {
  logout();
  await resetPilotDatabase();
});

test("planejamento provisório + só itens sintéticos: diagnóstico demonstrativo e provisório", async () => {
  const ctx = await professorCtx();
  const r = await readiness(ctx);
  assert.equal(r.ready, false);
  const id = await ctx.diagnostic.create({ classroomId: PILOT.classroom.id, title: "Antes", skillIds: [MAT] });
  const f = await flagsOf(id);
  assert.equal(f.demonstrative, true);
  assert.equal(f.curriculum_provisional, true);
  assert.ok(f.sinteticas > 0);
});

test("revisão docente no sistema (autor ≠ revisor, fonte verificada) de 4 questões não sintéticas", async () => {
  const src = `src:${INST}:revisados-teste`;
  ok(await adminDb.from("content_sources").insert({
    id: src, institution_id: INST, created_by: autor, kind: "autoral_iah",
    title: "Itens revisados (teste)", rights_holder: "IAH Educacional", license: "teste", evidence: "teste",
  }), "fonte");
  ok(await adminDb.from("content_sources").update({
    rights_status: "verificado", rights_verified_by: gestor, rights_verified_at: new Date().toISOString(),
  }).eq("id", src), "verificação da fonte");
  // A 4ª questão tem outra habilidade oficial e correspondência com
  // EM13MAT101 CONFIRMADA por revisão humana (caso dos itens do Enem).
  for (const n of [1, 2, 3, 4]) {
    const q = `q:${INST}:revisado-${n}`;
    const v = `qv:${INST}:revisado-${n}:1`;
    ok(await adminDb.from("questions").insert({
      id: q, institution_id: INST, component_id: "comp-mat-matematica",
      skill_id: n === 4 ? "bncc-em13mat302" : MAT, created_by: autor,
    }), "questão");
    if (n === 4) {
      ok(await adminDb.from("question_skill_suggestions").insert({
        id: `sug:${q}:${MAT}`, institution_id: INST, question_id: q, skill_id: MAT, origin: "equipe", confidence: "alta",
        rationale: "Correspondência conferida pela revisão (teste).", status: "confirmada",
        reviewed_by: gestor, reviewed_at: new Date().toISOString(),
      }), "sugestão confirmada");
    }
    ok(await adminDb.from("question_versions").insert({
      id: v, institution_id: INST, question_id: q, version: 1,
      stem: `Questão revisada ${n}: quanto é ${n} + ${n}?`,
      options: ["A", "B", "C", "D", "E"].map((key, k) => ({ key, text: String(2 * n + k) })),
      source_id: src, authorship: "teste", created_by: autor,
    }), "versão");
    ok(await adminDb.from("question_version_keys").insert({ version_id: v, institution_id: INST, answer_key: "A", resolution: `${n} + ${n} = ${2 * n}.` }), "gabarito");
    ok(await adminDb.from("question_versions").update({ status: "em_revisao" }).eq("id", v), "envio");
    ok(await adminDb.from("question_reviews").insert({
      id: `rev:${v}`, institution_id: INST, version_id: v, reviewer_id: gestor, decision: "aprovada",
      checklist: { gabarito: true, habilidade: true, direitos: true, linguagem: true }, comment: "Revisão docente (teste).",
    }), "revisão");
  }
  const ctx = await professorCtx();
  const mat = (await readiness(ctx)).skills.find((s) => s.skillId === MAT);
  assert.equal(mat.reviewed, 4);
  assert.equal(mat.ready, false, "planejamento ainda provisório");
});

test("planejamento validado + 4 revisadas (uma por correspondência confirmada): pronto; diagnóstico nasce sem marcas e sem questões sintéticas", async () => {
  const bncc = JSON.parse(await readFile(new URL("../../db/reference/bncc-ensino-medio-2018.json", import.meta.url), "utf8"));
  const { parseSchoolPlanCsv, buildSchoolPlanImport, applySchoolPlanImport } = await import(IMPORT);
  const plan = buildSchoolPlanImport({
    rows: parseSchoolPlanCsv("serie;periodo;componente;habilidade\n1ª;1;Matemática;EM13MAT101\n").rows,
    bncc: bncc.habilidades.map((h) => ({ code: h.codigo, area: h.area, componente: h.componente })),
  });
  await applySchoolPlanImport(adminDb, plan, {
    institutionId: INST, academicYearId: PILOT.academicYear.id, status: "approved",
    authorUserId: gestor, retireProvisional: true, sourceLabel: "teste",
  });
  const ctx = await professorCtx();
  const r = await readiness(ctx);
  assert.deepEqual(r.skills.map((s) => s.skillId), [MAT]);
  assert.equal(r.ready, true);
  const id = await ctx.diagnostic.create({ classroomId: PILOT.classroom.id, title: "Depois", skillIds: [MAT] });
  const f = await flagsOf(id);
  assert.deepEqual(f, { demonstrative: false, curriculum_provisional: false, sinteticas: 0 });
  const [{ n }] = await sql(
    "select count(*)::int as n from diagnostic_blocks b join practice_list_items i on i.list_id = b.list_id where b.diagnostic_id = $1",
    [id],
  );
  assert.equal(n, 4, "a etapa usa só as revisadas, inclusive a de correspondência confirmada (0023)");
});
