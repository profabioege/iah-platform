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

/**
 * Liga o modo REAL para o código sob teste — declaração explícita de
 * `IAH_AUTH_MODE` mais a configuração completa que ela exige (mesmas
 * regras de `lib/auth-flags`). Valores fictícios, nunca credenciais.
 */
export function enableRealMode() {
  process.env.IAH_AUTH_MODE = "supabase";
  process.env.AUTH_SECRET = "test-auth-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
}

/**
 * Liga o modo DEMONSTRAÇÃO — também por declaração explícita: desde o
 * hardening, ausência de variáveis significa INDISPONÍVEL, nunca demo.
 */
export function enableDemoMode() {
  process.env.IAH_AUTH_MODE = "demo";
  delete process.env.AUTH_SECRET;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
}

/** Estado INDISPONÍVEL: nada declarado, nada configurado. */
export function enableUnavailableMode() {
  delete process.env.IAH_AUTH_MODE;
  delete process.env.AUTH_SECRET;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
}
