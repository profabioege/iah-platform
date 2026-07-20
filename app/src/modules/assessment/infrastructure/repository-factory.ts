import { getPlatformConfigError, isAuthConfigured } from "@/lib/auth-flags";

import type { AssessmentRepositories } from "../domain/repositories";
import { createDatabaseAssessmentRepositories } from "./database/database-repositories";
import { createSeedAssessmentRepositories } from "./seed/seed-repositories";

declare global {
  var __iahAssessmentSeedRepositories: AssessmentRepositories | undefined;
}

export function getDefaultAssessmentRepositories(): AssessmentRepositories {
  const configError = getPlatformConfigError();
  if (configError) throw new Error(configError);
  if (isAuthConfigured()) return createDatabaseAssessmentRepositories();
  globalThis.__iahAssessmentSeedRepositories ??= createSeedAssessmentRepositories();
  return globalThis.__iahAssessmentSeedRepositories;
}
