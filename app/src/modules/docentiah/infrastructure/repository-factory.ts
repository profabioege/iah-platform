import { getPlatformConfigError, isAuthConfigured } from "@/lib/auth-flags";

import type { DocentiahRepositories } from "../domain/repositories";
import { createDatabaseDocentiahRepositories } from "./database/database-repositories";
import { createSeedDocentiahRepositories } from "./seed/seed-repositories";

declare global {
  var __iahDocentiahSeedRepositories: DocentiahRepositories | undefined;
}

export function getDefaultDocentiahRepositories(): DocentiahRepositories {
  const configError = getPlatformConfigError();
  if (configError) throw new Error(configError);
  if (isAuthConfigured()) return createDatabaseDocentiahRepositories();
  globalThis.__iahDocentiahSeedRepositories ??= createSeedDocentiahRepositories();
  return globalThis.__iahDocentiahSeedRepositories;
}
