/**
 * Factory de repositórios do Mentor IAH — mesmo critério de
 * `modules/platform`/`modules/assessment` (docs/PERSISTENCE.md):
 * banco real só com a configuração completa; seed em memória caso
 * contrário. O motor determinístico de demonstração usa esta mesma
 * fábrica — não há um caminho de armazenamento separado para ele
 * (Fase 6 desta fatia).
 */

import { getPlatformConfigError, isAuthConfigured } from "@/lib/auth-flags";

import type { MentorRepositories } from "../domain/repositories.ts";
import { createDatabaseMentorRepositories } from "./database/database-repositories.ts";
import { createSeedMentorRepositories } from "./seed/seed-repositories.ts";

declare global {
  var __iahMentorSeedRepositories: MentorRepositories | undefined;
}

export function getDefaultMentorRepositories(): MentorRepositories {
  const configError = getPlatformConfigError();
  if (configError) throw new Error(configError);
  if (isAuthConfigured()) return createDatabaseMentorRepositories();
  globalThis.__iahMentorSeedRepositories ??= createSeedMentorRepositories();
  return globalThis.__iahMentorSeedRepositories;
}
