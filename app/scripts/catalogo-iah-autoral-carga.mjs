#!/usr/bin/env node
/**
 * Carga do ACERVO AUTORAL IAH no Catálogo IAH (D-052).
 *
 *   node --experimental-strip-types scripts/catalogo-iah-autoral-carga.mjs \
 *     --arquivos="<acervo-01.md>;<acervo-02.md>" \
 *     [--classificacao=db/reference/iah-acervo-01-classificacao-proposta.json] \
 *     --catalogo=<id da instituição kind='catalogo'> --autor=<id da conta de autoria IAH> \
 *     [--execute] [--confirm-project=<ref>]
 *
 * Por padrão SIMULA: lê os arquivos, confere formato, gabarito,
 * devolutivas e habilidades, e mostra o que seria criado. `--execute`
 * grava — só no banco local ou no projeto de homologação confirmado duas
 * vezes (`pilot-target-guard.mjs`); produção é recusada sempre.
 *
 * Os itens entram EM REVISÃO, com fonte `autoral_iah` de direitos
 * PENDENTES: só chegam a escola ou aluno depois de aprovados por alguém
 * diferente do autor e com a fonte verificada pela gestão IAH.
 */

import { readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { loadCatalogReferences, bnccSkillId, matrizSkillId } from "../src/modules/question-bank/catalog/enem-import.ts";
import {
  applyAuthoredImport,
  buildAuthoredImportPlan,
  parseAuthoredMarkdown,
} from "../src/modules/question-bank/catalog/iah-authored-import.ts";
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

const arquivos = String(arg("arquivos", "")).split(";").map((a) => a.trim()).filter(Boolean);
const classificacao = arg("classificacao");
const catalogo = arg("catalogo");
const autor = arg("autor");
const execute = arg("execute", false) === true;
if (!arquivos.length || !catalogo || !autor) fail("Informe --arquivos, --catalogo e --autor.");

const reference = resolve(import.meta.dirname, "../db/reference");
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const bncc = await readJson(join(reference, "bncc-ensino-medio-2018.json"));
const matrizes = [
  await readJson(join(reference, "matriz-enem-2009-cn-mt.json")),
  await readJson(join(reference, "matriz-enem-2009-lc-ch.json")),
];
const knownSkillIds = new Set([
  ...bncc.habilidades.map((h) => bnccSkillId(h.codigo)),
  ...matrizes.flatMap((m) => Object.values(m.areas).flatMap((a) => a.habilidades.map((h) => matrizSkillId(a.sigla_enem, h.numero)))),
]);

const files = [];
const problems = [];
for (const path of arquivos) {
  const parsed = parseAuthoredMarkdown(await readFile(path, "utf8"), basename(path));
  files.push({ arquivo: basename(path), items: parsed.items });
  problems.push(...parsed.problems);
}
const proposals = classificacao ? (await readJson(classificacao)).itens : [];
const plan = buildAuthoredImportPlan({ files, proposals, catalogInstitutionId: catalogo, authorUserId: autor, knownSkillIds });
problems.push(...plan.problems);

const byOrigin = (o) => plan.items.filter((i) => i.question.external_ref.classificacao.origem === o).length;
console.log(`Acervo autoral IAH — ${files.map((f) => `${f.arquivo}: ${f.items.length}`).join(" · ")}`);
console.log(`  itens a criar (em revisão): ${plan.items.length}`);
console.log(`  habilidade do autor: ${byOrigin("autor")} · proposta por IA: ${byOrigin("ia")}`);
console.log(`  com tabela: ${plan.items.filter((i) => /\n\|/.test(`\n${i.version.stem}`)).length}`);
console.log(`  sugestões da Matriz: ${plan.items.filter((i) => i.suggestion).length}`);
if (problems.length) {
  console.log("  PROBLEMAS (itens não serão carregados até corrigir):");
  for (const p of problems) console.log(`    · ${p.codigo ?? "?"}: ${p.problema}`);
}
if (!execute) {
  console.log("\nSimulação — nada foi gravado. Use --execute para gravar.");
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) fail("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no ambiente.");
try {
  assertAuthorizedTarget(url, { confirmProject: arg("confirm-project"), operation: "carregar o acervo autoral IAH" });
} catch (error) {
  fail(error.message);
}
const db = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
const refs = await loadCatalogReferences(db, { bncc, matriz: matrizes });
console.log(`✔ Referências: ${refs.bncc} habilidades BNCC, ${refs.matriz} da Matriz.`);
const result = await applyAuthoredImport(db, plan);
console.log(`✔ Catálogo: ${result.created} criados, ${result.alreadyPresent} já existiam, ${result.suggestions} sugestões novas.`);
console.log("  Próximo passo: gestão IAH verifica a fonte; revisão aprova item a item em /professor/revisao.");
