#!/usr/bin/env node
/**
 * Carga do PLANEJAMENTO CURRICULAR da escola (D-055) — substitui o
 * recorte provisório pelo planejamento informado pela escola.
 *
 *   node --experimental-strip-types scripts/planejamento-escolar-carga.mjs \
 *     --arquivo=<planilha.csv> --escola=<id da instituição> --ano-letivo=<id do ano letivo> \
 *     [--validado-pela-escola] [--substituir-provisorio] [--autor=<id do usuário>] \
 *     [--execute] [--confirm-project=<ref>]
 *
 * Modelo da planilha: db/reference/modelo-planejamento-escolar.csv
 * (serie;periodo;rotulo_periodo;componente;habilidade;observacao).
 *
 * Por padrão SIMULA: confere série, período, componente e o código de
 * cada habilidade na BNCC de referência (mesma área do componente) e
 * mostra o resumo. Nada é gravado com qualquer problema na planilha.
 *
 *  --validado-pela-escola   grava como `approved` (a escola validou);
 *                           sem ele, grava como `provisional`.
 *  --substituir-provisorio  aposenta (status `retired`, nada apagado) as
 *                           linhas provisórias das mesmas séries que não
 *                           estão na planilha.
 *  --execute                grava — só no banco local ou na homologação
 *                           confirmada duas vezes (`pilot-target-guard`);
 *                           produção é recusada.
 */

import { readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { loadCatalogReferences } from "../src/modules/question-bank/catalog/enem-import.ts";
import { loadReferenceCatalog } from "../src/modules/question-bank/seeds/recorte-provisorio.ts";
import {
  applySchoolPlanImport,
  buildSchoolPlanImport,
  parseSchoolPlanCsv,
} from "../src/modules/question-bank/seeds/school-plan-import.ts";
import { assertAuthorizedTarget } from "./pilot-target-guard.mjs";

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  return process.argv.includes(`--${name}`) ? true : fallback;
}
function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

const arquivo = arg("arquivo");
const escola = arg("escola");
const anoLetivo = arg("ano-letivo");
const validado = arg("validado-pela-escola", false) === true;
const substituir = arg("substituir-provisorio", false) === true;
const execute = arg("execute", false) === true;
if (!arquivo || !escola || !anoLetivo) fail("Informe --arquivo, --escola e --ano-letivo.");

const reference = resolve(import.meta.dirname, "../db/reference");
const readJson = async (p) => JSON.parse(await readFile(p, "utf8"));
const bncc = await readJson(join(reference, "bncc-ensino-medio-2018.json"));
const parsed = parseSchoolPlanCsv(await readFile(resolve(arquivo), "utf8"));
const plan = buildSchoolPlanImport({
  rows: parsed.rows,
  bncc: bncc.habilidades.map((h) => ({ code: h.codigo, area: h.area, componente: h.componente })),
});
plan.problems.unshift(...parsed.problems);

const LABEL = { em1: "1ª série", em2: "2ª série", em3: "3ª série" };
console.log(`Planejamento escolar — ${basename(arquivo)} → escola ${escola}, ano letivo ${anoLetivo}`);
console.log(`  status ao gravar: ${validado ? "approved (validado pela escola)" : "provisional"}`);
for (const s of plan.summary) {
  console.log(`  ${LABEL[s.gradeCode]}: ${s.skills} habilidade(s), ${s.periods} período(s) · ${s.components.join(", ")}`);
}
if (plan.problems.length) {
  console.log("  PROBLEMAS (nada será gravado até corrigir):");
  for (const p of plan.problems) console.log(`    · linha ${p.line ?? "?"}: ${p.problem}`);
  process.exit(execute ? 1 : 0);
}
if (!execute) {
  console.log("\nSimulação — nada foi gravado. Use --execute para gravar.");
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) fail("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no ambiente.");
try {
  assertAuthorizedTarget(url, { confirmProject: arg("confirm-project"), operation: "carregar o planejamento da escola" });
} catch (error) {
  fail(error.message);
}
const db = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
await loadReferenceCatalog(db);
await loadCatalogReferences(db, {
  bncc,
  matriz: [await readJson(join(reference, "matriz-enem-2009-cn-mt.json")), await readJson(join(reference, "matriz-enem-2009-lc-ch.json"))],
});
const result = await applySchoolPlanImport(db, plan, {
  institutionId: escola,
  academicYearId: anoLetivo,
  status: validado ? "approved" : "provisional",
  authorUserId: arg("autor"),
  retireProvisional: substituir,
  sourceLabel: `Planejamento da escola (${basename(arquivo)}, carga de ${new Date().toISOString().slice(0, 10)})`,
});
console.log(`✔ ${result.written} linha(s) gravada(s); ${result.retired} provisória(s) aposentada(s).`);
