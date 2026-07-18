/**
 * Factory de repositórios do Knowledge Engine — mesmo padrão de
 * `modules/platform/infrastructure/repository-factory.ts`: único lugar
 * que decide seed vs. banco real. Reaproveita `isDatabaseConfigured`
 * de `modules/platform` (mesmo projeto Supabase, sem cliente novo).
 */

import { isDatabaseConfigured } from "@/modules/platform";

import type { KnowledgeRepositories } from "../domain/repositories";
import { createSeedKnowledgeRepositories } from "./seed/seed-repositories";
import { createDatabaseKnowledgeRepositories } from "./database/database-repositories";

export type KnowledgeRepositorySource = "seed" | "database";

export function createKnowledgeRepositories(
  source: KnowledgeRepositorySource,
): KnowledgeRepositories {
  return source === "database"
    ? createDatabaseKnowledgeRepositories()
    : createSeedKnowledgeRepositories();
}

/** Fonte padrão: banco real quando configurado, seeds de demonstração caso contrário. */
export function getDefaultKnowledgeRepositories(): KnowledgeRepositories {
  return createKnowledgeRepositories(isDatabaseConfigured() ? "database" : "seed");
}
