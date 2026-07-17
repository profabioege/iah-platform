/**
 * Ponto único de conexão com o banco (Supabase/PostgreSQL).
 * Escolha de stack justificada em docs/PERSISTENCE.md.
 *
 * Sem as variáveis de ambiente, nada aqui é utilizável — e nenhuma
 * outra parte do código deve criar um client Supabase por conta própria.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "Banco de dados não configurado — defina NEXT_PUBLIC_SUPABASE_URL e " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY (ver docs/PERSISTENCE.md).",
    );
  }
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
