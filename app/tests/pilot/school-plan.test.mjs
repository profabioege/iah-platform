/**
 * Planejamento curricular REAL da escola (D-055) contra o banco real:
 * a carga substitui o recorte provisório sem apagar nada, sem duplicar,
 * só na escola indicada, e o diagnóstico passa a ver o planejamento
 * validado (prontidão continua dependendo de questões revisadas).
 */

import "./support/pilot-hooks.mjs";

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

const RECORTE = "../../src/modules/question-bank/seeds/recorte-provisorio.ts";
const IMPORT = "../../src/modules/question-bank/seeds/school-plan-import.ts";
const ENEM = "../../src/modules/question-bank/catalog/enem-import.ts";
const ref = (f) => new URL(`../../db/reference/${f}`, import.meta.url);
const readJson = async (f) => JSON.parse(await readFile(ref(f), "utf8"));

let senhas;
let bncc;

const CSV =
  "serie;periodo;rotulo_periodo;componente;habilidade;observacao\n" +
  "1ª;1;1º bimestre;História;EM13CHS101;\n" +
  "1ª;1;1º bimestre;Matemática;EM13MAT101;\n" +
  "1ª;1;1º bimestre;Geografia;EM13CHS106;Cartografia e dados\n";

async function plan(csv) {
  const { parseSchoolPlanCsv, buildSchoolPlanImport } = await import(IMPORT);
  const { rows } = parseSchoolPlanCsv(csv);
  return buildSchoolPlanImport({
    rows,
    bncc: bncc.habilidades.map((h) => ({ code: h.codigo, area: h.area, componente: h.componente })),
  });
}

async function rowsOf(institutionId) {
  const { data } = await adminDb
    .from("school_curriculum_plans")
    .select("id, skill_id, component_id, status")
    .eq("institution_id", institutionId)
    .order("skill_id");
  return data;
}

async function userId(email) {
  const { data } = await adminDb.from("users").select("id").eq("email", email).single();
  return data.id;
}

before(async () => {
  await resetPilotDatabase();
  const reports = await provisionPilotFixtures();
  senhas = new Map([...credentialsFrom(reports.a), ...credentialsFrom(reports.b)]);
  await adminDb.from("classrooms").update({ grade_code: "em1" }).in("id", [PILOT.classroom.id, OUTRA.classroom.id]);
  bncc = await readJson("bncc-ensino-medio-2018.json");
  const { loadReferenceCatalog, loadProvisionalCut } = await import(RECORTE);
  const { loadCatalogReferences } = await import(ENEM);
  await loadReferenceCatalog(adminDb);
  await loadCatalogReferences(adminDb, {
    bncc,
    matriz: [await readJson("matriz-enem-2009-cn-mt.json"), await readJson("matriz-enem-2009-lc-ch.json")],
  });
  for (const escola of [PILOT, OUTRA]) {
    await loadProvisionalCut(adminDb, {
      institutionId: escola.institution.id,
      academicYearId: escola.academicYear.id,
      authorUserId: await userId(escola.teacher.email),
      reviewerUserId: await userId(escola.managers[0].email),
    });
  }
});

after(async () => {
  logout();
  await resetPilotDatabase();
});

test("carga validada substitui o provisório: atualiza o que coincide, acrescenta, aposenta o resto — nada apagado", async () => {
  const before = await rowsOf(PILOT.institution.id);
  assert.equal(before.length, 4);
  assert.ok(before.every((r) => r.status === "provisional"));

  const { applySchoolPlanImport } = await import(IMPORT);
  const result = await applySchoolPlanImport(adminDb, await plan(CSV), {
    institutionId: PILOT.institution.id,
    academicYearId: PILOT.academicYear.id,
    status: "approved",
    authorUserId: await userId(PILOT.managers[0].email),
    retireProvisional: true,
    sourceLabel: "Planejamento sintético de teste",
  });
  assert.deepEqual(result, { written: 3, retired: 2 });

  const after = await rowsOf(PILOT.institution.id);
  assert.equal(after.length, 5, "4 antigas (2 aprovadas, 2 aposentadas) + 1 nova");
  const status = Object.fromEntries(after.map((r) => [r.skill_id, r.status]));
  assert.deepEqual(status, {
    "bncc-em13chs101": "approved",
    "bncc-em13chs106": "approved",
    "bncc-em13cnt101": "retired",
    "bncc-em13lgg101": "retired",
    "bncc-em13mat101": "approved",
  });
  const chs101 = after.find((r) => r.skill_id === "bncc-em13chs101");
  assert.equal(chs101.id, before.find((r) => r.skill_id === "bncc-em13chs101").id, "linha coincidente mantém o id");

  const outra = await rowsOf(OUTRA.institution.id);
  assert.ok(outra.length === 4 && outra.every((r) => r.status === "provisional"), "outra escola não muda");
});

test("repetir a carga não duplica", async () => {
  const { applySchoolPlanImport } = await import(IMPORT);
  await applySchoolPlanImport(adminDb, await plan(CSV), {
    institutionId: PILOT.institution.id,
    academicYearId: PILOT.academicYear.id,
    status: "approved",
    authorUserId: null,
    retireProvisional: true,
    sourceLabel: "Planejamento sintético de teste",
  });
  assert.equal((await rowsOf(PILOT.institution.id)).length, 5);
});

test("o professor vê o planejamento validado; a prontidão ainda exige questões revisadas", async () => {
  logout();
  await loginAs(PILOT.teacher.email, senhas.get(PILOT.teacher.email));
  const { getStudyContext } = await import("@/modules/study/infrastructure/request-context");
  const ctx = await getStudyContext();
  const { entries } = await ctx.bank.plannedSkillsForClassroom(PILOT.classroom.id);
  assert.deepEqual(entries.map((e) => e.skill.code).sort(), ["EM13CHS101", "EM13CHS106", "EM13MAT101"]);
  assert.ok(entries.every((e) => e.plan.status === "approved"));

  const { buildDiagnosticReadiness } = await import("@/modules/study");
  const { skills } = await ctx.diagnostic.candidates(PILOT.classroom.id);
  const readiness = buildDiagnosticReadiness(
    skills.map((c) => ({
      skillId: c.skill.id,
      skillCode: c.skill.code,
      componentName: c.componentName,
      planProvisional: c.planProvisional,
      eligible: c.eligible,
      synthetic: c.synthetic,
    })),
  );
  assert.equal(readiness.ready, false);
  assert.ok(readiness.skills.every((s) => !s.planProvisional), "planejamento validado");
  const mat = readiness.skills.find((s) => s.skillCode === "EM13MAT101");
  assert.equal(mat.reviewed, 0, "itens sintéticos do recorte não contam como revisados");
  assert.ok(mat.synthetic >= 2);
  assert.ok(readiness.reasons.some((r) => /Faltam questões revisadas/.test(r)));
  assert.ok(!readiness.reasons.some((r) => /provisório/.test(r)));
});

test("o banco recusa planejamento com ano letivo de outra escola", async () => {
  const { applySchoolPlanImport } = await import(IMPORT);
  const valida = await plan(CSV);
  await assert.rejects(
    () =>
      applySchoolPlanImport(adminDb, valida, {
        institutionId: PILOT.institution.id,
        academicYearId: OUTRA.academicYear.id,
        status: "approved",
        authorUserId: null,
        retireProvisional: false,
        sourceLabel: "x",
      }),
    /Ano letivo de outra instituição/,
  );
});

test("planilha com problema não grava nada", async () => {
  const { applySchoolPlanImport } = await import(IMPORT);
  const ruim = await plan("serie;periodo;componente;habilidade\n1ª;1;História;EM13CHS999\n");
  assert.ok(ruim.problems.length > 0);
  await assert.rejects(
    () =>
      applySchoolPlanImport(adminDb, ruim, {
        institutionId: PILOT.institution.id,
        academicYearId: PILOT.academicYear.id,
        status: "approved",
        authorUserId: null,
        retireProvisional: true,
        sourceLabel: "x",
      }),
    /problemas/,
  );
  assert.equal((await rowsOf(PILOT.institution.id)).length, 5);
});
