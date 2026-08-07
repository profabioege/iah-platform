/**
 * Stub do cliente Supabase administrativo — devolve o banco falso que o
 * teste montou (`createFakeSupabase`). Nenhum teste toca banco remoto.
 */

import { testEnv } from "../test-env.mjs";

export function isAdminDatabaseConfigured() {
  return Boolean(testEnv.db);
}

export function getSupabaseAdminClient() {
  if (!testEnv.db) {
    throw new Error(
      "O teste não configurou testEnv.db — use createFakeSupabase().",
    );
  }
  return testEnv.db;
}
