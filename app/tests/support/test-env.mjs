/**
 * Estado compartilhado entre um teste e os stubs de `next/*`, `@/auth`,
 * do cliente Supabase administrativo e da factory de repositórios.
 *
 * Vive em `globalThis` de propósito: os stubs são carregados pelo hook
 * de resolução (`module-hooks.mjs`) e podem acabar em instâncias de
 * módulo distintas — `globalThis` é o único canal garantidamente único
 * dentro do processo do arquivo de teste (o runner do Node dá um
 * processo por arquivo, então não há vazamento entre suítes).
 */

const env = (globalThis.__IAH_TEST_ENV__ ??= {
  /** Cookies visíveis para o stub de `next/headers`. */
  cookies: new Map(),
  /** Sessão devolvida pelo stub de `@/auth` (`auth()`). */
  session: null,
  /** Cliente Supabase falso devolvido por `getSupabaseAdminClient()`. */
  db: null,
  /** Repositórios falsos devolvidos por `getDefaultRepositories()`. */
  repositories: null,
  /** Rotas passadas a `revalidatePath()` pelas Server Actions. */
  revalidated: [],
});

export const testEnv = env;

export function resetTestEnv() {
  env.cookies.clear();
  env.session = null;
  env.db = null;
  env.repositories = null;
  env.revalidated.length = 0;
}

/** Liga o modo REAL para o código sob teste (mesmas flags de `lib/auth-flags`). */
export function enableRealMode() {
  process.env.AUTH_SECRET = "test-auth-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
}

/** Volta ao modo DEMONSTRAÇÃO (nenhuma variável definida). */
export function enableDemoMode() {
  delete process.env.AUTH_SECRET;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
}
