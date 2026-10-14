#!/usr/bin/env node
/**
 * Carga do LOTE PILOTO IAH (itens originais aprovados pela coordenação)
 * no Catálogo IAH — D-053, reaproveitando a carga do acervo autoral
 * (D-052).
 *
 *   node --experimental-strip-types scripts/catalogo-iah-lote-piloto-carga.mjs \
 *     --arquivo=<banco_piloto_40_v1.1_aprovado.json> \
 *     --catalogo=<id da instituição kind='catalogo'> [--autor=<id da conta de autoria>] \
 *     [--complementar] [--execute] [--confirm-project=<ref>]
 *
 * `--complementar`: lote complementar da 1ª série (D-055) — aceita só
 * itens `pendente_revisao_docente`, com fonte própria; entram em revisão.
 *
 * Por padrão SIMULA. `--execute` grava — só no banco local ou no projeto
 * de homologação confirmado duas vezes (`pilot-target-guard.mjs`);
 * produção é recusada sempre. Sem `--autor`, usa a conta de autoria do
 * catálogo (perfil professor da instituição do catálogo).
 *
 * Os itens entram EM REVISÃO: a aprovação da coordenação fica registrada
 * no item como contexto, mas a aprovação NO SISTEMA continua exigindo
 * revisor diferente do autor e fonte verificada pela gestão (0017/0018).
 */

import { readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { bnccSkillId, loadCatalogReferences, matrizSkillId } from "../src/modules/question-bank/catalog/enem-import.ts";
import { applyAuthoredImport } from "../src/modules/question-bank/catalog/iah-authored-import.ts";
import { buildLotePilotoPlan } from "../src/modules/question-bank/catalog/iah-lote-piloto-import.ts";
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
const catalogo = arg("catalogo");
const execute = arg("execute", false) === true;
const kind = arg("complementar", false) === true ? "complementar" : "piloto";
if (!arquivo || !catalogo) fail("Informe --arquivo e --catalogo.");

const reference = resolve(import.meta.dirname, "../db/reference");
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const bncc = await readJson(join(reference, "bncc-ensino-medio-2018.json"));
const matrizes = [
  await readJson(join(reference, "matriz-enem-2009-cn-mt.json")),
  await readJson(join(reference, "matriz-enem-2009-lc-ch.json")),
];
const knownSkillIds = new Set([
  ...bncc.habilidades.map((h) => bnccSkillId(h.codigo)),
  ...matrizes.flatMap((m) =>
    Object.values(m.areas).flatMap((a) => a.habilidades.map((h) => matrizSkillId(a.sigla_enem, h.numero))),
  ),
]);

const json = await readJson(resolve(arquivo));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

let autor = arg("autor");
let db = null;
if (execute) {
  if (!url || !serviceRole) fail("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no ambiente.");
  try {
    assertAuthorizedTarget(url, { confirmProject: arg("confirm-project"), operation: "carregar o lote piloto IAH" });
  } catch (error) {
    fail(error.message);
  }
  db = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  if (!autor) {
    const { data, error } = await db
      .from("profiles")
      .select("user_id")
      .eq("institution_id", catalogo)
      .eq("role", "professor")
      .limit(1)
      .maybeSingle();
    if (error || !data) fail(`Conta de autoria do catálogo ${catalogo} não encontrada.`);
    autor = data.user_id;
  }
}

const plan = buildLotePilotoPlan({
  json,
  arquivo: basename(arquivo),
  catalogInstitutionId: catalogo,
  authorUserId: autor ?? "autoria-a-definir",
  knownSkillIds,
  kind,
});
const porArea = {};
for (const item of plan.items) porArea[item.codigo.slice(4, 6)] = (porArea[item.codigo.slice(4, 6)] ?? 0) + 1;
console.log(`${kind === "piloto" ? "Lote piloto" : "Lote complementar (pendente de revisão docente)"} IAH — ${basename(arquivo)}`);
console.log(`  itens a criar (em revisão): ${plan.items.length} · por área: ${JSON.stringify(porArea)}`);
if (plan.problems.length) {
  console.log("  PROBLEMAS (itens não serão carregados até corrigir):");
  for (const p of plan.problems) console.log(`    · ${p.codigo ?? "?"}: ${p.problema}`);
}
if (!execute) {
  console.log("\nSimulação — nada foi gravado. Use --execute para gravar.");
  process.exit(0);
}

const refs = await loadCatalogReferences(db, { bncc, matriz: matrizes });
console.log(`✔ Referências: ${refs.bncc} habilidades BNCC, ${refs.matriz} da Matriz.`);
const result = await applyAuthoredImport(db, plan);
console.log(`✔ Catálogo: ${result.created} criados, ${result.alreadyPresent} já existiam.`);
console.log("  Próximo passo: gestão IAH verifica a fonte; revisão aprova item a item.");
