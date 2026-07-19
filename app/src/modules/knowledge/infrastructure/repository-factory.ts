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

// Singleton em `globalThis` — mesma correção de
// `modules/platform/infrastructure/repository-factory.ts` (M17): um
// `let` de módulo não sobrevive a instâncias de módulo separadas entre
// Server Actions e Server Components no Next.js.
declare global {
  var __iahKnowledgeSeedRepositories: KnowledgeRepositories | undefined;
}

export function createKnowledgeRepositories(
  source: KnowledgeRepositorySource,
): KnowledgeRepositories {
  if (source === "database") return createDatabaseKnowledgeRepositories();
  globalThis.__iahKnowledgeSeedRepositories ??= createSeedKnowledgeRepositories();
  return globalThis.__iahKnowledgeSeedRepositories;
}

/** Fonte padrão: banco real quando configurado, seeds de demonstração caso contrário. */
export function getDefaultKnowledgeRepositories(): KnowledgeRepositories {
  return createKnowledgeRepositories(isDatabaseConfigured() ? "database" : "seed");
}
