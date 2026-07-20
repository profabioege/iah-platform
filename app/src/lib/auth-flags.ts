/**
 * Flags únicas que decidem o MODO da instância (M22 — Fundação de
 * Produção). Uma instância opera em exatamente UM dos dois modos:
 *
 *  - REAL: autenticação Auth.js (Credentials contra o banco; Google
 *    opcional por cima) + persistência Supabase/PostgreSQL server-side.
 *    Exige AUTH_SECRET + NEXT_PUBLIC_SUPABASE_URL +
 *    SUPABASE_SERVICE_ROLE_KEY.
 *  - DEMONSTRAÇÃO: Institutional Workspace local simulado + seeds em
 *    memória + localStorage no dispositivo (M15–M21). É o modo sem
 *    nenhuma credencial definida.
 *
 * Configuração PARCIAL nunca ativa o modo real nem derruba a Plataforma
 * silenciosamente: `getPlatformConfigError()` devolve o diagnóstico e as
 * telas o exibem com clareza (regra da Sprint M20/M22: nunca mascarar
 * configuração incorreta, nunca fallback silencioso em produção).
 *
 * Edge-safe: só lê process.env, nenhuma dependência. É importada pelo
 * middleware, então NÃO adicionar imports pesados aqui.
 */

/** Persistência real disponível (URL + service role — acesso só no servidor). */
export function isDatabaseReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Login com Google habilitado (opcional; soma-se ao Credentials — D-025). */
export function isGoogleAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.AUTH_SECRET,
  );
}

/**
 * Modo REAL ativo: sessão Auth.js + banco. É a única flag que as rotas e
 * o middleware consultam para decidir entre real × demonstração.
 */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET) && isDatabaseReady();
}

/**
 * Mesma decisão de `isAuthConfigured()`, segura para chamar em
 * componente "use client" — lê o espelho público calculado em build
 * time (`next.config.ts`), já que AUTH_SECRET/SUPABASE_SERVICE_ROLE_KEY
 * não existem no bundle do navegador. Usar apenas quando um componente
 * cliente precisa decidir entre chamar uma Server Action (real) ou a
 * implementação local/demonstração (ex.: `modules/lesson`).
 */
export function isRealModeClient(): boolean {
  return process.env.NEXT_PUBLIC_IAH_REAL_MODE === "true";
}

/**
 * Diagnóstico de configuração parcial — `null` quando a configuração é
 * consistente (tudo definido, ou nada definido = demonstração).
 */
export function getPlatformConfigError(): string | null {
  const flags = {
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
  const defined = Object.values(flags).filter(Boolean).length;
  if (defined === 0 || defined === 3) return null;
  const missing = Object.entries(flags)
    .filter(([, present]) => !present)
    .map(([name]) => name);
  return (
    "Configuração parcial do modo real: defina também " +
    missing.join(", ") +
    " — ou remova todas as variáveis para operar em modo demonstração " +
    "(docs/PERSISTENCE.md, Critérios de ativação)."
  );
}
