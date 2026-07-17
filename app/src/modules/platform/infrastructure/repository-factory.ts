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

export function createRepositories(
  source: RepositorySource,
): PlatformRepositories {
  return source === "database"
    ? createDatabaseRepositories()
    : createSeedRepositories();
}

/**
 * Fonte padrão da instância: banco real quando configurado, seeds de
 * demonstração caso contrário. Nenhum consumidor decide isso sozinho.
 */
export function getDefaultRepositories(): PlatformRepositories {
  return createRepositories(isDatabaseConfigured() ? "database" : "seed");
}
