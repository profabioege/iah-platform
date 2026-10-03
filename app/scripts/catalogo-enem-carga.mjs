#!/usr/bin/env node
/**
 * Carga de um caderno do Enem no CATÁLOGO IAH (D-050).
 *
 *   node --experimental-strip-types scripts/catalogo-enem-carga.mjs \
 *     --extracao=<pasta com itens.json e PNGs> \
 *     --microdados=<ITENS_PROVA_AAAA.csv> \
 *     [--sugestoes=db/reference/enem-2024-d2-cd5-bncc-sugerida.json] \
 *     --catalogo=<id da instituição kind='catalogo'> --autor=<id do usuário autor> \
 *     [--execute] [--confirm-project=<ref>]
 *
 * Por padrão SIMULA: confere extração × microdados × sugestões e mostra o
 * que seria criado, sem gravar. `--execute` grava — e só no banco local
 * ou no projeto de homologação confirmado duas vezes
 * (`pilot-target-guard.mjs`). Produção e o projeto do site ficam em
 * IAH_PROTECTED_PROJECT_REFS e são recusados sempre.
 *
 * A carga cria tudo em RASCUNHO, com fonte `licenciado` de direitos
 * PENDENTES: nada chega a escola ou aluno sem resolução escrita pela
 * equipe IAH, revisão aprovada (autor ≠ revisor) e licença verificada
 * pela gestão IAH. Os microdados (ITENS_PROVA) vêm do INEP e são
 * baixados pelo operador.
 */

import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  applyCatalogImport,
  buildCatalogImportPlan,
  loadCatalogReferences,
  parseItensProvaCsv,
} from "../src/modules/question-bank/catalog/enem-import.ts";
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

const extracao = arg("extracao");
const microdados = arg("microdados");
const sugestoes = arg("sugestoes");
const catalogo = arg("catalogo");
const autor = arg("autor");
const execute = arg("execute", false) === true;
if (!extracao || !microdados || !catalogo || !autor) {
  fail("Informe --extracao, --microdados, --catalogo e --autor.");
}

const extraction = JSON.parse(await readFile(join(extracao, "itens.json"), "utf8"));
// Microdados do INEP vêm em ISO-8859-1.
const rows = parseItensProvaCsv((await readFile(microdados)).toString("latin1"));
const suggestionFile = sugestoes ? JSON.parse(await readFile(sugestoes, "utf8")) : null;

const plan = buildCatalogImportPlan({
  extraction,
  microdados: rows,
  suggestions: suggestionFile,
  catalogInstitutionId: catalogo,
  authorUserId: autor,
});

const { ano, dia, caderno } = extraction.meta;
console.log(`Enem ${ano} · ${dia}º dia · caderno ${caderno}`);
console.log(`  itens a criar (rascunho): ${plan.items.length}`);
console.log(`  figuras: ${plan.items.reduce((n, i) => n + i.figures.length, 0)}`);
console.log(`  sugestões BNCC: ${plan.items.filter((i) => i.suggestion).length}`);
console.log(`  ignorados: ${plan.skipped.map((s) => `${s.numero} (${s.motivo})`).join(", ") || "nenhum"}`);
if (plan.problems.length) {
  console.log("  PROBLEMAS (itens não serão carregados até corrigir a extração):");
  for (const p of plan.problems) console.log(`    · ${p.numero}: ${p.problema}`);
}

if (!execute) {
  console.log("\nSimulação — nada foi gravado. Use --execute para gravar.");
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) fail("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no ambiente.");
try {
  assertAuthorizedTarget(url, {
    confirmProject: arg("confirm-project"),
    operation: `carregar o Enem ${ano} no catálogo`,
  });
} catch (error) {
  fail(error.message);
}

const db = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
const reference = resolve(import.meta.dirname, "../db/reference");
const refs = await loadCatalogReferences(db, {
  bncc: JSON.parse(await readFile(join(reference, "bncc-ensino-medio-2018.json"), "utf8")),
  matriz: JSON.parse(await readFile(join(reference, "matriz-enem-2009-cn-mt.json"), "utf8")),
});
console.log(`✔ Referências: ${refs.bncc} habilidades BNCC, ${refs.matriz} da Matriz.`);

const result = await applyCatalogImport(db, plan, async (arquivo) => new Uint8Array(await readFile(join(extracao, arquivo))));
console.log(
  `✔ Catálogo: ${result.created} criados, ${result.alreadyPresent} já existiam, ` +
    `${result.figures} figuras, ${result.suggestions} sugestões novas.`,
);
console.log("  Próximo passo da equipe IAH: resolução → revisão → verificação da licença.");
