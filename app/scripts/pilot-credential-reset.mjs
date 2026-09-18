#!/usr/bin/env node
/**
 * Recuperação assistida de acesso — CLI administrativa.
 *
 * A escola (responsável autorizado) pede; o operador redefine. Não existe
 * autoatendimento por e-mail no piloto: as contas de estudante podem nem
 * ter caixa postal, e o pedido precisa passar por alguém da escola.
 *
 * Uso (a partir de app/):
 *
 *   node --experimental-strip-types scripts/pilot-credential-reset.mjs \
 *     --email=aluno.xxx@escola.test --execute \
 *     --actor="cli:coordenacao" --reason="pedido da coordenação em 18/09"
 *
 * O que acontece: senha temporária individual, troca obrigatória no
 * próximo acesso e invalidação das sessões abertas com a credencial
 * anterior. A trilha administrativa registra quem pediu e por quê — nunca
 * a senha.
 */

import { createClient } from "@supabase/supabase-js";

import { resetPilotCredential } from "../src/modules/identity/provisioning/pilot-provisioning.ts";

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  return process.argv.includes(`--${name}`) ? true : fallback;
}

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) {
  fail("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no ambiente.");
}

const email = arg("email");
const execute = arg("execute", false) === true;
const actor = String(arg("actor", "cli:operador-nao-identificado"));
const reason = String(arg("reason", "solicitação da escola"));
const allowNonLocal = arg("i-know-this-is-not-production", false) === true;

if (!email) fail("Informe --email=<conta>.");

const host = new URL(url).hostname.toLowerCase();
const local = host === "127.0.0.1" || host === "localhost" || host === "::1";
if (!local && !allowNonLocal) {
  fail(
    `Destino remoto recusado (${host}). Repita com --i-know-this-is-not-production ` +
      "apenas em ambiente de homologação dedicado.",
  );
}

if (!execute) {
  console.log(
    `SIMULAÇÃO: a conta ${email} teria a credencial redefinida por ${actor} ` +
      `(motivo: ${reason}). Nada foi alterado — repita com --execute.`,
  );
  process.exit(0);
}

const db = createClient(url, serviceRole, { auth: { persistSession: false } });

try {
  const resultado = await resetPilotCredential(db, String(email), { actor, reason });
  console.log(`\n== Recuperação assistida concluída`);
  console.log(`Conta:            ${resultado.email}`);
  console.log(`Senha temporária: ${resultado.temporaryPassword}`);
  console.log(`Versão da credencial: ${resultado.credentialsVersion}`);
  console.log(
    "\nEntregue a senha ao titular pelo canal combinado com a escola. " +
      "Ela exige troca no primeiro acesso e as sessões anteriores já foram invalidadas.",
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
