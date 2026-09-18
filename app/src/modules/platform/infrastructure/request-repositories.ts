/**
 * Repositórios escopados pelo ator da requisição.
 *
 * Mora fora de `repository-factory.ts` de propósito: este módulo alcança
 * a sessão do Auth.js (e, por ela, `node:crypto`), enquanto a fábrica é
 * reexportada pelo barril `@/modules/platform`, que componentes de
 * cliente importam. Separar os dois mantém o servidor fora do bundle do
 * navegador.
 */

import type { PlatformRepositories } from "../domain/repositories";
import { getPlatformConfigError, isAuthConfigured } from "@/lib/auth-flags";

import { createDatabaseRepositories } from "./database/database-repositories";
import { createSeedRepositories } from "./seed/seed-repositories";

/**
 * Repositórios DESTA requisição:
 *
 *  - modo demonstração: seed em memória, como sempre;
 *  - modo real: PostgREST no papel `iah_app`, com as claims do ator
 *    conferidas contra o banco (`request-actor.ts`). As policies da
 *    migration 0010 aplicam instituição, papel, turma e dono do registro.
 *
 * Sem ator válido (sessão ausente, conta desativada, credencial
 * redefinida) nenhuma consulta é emitida: a função recusa.
 */
export async function getRequestRepositories(): Promise<PlatformRepositories> {
  const configError = getPlatformConfigError();
  if (configError) throw new Error(configError);
  if (!isAuthConfigured()) {
    globalThis.__iahPlatformSeedRepositories ??= createSeedRepositories();
    return globalThis.__iahPlatformSeedRepositories;
  }
  const { getDatabaseActor } = await import("./database/request-actor");
  const { getScopedDatabaseClient } = await import("./database/scoped-client");
  const actor = await getDatabaseActor();
  if (!actor) throw new Error("Sessão inválida ou expirada — entre novamente.");
  return createDatabaseRepositories(await getScopedDatabaseClient(actor));
}
