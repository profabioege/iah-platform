/**
 * Factory de repositórios do Curriculum Engine — mesmo padrão de
 * `modules/knowledge/infrastructure/repository-factory.ts`: único lugar
 * que decide seed vs. banco real. Reaproveita `isDatabaseConfigured` de
 * `modules/platform` (mesmo projeto Supabase, sem cliente novo).
 */

import { isDatabaseConfigured } from "@/modules/platform";

import type { CurriculumRepositories } from "../domain/curriculum-repository";
import { createSeedCurriculumRepositories } from "./seed/seed-repositories";
import { createDatabaseCurriculumRepositories } from "./database/database-repositories";

export type CurriculumRepositorySource = "seed" | "database";

// Singleton em `globalThis` — mesma correção de
// `modules/platform/infrastructure/repository-factory.ts` (M17): um
// `let` de módulo não sobrevive a instâncias de módulo separadas entre
// Server Actions e Server Components no Next.js.
declare global {
  var __iahCurriculumSeedRepositories: CurriculumRepositories | undefined;
}

export function createCurriculumRepositories(
  source: CurriculumRepositorySource,
): CurriculumRepositories {
  if (source === "database") return createDatabaseCurriculumRepositories();
  globalThis.__iahCurriculumSeedRepositories ??= createSeedCurriculumRepositories();
  return globalThis.__iahCurriculumSeedRepositories;
}

/** Fonte padrão: banco real quando configurado, seeds de demonstração caso contrário. */
export function getDefaultCurriculumRepositories(): CurriculumRepositories {
  return createCurriculumRepositories(isDatabaseConfigured() ? "database" : "seed");
}
