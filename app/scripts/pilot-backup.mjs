#!/usr/bin/env node
/**
 * Cópia de segurança lógica do piloto (ver scripts/pilot-backup-lib.mjs).
 *
 *   node scripts/pilot-backup.mjs --out=C:\piloto\copias\piloto-AAAAMMDD.json --confirm-project=<ref>
 *
 * Só lê. O arquivo contém dados pessoais e hashes de senha: precisa ficar
 * FORA do repositório, com acesso restrito.
 */
import { existsSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

import { exportPilotData } from "./pilot-backup-lib.mjs";
import { assertAuthorizedTarget } from "./pilot-target-guard.mjs";

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const fail = (m) => {
  console.error(`✖ ${m}`);
  process.exit(1);
};
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) fail("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no ambiente.");
const out = arg("out");
if (!out) fail("Informe --out=<arquivo fora do repositório>.");
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
if (resolve(out).startsWith(repo + sep)) fail("--out precisa ficar FORA do repositório.");
if (existsSync(out)) fail(`${out} já existe.`);
let alvo;
try {
  alvo = assertAuthorizedTarget(url, { confirmProject: arg("confirm-project"), operation: "copiar os dados do piloto" });
} catch (e) {
  fail(e.message);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const backup = await exportPilotData(db, { source: alvo.descricao });
writeFileSync(out, JSON.stringify(backup), { flag: "wx" });
console.log(`Cópia gravada em ${out} (${alvo.descricao}).`);
console.table(backup.counts);
