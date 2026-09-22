import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de banco com MENOR PRIVILÉGIO (migration 0010).
 *
 * A aplicação autentica com Auth.js Credentials, não com Supabase Auth —
 * então não existe token de usuário do Supabase e `auth.uid()` não
 * reconhece ninguém. O que existe é a sessão do Next. Este módulo é a
 * ponte: transforma o ator da sessão num JWT curto, assinado com o
 * segredo que o PostgREST já usa, cujo claim `role` é `iah_app`.
 *
 * A partir daí quem decide é o banco: as policies leem
 * `request.jwt.claims` e aplicam instituição, papel, turma e dono do
 * registro. O JWT dura minutos e é emitido no servidor a cada requisição
 * — nunca chega ao navegador.
 *
 * A assinatura usa Web Crypto (`globalThis.crypto.subtle`), não
 * `node:crypto`: este módulo é alcançado pelo grafo de módulos das telas,
 * e o bundler não aceita o esquema `node:` em todos os runtimes.
 *
 * A `service_role` continua existindo para o que é administrativo por
 * natureza (autenticação, provisionamento, recuperação assistida) e vive
 * em `admin-client.ts`. Telas e ações pedagógicas usam ESTE cliente.
 */

export type DatabaseActorRole =
  | "aluno"
  | "professor"
  | "administrador"
  | "admin_iah";

export interface DatabaseActor {
  institutionId: string;
  role: DatabaseActorRole;
  userId: string;
  teacherId: string | null;
  studentId: string | null;
}

/** Vida curta: o token existe para a requisição, não para a sessão. */
const TOKEN_TTL_SECONDS = 300;

export function isScopedDatabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_JWT_SECRET,
  );
}

function base64url(bytes: Uint8Array | string): string {
  const binary =
    typeof bytes === "string"
      ? bytes
      : Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64url(new Uint8Array(signature));
}

/**
 * JWT HS256 com as claims que as policies leem. `role` é o papel do
 * PostgREST (o banco assume `iah_app`); `actor_role` é o papel
 * pedagógico. Ambos vêm da sessão do servidor — nunca do cliente.
 */
export async function mintScopedToken(
  actor: DatabaseActor,
  now = Math.floor(Date.now() / 1000),
): Promise<string> {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error(
      "SUPABASE_JWT_SECRET ausente — o acesso de menor privilégio ao banco " +
        "não pode ser emitido (ver docs/SUPABASE.md).",
    );
  }
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      role: "iah_app",
      actor_role: actor.role,
      institution_id: actor.institutionId,
      user_id: actor.userId,
      teacher_id: actor.teacherId ?? "",
      student_id: actor.studentId ?? "",
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    }),
  );
  const payload = `${header}.${claims}`;
  return `${payload}.${await sign(payload, secret)}`;
}

/**
 * Cliente PostgREST no papel `iah_app`, com as claims do ator. Não é
 * memoizado: o token expira e o ator muda a cada requisição.
 */
export async function getScopedDatabaseClient(
  actor: DatabaseActor,
): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !process.env.SUPABASE_JWT_SECRET) {
    throw new Error(
      "Banco de menor privilégio não configurado — defina " +
        "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e " +
        "SUPABASE_JWT_SECRET (ver docs/SUPABASE.md).",
    );
  }
  const token = await mintScopedToken(actor);
  // O gateway do Supabase hospedado (Kong) exige que o cabeçalho `apikey`
  // seja uma das chaves do projeto (anon/service_role) — um JWT de
  // propósito próprio como este (role `iah_app`, vida curta) não é aceito
  // ali, mesmo assinado com o segredo correto; isso só passa despercebido
  // no PostgREST local de teste, que não tem essa camada de gateway.
  // `Authorization: Bearer` continua carregando o token de menor
  // privilégio — é dali que o PostgREST lê `request.jwt.claims` e assume
  // o papel `iah_app`. `apikey` só identifica o projeto perante o Kong.
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}`, apikey: anonKey } },
  });
}
