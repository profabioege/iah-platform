/**
 * Stub de `@/auth` — a sessão Auth.js do modo real.
 *
 * `session.ts` chega aqui por import dinâmico e lê apenas
 * `session.user`; o teste controla esse objeto por `testEnv.session`,
 * incluindo os casos incompletos (sem papel, sem instituição), que são
 * justamente os que precisam terminar em contexto nulo.
 */

import { testEnv } from "../test-env.mjs";

export async function auth() {
  return testEnv.session;
}

export const handlers = {};
export const signIn = async () => {
  throw new Error("signIn não é exercitado nestes testes.");
};
export const signOut = async () => {
  throw new Error("signOut não é exercitado nestes testes.");
};
