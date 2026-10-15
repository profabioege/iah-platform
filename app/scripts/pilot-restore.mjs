#!/usr/bin/env node
/**
 * Restauração da cópia lógica do piloto num banco VAZIO (ensaio de
 * recuperação ou recuperação real). Nunca mistura com dados existentes.
 *
 *   node scripts/pilot-restore.mjs --in=C:\piloto\copias\piloto-AAAAMMDD.json \
 *     --execute --confirm-project=<ref-do-destino>
 *
 * O destino passa pela mesma trava dos demais scripts (local, ou projeto
 * confirmado no comando e no ambiente; refs protegidos nunca).
 */
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { countPilotRows, restorePilotData } from "./pilot-backup-lib.mjs";
import { assertAuthorizedTarget } from "./pilot-target-guard.mjs";

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const fail = (m) => {
  console.error(`✖ ${m}`);
  process.exit(1);
};
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) fail("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no ambiente.");
const input = arg("in");
if (!input) fail("Informe --in=<arquivo da cópia>.");
let alvo;
try {
  alvo = assertAuthorizedTarget(url, { confirmProject: arg("confirm-project"), operation: "restaurar a cópia do piloto" });
} catch (e) {
  fail(e.message);
}
const backup = JSON.parse(readFileSync(input, "utf8"));
const db = createClient(url, key, { auth: { persistSession: false } });
console.log(`Destino: ${alvo.descricao}. Cópia de ${backup.createdAt}.`);
if (!process.argv.includes("--execute")) {
  console.log("SIMULAÇÃO: contagens no destino agora (precisam ser zero):");
  console.table(await countPilotRows(db));
  console.log("Nada foi escrito. Repita com --execute.");
  process.exit(0);
}
try {
  const depois = await restorePilotData(db, backup);
  console.log("Restauração concluída; contagens conferidas com a cópia:");
  console.table(depois);
} catch (e) {
  fail(e.message);
}
