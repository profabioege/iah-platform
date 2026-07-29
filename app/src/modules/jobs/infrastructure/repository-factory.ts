import { getSupabaseAdminClient } from "@/modules/platform/infrastructure/database/admin-client";

import type { AsyncJobRepository } from "../domain/repositories";
import { createSupabaseAsyncJobsDriver } from "./database/async-jobs-driver.ts";
import { createDatabaseAsyncJobRepository } from "./database/database-repositories.ts";

export function getDefaultAsyncJobRepository(): AsyncJobRepository {
  return createDatabaseAsyncJobRepository(
    createSupabaseAsyncJobsDriver(getSupabaseAdminClient()),
  );
}
