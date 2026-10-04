/**
 * Factory de repositórios do Knowledge Engine — mesmo padrão de
 * `modules/platform/infrastructure/repository-factory.ts`: único lugar
 * que decide seed vs. banco real. Reaproveita `isDatabaseConfigured`
 * de `modules/platform` (mesmo projeto Supabase, sem cliente novo).
 */

import { isDatabaseConfigured } from "@/modules/platform";

import type { KnowledgeDocument } from "../domain/entities";
import type { KnowledgeRepositories } from "../domain/repositories";
import { createSeedKnowledgeRepositories } from "./seed/seed-repositories";
import {
  createDatabaseKnowledgeRepositories,
  KNOWLEDGE_DATABASE_IMPLEMENTED,
} from "./database/database-repositories";

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

/**
 * Documentos do Knowledge Engine para telas que apenas os CITAM (Turmas,
 * Currículo, editor de aula). No modo real o repositório de banco ainda é
 * stub: devolve lista vazia com `available: false` — sem cair nos seeds de
 * demonstração (dado fictício em instalação real) e sem disparar a
 * consulta que derrubava a página com 500. Quem DEPENDE do Knowledge
 * Engine continua chamando os repositórios e recebe o erro explícito.
 */
export async function listKnowledgeDocumentsForDisplay(): Promise<{
  documents: KnowledgeDocument[];
  available: boolean;
}> {
  if (isDatabaseConfigured() && !KNOWLEDGE_DATABASE_IMPLEMENTED) {
    return { documents: [], available: false };
  }
  return { documents: await getDefaultKnowledgeRepositories().documents.list(), available: true };
}
