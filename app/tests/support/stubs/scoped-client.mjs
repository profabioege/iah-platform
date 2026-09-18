/**
 * Stub do cliente de MENOR PRIVILÉGIO (`scoped-client.ts`).
 *
 * Nos testes unitários não há PostgREST: o que se verifica aqui é a
 * lógica de escopo escrita em TypeScript (papel, instituição, turma),
 * então o cliente escopado devolve o mesmo banco falso do teste. A prova
 * de que as policies do banco entram no caminho — e recusam o que o
 * código deixaria passar — é feita em `tests/pilot/`, contra PostgreSQL
 * e PostgREST de verdade.
 */

import { testEnv } from "../test-env.mjs";

export function isScopedDatabaseConfigured() {
  return Boolean(testEnv.db);
}

export async function getScopedDatabaseClient() {
  if (!testEnv.db) {
    throw new Error(
      "O teste não configurou testEnv.db — use createFakeSupabase().",
    );
  }
  return testEnv.db;
}

export async function mintScopedToken() {
  return "token-ficticio-do-teste";
}
