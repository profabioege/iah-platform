/**
 * Client administrativo do Supabase — SÓ para código de servidor
 * (provisionamento de identidade, futuras rotinas de sincronização).
 *
 * Usa a SERVICE ROLE KEY, que ignora RLS: jamais importar em componente
 * de cliente, jamais expor com prefixo NEXT_PUBLIC. Ver docs/SUPABASE.md.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isAdminDatabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (!isAdminDatabaseConfigured()) {
    throw new Error(
      "Supabase (admin) não configurado — defina NEXT_PUBLIC_SUPABASE_URL e " +
        "SUPABASE_SERVICE_ROLE_KEY (ver docs/SUPABASE.md).",
    );
  }
  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return adminClient;
}
