import {
  checkLoginThrottle,
  hashOrigin,
  recordLoginAttempt,
} from "../../../lib/login-throttle.ts";
import { verifyPassword } from "../../../lib/password.ts";

/**
 * Verificação de credencial do modo real — o miolo do provider
 * Credentials do Auth.js, extraído para um módulo próprio.
 *
 * Por que separado: aqui é onde mora a decisão de deixar alguém entrar
 * (limitador de tentativas, conta ativa, senha, perfil ativo). Isso
 * precisa ser exercitável em teste de integração contra o banco real —
 * dentro de `auth.ts` só seria alcançável pelo runtime do Next.js, e
 * "injetar cookie para abrir o painel" não valida login nenhum.
 *
 * `auth.ts` continua sendo o único lugar que monta o NextAuth; este
 * módulo não conhece Next, cookies nem sessão.
 */

export interface AuthenticatedActor {
  id: string;
  name: string;
  email: string;
  platformUserId: string;
  institutionId: string;
  role: string;
  credentialsVersion: number;
  mustChangePassword: boolean;
}

export class AuthBackendUnavailableError extends Error {
  constructor() {
    super("auth_backend_unavailable");
    this.name = "AuthBackendUnavailableError";
  }
}

interface VerifyOptions {
  /** Origem da requisição (IP), usada só como hash pelo limitador. */
  origin?: string | null;
}

export async function verifyCredentials(
  rawEmail: unknown,
  rawPassword: unknown,
  options: VerifyOptions = {},
): Promise<AuthenticatedActor | null> {
  const email = String(rawEmail ?? "").trim().toLowerCase();
  const password = String(rawPassword ?? "");
  if (!email || !password) return null;
  // Limite de tamanho: campo de login não recebe texto longo — corta
  // abuso antes de qualquer trabalho (hash de senha é caro de propósito).
  if (email.length > 254 || password.length > 512) return null;

  const { getSupabaseAdminClient } = await import(
    "../../platform/infrastructure/database/admin-client.ts"
  );
  const db = getSupabaseAdminClient();
  const originHash = hashOrigin(options.origin ?? null);

  // Limitador ANTES de qualquer consulta de credencial: tentativa
  // recusada não consome banco nem revela se o e-mail existe.
  const throttle = await checkLoginThrottle(db, email, originHash);
  if (!throttle.allowed) {
    await recordLoginAttempt(db, email, originHash, false);
    return null;
  }

  const { data: user, error } = await db
    .from("users")
    .select(
      "id, institution_id, name, email, password_hash, status, credentials_version, must_change_password",
    )
    .eq("email", email)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    // Falha de INFRAESTRUTURA não é credencial inválida: devolver null
    // aqui faria o banco fora do ar aparecer para o usuário como
    // "e-mail ou senha incorretos". Lançar mantém o erro fora da família
    // CredentialsSignin, e a tela mostra indisponível.
    console.error("[auth] Falha ao consultar usuário.", error.message);
    throw new AuthBackendUnavailableError();
  }

  if (!user?.password_hash) {
    await recordLoginAttempt(db, email, originHash, false);
    return null;
  }
  if (!verifyPassword(password, user.password_hash as string)) {
    await recordLoginAttempt(db, email, originHash, false);
    return null;
  }

  const { data: profile } = await db
    .from("profiles")
    .select("role, institution_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  // Sem vínculo ativo com uma instituição, não há acesso (P1: permissões
  // derivam do Perfil, nunca da identidade sozinha).
  if (!profile) {
    await recordLoginAttempt(db, email, originHash, false);
    return null;
  }

  await recordLoginAttempt(db, email, originHash, true);
  await db
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", user.id);

  return {
    id: user.id as string,
    name: user.name as string,
    email: user.email as string,
    platformUserId: user.id as string,
    institutionId: (profile.institution_id ?? user.institution_id) as string,
    role: profile.role as string,
    // Versão da credencial viaja na sessão: uma redefinição assistida
    // invalida as sessões emitidas antes dela (`request-actor.ts`).
    credentialsVersion: Number(user.credentials_version ?? 1),
    mustChangePassword: Boolean(user.must_change_password),
  };
}
