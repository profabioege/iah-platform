/**
 * Factory de repositórios — o único lugar que decide qual fonte de dados
 * a plataforma usa (docs/PERSISTENCE.md).
 *
 * M22 — critérios de ativação do banco:
 *  * modo REAL exige a configuração COMPLETA (AUTH_SECRET +
 *    NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) — o acesso é
 *    exclusivamente server-side via service role (D-041);
 *  * configuração PARCIAL nunca seleciona o banco nem cai em seed
 *    silenciosamente: lança erro de prontidão explícito;
 *  * sem nenhuma variável, vale o modo demonstração (seeds em memória).
 */

import {
  getPlatformConfigError,
  isAuthConfigured,
} from "@/lib/auth-flags";

import type { PlatformRepositories } from "../domain/repositories";
import { createSeedRepositories } from "./seed/seed-repositories";
import { createDatabaseRepositories } from "./database/database-repositories";

export type RepositorySource = "seed" | "database";

// Singleton do lado seed guardado em `globalThis`: a documentação
// sempre disse "escritas afetam só a memória do processo"
// (docs/PERSISTENCE.md), mas um `let` de módulo não bastava — Server
// Actions e Server Components do Next.js podem carregar o mesmo
// arquivo em instâncias de módulo separadas dentro do mesmo processo
// (mesmo problema clássico do singleton do Prisma Client em Next.js).
// `globalThis` é compartilhado de verdade entre essas instâncias.
declare global {
  var __iahPlatformSeedRepositories: PlatformRepositories | undefined;
}

export function createRepositories(
  source: RepositorySource,
): PlatformRepositories {
  if (source === "database") return createDatabaseRepositories();
  globalThis.__iahPlatformSeedRepositories ??= createSeedRepositories();
  return globalThis.__iahPlatformSeedRepositories;
}

/**
 * Fonte padrão da instância: banco real quando o modo real está
 * completamente configurado; seeds de demonstração quando nada está
 * configurado. Nenhum consumidor decide isso sozinho.
 */
export function getDefaultRepositories(): PlatformRepositories {
  const configError = getPlatformConfigError();
  if (configError) throw new Error(configError);
  return createRepositories(isAuthConfigured() ? "database" : "seed");
}
