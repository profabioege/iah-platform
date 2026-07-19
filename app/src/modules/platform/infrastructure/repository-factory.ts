/**
 * Factory de repositórios — o único lugar que decide qual fonte de dados
 * a plataforma usa. A troca futura de seed → banco real acontece aqui,
 * sem alterar nenhuma página (docs/PERSISTENCE.md).
 */

import type { PlatformRepositories } from "../domain/repositories";
import { createSeedRepositories } from "./seed/seed-repositories";
import { createDatabaseRepositories } from "./database/database-repositories";
import { isDatabaseConfigured } from "./database/supabase-client";

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
 * Fonte padrão da instância: banco real quando configurado, seeds de
 * demonstração caso contrário. Nenhum consumidor decide isso sozinho.
 */
export function getDefaultRepositories(): PlatformRepositories {
  return createRepositories(isDatabaseConfigured() ? "database" : "seed");
}
