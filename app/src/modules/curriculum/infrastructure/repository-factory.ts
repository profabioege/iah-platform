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

export function createCurriculumRepositories(
  source: CurriculumRepositorySource,
): CurriculumRepositories {
  return source === "database"
    ? createDatabaseCurriculumRepositories()
    : createSeedCurriculumRepositories();
}

/** Fonte padrão: banco real quando configurado, seeds de demonstração caso contrário. */
export function getDefaultCurriculumRepositories(): CurriculumRepositories {
  return createCurriculumRepositories(isDatabaseConfigured() ? "database" : "seed");
}
