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

import { assertAuthorizedTarget } from "./pilot-target-guard.mjs";

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
const confirmProject = arg("confirm-project");

if (!email) fail("Informe --email=<conta>.");

let alvo;
try {
  alvo = assertAuthorizedTarget(url, {
    confirmProject,
    operation: "redefinir uma credencial",
  });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
console.log(`Destino confirmado: ${alvo.descricao}.`);

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
