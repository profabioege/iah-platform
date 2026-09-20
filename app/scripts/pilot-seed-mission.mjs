#!/usr/bin/env node
/**
 * Publica uma MISSÃO SINTÉTICA no catálogo do ambiente de homologação.
 *
 *   node scripts/pilot-seed-mission.mjs --id=missao-sintetica-01 --number=1 \
 *     --title="Missão sintética 01" --execute --confirm-project=<ref>
 *
 * O catálogo de missões não vem das migrations: é conteúdo. Para a
 * homologação, o conteúdo precisa ser sintético e identificável como
 * tal — daí este script, separado do provisionamento de contas.
 *
 * Mesma trava de destino dos demais scripts do piloto (ver
 * `pilot-target-guard.mjs`): banco local por padrão; destino remoto só
 * com o identificador do projeto de homologação confirmado duas vezes.
 */

import { createClient } from "@supabase/supabase-js";

import { assertAuthorizedTarget } from "./pilot-target-guard.mjs";

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  return process.argv.includes(`--${name}`) ? true : fallback;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) {
  console.error(
    "✖ NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no ambiente.",
  );
  process.exit(1);
}

const mission = {
  id: String(arg("id", "missao-sintetica-01")),
  number: Number(arg("number", "1")),
  title: String(arg("title", "Missão sintética 01")),
  module: String(arg("module", "Módulo sintético de homologação")),
  status: "published",
  version: 1,
};

const execute = arg("execute", false) === true;

try {
  assertAuthorizedTarget(url, {
    confirmProject: arg("confirm-project"),
    operation: `publicar a missão ${mission.id}`,
  });
} catch (error) {
  console.error(`✖ ${error.message}`);
  process.exit(1);
}

if (!execute) {
  console.log("Simulação (use --execute para gravar):");
  console.log(JSON.stringify(mission, null, 2));
  process.exit(0);
}

const db = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error } = await db.from("missions").upsert(mission, { onConflict: "id" });
if (error) {
  console.error(`✖ Falha ao publicar a missão: ${error.message}`);
  process.exit(1);
}
console.log(`✔ Missão ${mission.id} publicada no catálogo (${mission.title}).`);
