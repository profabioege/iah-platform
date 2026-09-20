/**
 * Sessões autenticadas compartilhadas entre as suítes de homologação.
 *
 * As contas nascem com senha temporária e troca obrigatória. Se cada
 * suíte escolhesse sua própria senha definitiva, a primeira a rodar
 * deixaria as outras sem acesso — foi exatamente o que aconteceu na
 * primeira execução. A senha definitiva é derivada do identificador da
 * conta, então qualquer suíte chega ao mesmo valor, em qualquer ordem.
 *
 * Isso continua sendo login normal: a troca é feita pelo formulário e o
 * acesso seguinte passa pelo Auth.js como o de qualquer pessoa.
 */

import assert from "node:assert/strict";

import { SessaoHttp } from "./http-client.mjs";
import { BASE_URL, conta } from "./ambiente.mjs";

/** Determinística e diferente para cada conta — nunca coletiva. */
export function senhaDefinitiva(registro) {
  return `Homolog-2026-${registro.referencia}`;
}

/**
 * Entra com a conta, trocando a senha temporária na primeira vez.
 * Devolve a sessão já dentro da aplicação.
 */
export async function autenticar(registro) {
  const definitiva = senhaDefinitiva(registro);

  const direta = new SessaoHttp(BASE_URL, registro.email);
  if ((await direta.entrar(registro.email, definitiva)).ok) return direta;

  const inicial = new SessaoHttp(BASE_URL, registro.email);
  const entrada = await inicial.entrar(registro.email, registro.senha);
  assert.equal(entrada.ok, true, `login inicial de ${registro.email} falhou`);

  const troca = await inicial.enviarFormulario("/entrar/nova-senha", {
    atual: registro.senha,
    nova: definitiva,
    confirmacao: definitiva,
  });
  assert.equal(troca.status, 303, `a troca de senha de ${registro.email} não concluiu`);

  const depois = new SessaoHttp(BASE_URL, registro.email);
  assert.equal(
    (await depois.entrar(registro.email, definitiva)).ok,
    true,
    `a senha nova de ${registro.email} não valeu`,
  );
  return depois;
}

/** Atalho: escolhe a conta na turma e já autentica. */
export async function autenticarConta(turma, perfil, indice = 0) {
  const registro = conta(turma, perfil, indice);
  return { registro, sessao: await autenticar(registro) };
}
