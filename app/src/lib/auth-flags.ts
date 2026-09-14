/**
 * Seletor único do MODO de autenticação da instância. O modo é
 * DECLARADO em `IAH_AUTH_MODE` — nunca inferido da presença ou ausência
 * de variáveis. Uma instância opera em exatamente um destes estados:
 *
 *  - `supabase` (comercial): autenticação Auth.js (Credentials contra o
 *    banco; Google opcional por cima) + persistência Supabase/PostgreSQL
 *    server-side. Exige AUTH_SECRET + NEXT_PUBLIC_SUPABASE_URL +
 *    SUPABASE_SERVICE_ROLE_KEY. Se algo faltar, a instância NÃO cai para
 *    demonstração: fica indisponível.
 *  - `demo` (ambiente controlado): Institutional Workspace local
 *    simulado + seeds em memória (M15–M21). Só com a declaração
 *    explícita; nunca por omissão.
 *  - indisponível: `IAH_AUTH_MODE` ausente, com valor inválido, ou
 *    `supabase` sem a configuração completa. Nenhuma autenticação é
 *    tentada, nenhum provider local é usado, e a tela mostra uma
 *    mensagem neutra — o diagnóstico fica no log do servidor.
 *
 * A regra substitui o fallback silencioso anterior, em que "nenhuma
 * variável definida" virava demonstração automaticamente — o que fazia
 * uma instalação comercial mal configurada se apresentar como ambiente
 * de demonstração (M22/D-047: nunca mascarar configuração incorreta).
 *
 * Edge-safe: só lê process.env, nenhuma dependência. É importada pelo
 * middleware, então NÃO adicionar imports pesados aqui.
 */

/** Estado de autenticação resolvido a partir da declaração explícita. */
export type AuthMode = "demo" | "supabase" | "unavailable";

/** Persistência real disponível (URL + service role — acesso só no servidor). */
export function isDatabaseReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Tudo que o modo `supabase` exige para autenticar de verdade. */
function isSupabaseModeComplete(): boolean {
  return Boolean(process.env.AUTH_SECRET) && isDatabaseReady();
}

/** Valor declarado, normalizado — nunca o valor bruto. */
function declaredMode(): string {
  return (process.env.IAH_AUTH_MODE ?? "").trim().toLowerCase();
}

/**
 * MODO EFETIVO da instância. Ponto único de decisão: rotas, middleware,
 * Auth.js e a tela de login consultam só esta função (ou os atalhos
 * abaixo). Nunca deduza o modo somando variáveis por conta própria.
 */
export function getAuthMode(): AuthMode {
  const declared = declaredMode();
  if (declared === "demo") return "demo";
  if (declared === "supabase") {
    return isSupabaseModeComplete() ? "supabase" : "unavailable";
  }
  return "unavailable";
}

/**
 * Modo REAL ativo: sessão Auth.js + banco. É a flag que as rotas e o
 * middleware consultam para decidir entre real × demais estados.
 */
export function isAuthConfigured(): boolean {
  return getAuthMode() === "supabase";
}

/** Demonstração local explicitamente declarada (nunca por omissão). */
export function isDemoMode(): boolean {
  return getAuthMode() === "demo";
}

/** Nem real nem demonstração: a Plataforma não deve autenticar ninguém. */
export function isPlatformUnavailable(): boolean {
  return getAuthMode() === "unavailable";
}

/** Login com Google habilitado (opcional; soma-se ao Credentials — D-025). */
export function isGoogleAuthConfigured(): boolean {
  return (
    getAuthMode() === "supabase" &&
    Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  );
}

/**
 * Mesma decisão de `isAuthConfigured()`, segura para chamar em
 * componente "use client" — lê o espelho público calculado em build
 * time (`next.config.ts`), já que AUTH_SECRET/SUPABASE_SERVICE_ROLE_KEY
 * não existem no bundle do navegador. Usar apenas quando um componente
 * cliente precisa decidir entre chamar uma Server Action (real) ou a
 * implementação local/demonstração (ex.: `modules/lesson`) — NUNCA para
 * decidir autenticação, que é sempre resolvida no servidor.
 */
export function isRealModeClient(): boolean {
  return process.env.NEXT_PUBLIC_IAH_REAL_MODE === "true";
}

let diagnosticsLogged = false;

/**
 * Emite o diagnóstico de configuração no log do SERVIDOR, uma vez por
 * processo.
 *
 * Chamar fora do render é proposital: durante o render de um Server
 * Component o Next (em desenvolvimento) reencaminha o `console` do
 * servidor para o navegador, e o diagnóstico — que nomeia variáveis —
 * acabaria serializado no payload da página. No escopo do módulo ele
 * fica só no terminal do servidor, que é o destino pretendido.
 */
export function logAuthModeDiagnosticsOnce(): void {
  if (diagnosticsLogged) return;
  diagnosticsLogged = true;
  const problema = getPlatformConfigError();
  if (problema) console.error("[auth]", problema);
}

/**
 * Diagnóstico de configuração — `null` quando o modo está consistente.
 * Destinado EXCLUSIVAMENTE ao log do servidor e a erros server-side:
 * nomeia as variáveis que faltam e por isso nunca deve ser enviado ao
 * navegador nem exibido ao usuário (a tela usa mensagem neutra).
 */
export function getPlatformConfigError(): string | null {
  const declared = declaredMode();

  if (declared === "demo") return null;

  if (declared === "supabase") {
    const flags = {
      AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      ),
    };
    const missing = Object.entries(flags)
      .filter(([, present]) => !present)
      .map(([name]) => name);
    if (missing.length === 0) return null;
    return (
      'IAH_AUTH_MODE="supabase" exige também ' +
      missing.join(", ") +
      " — a Plataforma permanece indisponível até a configuração ficar " +
      "completa (docs/AUTHENTICATION.md, Modos de autenticação)."
    );
  }

  if (declared === "") {
    return (
      "IAH_AUTH_MODE não definida — declare \"supabase\" (instalação " +
      "comercial) ou \"demo\" (ambiente controlado). Sem declaração a " +
      "Plataforma permanece indisponível por segurança " +
      "(docs/AUTHENTICATION.md, Modos de autenticação)."
    );
  }

  return (
    "IAH_AUTH_MODE com valor não reconhecido — use \"supabase\" ou " +
    '"demo" (docs/AUTHENTICATION.md, Modos de autenticação).'
  );
}
