import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Limitador de tentativas de login.
 *
 * Duas decisões que a auditoria exigiu:
 *
 *  1. **Estado no banco, não na memória.** A hospedagem prevista cria e
 *     descarta instâncias a cada requisição; um contador em memória de
 *     uma instância não limita nada. Aqui a contagem vive em
 *     `auth_login_attempts` (migration 0011), compartilhada por todas.
 *
 *  2. **A turma não paga pelo IP da escola.** O limite forte é POR
 *     E-MAIL — é a conta que está sob ataque. A origem (IP) também é
 *     contada, mas com folga alta o bastante para 45 alunos entrando
 *     juntos pela mesma saída de internet, e nunca bloqueia uma conta
 *     que está acertando a senha: só conta FALHAS.
 *
 * A origem é guardada como hash (nunca o IP em texto): serve para
 * distinguir origens, não para cadastrar endereços.
 */

/** Falhas por e-mail dentro da janela antes de recusar. */
export const EMAIL_FAILURE_LIMIT = 8;
/** Falhas por origem — alto de propósito: uma escola inteira sai por um IP. */
export const ORIGIN_FAILURE_LIMIT = 120;
/** Janela considerada, em minutos. */
export const WINDOW_MINUTES = 15;

export function hashOrigin(origin: string | null | undefined): string | null {
  const value = (origin ?? "").trim();
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function windowStart(now: Date): string {
  return new Date(now.getTime() - WINDOW_MINUTES * 60_000).toISOString();
}

export interface ThrottleDecision {
  allowed: boolean;
  reason?: "email" | "origin";
}

/**
 * Consulta, sem escrever. Em caso de falha de infraestrutura, devolve
 * `allowed: true` e deixa a autenticação seguir: o limitador não pode
 * virar um jeito novo de derrubar o login da escola inteira — a falha
 * aparece no log do servidor.
 */
export async function checkLoginThrottle(
  db: SupabaseClient,
  email: string,
  originHash: string | null,
  now = new Date(),
): Promise<ThrottleDecision> {
  const since = windowStart(now);
  try {
    const byEmail = await db
      .from("auth_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("succeeded", false)
      .gte("attempted_at", since);

    if ((byEmail.count ?? 0) >= EMAIL_FAILURE_LIMIT) {
      return { allowed: false, reason: "email" };
    }

    if (originHash) {
      const byOrigin = await db
        .from("auth_login_attempts")
        .select("id", { count: "exact", head: true })
        .eq("origin_hash", originHash)
        .eq("succeeded", false)
        .gte("attempted_at", since);

      if ((byOrigin.count ?? 0) >= ORIGIN_FAILURE_LIMIT) {
        return { allowed: false, reason: "origin" };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error(
      "[auth] Limitador de login indisponível — seguindo sem limite nesta tentativa.",
      error instanceof Error ? error.message : error,
    );
    return { allowed: true };
  }
}

/** Registra o resultado da tentativa. Nunca guarda senha nem token. */
export async function recordLoginAttempt(
  db: SupabaseClient,
  email: string,
  originHash: string | null,
  succeeded: boolean,
): Promise<void> {
  try {
    await db
      .from("auth_login_attempts")
      .insert({ email, origin_hash: originHash, succeeded });
  } catch (error) {
    console.error(
      "[auth] Falha ao registrar tentativa de login.",
      error instanceof Error ? error.message : error,
    );
  }
}
