import { getPlatformConfigError, isAuthConfigured } from "@/lib/auth-flags";

import type { ConexoesIahRepositories } from "../domain/repositories";
import { createDatabaseConexoesIahRepositories } from "./database/database-repositories";
import { createSeedConexoesIahRepositories } from "./seed/seed-repositories";

declare global {
  var __iahConexoesIahSeedRepositories: ConexoesIahRepositories | undefined;
}

export function getDefaultConexoesIahRepositories(): ConexoesIahRepositories {
  const configError = getPlatformConfigError();
  if (configError) throw new Error(configError);
  if (isAuthConfigured()) return createDatabaseConexoesIahRepositories();
  globalThis.__iahConexoesIahSeedRepositories ??= createSeedConexoesIahRepositories();
  return globalThis.__iahConexoesIahSeedRepositories;
}
