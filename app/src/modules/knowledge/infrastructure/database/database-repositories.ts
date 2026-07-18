/**
 * Implementação DATABASE dos contratos do Knowledge Engine — STUB
 * deliberado (mesmo padrão D-019/D-023): não existem credenciais de
 * banco nesta fase, cada método lança em vez de fingir uma query nunca
 * testada. Schema correspondente: app/db/migrations/0004_knowledge_engine.sql.
 * Reaproveita a checagem de configuração de `modules/platform` — mesmo
 * projeto Supabase, nenhum cliente novo criado.
 */

import type { KnowledgeRepositories } from "../../domain/repositories";

function notConfigured(operation: string): never {
  throw new Error(
    `KnowledgeDatabaseRepositories: "${operation}" ainda não está disponível — ` +
      "o banco não foi configurado. Ver docs/KNOWLEDGE_ENGINE.md para a ativação.",
  );
}

export function createDatabaseKnowledgeRepositories(): KnowledgeRepositories {
  return {
    sources: {
      async list() {
        notConfigured("sources.list");
      },
      async getById() {
        notConfigured("sources.getById");
      },
      async save() {
        notConfigured("sources.save");
      },
    },
    documents: {
      async list() {
        notConfigured("documents.list");
      },
      async getById() {
        notConfigured("documents.getById");
      },
      async search() {
        notConfigured("documents.search");
      },
      async save() {
        notConfigured("documents.save");
      },
    },
    collections: {
      async list() {
        notConfigured("collections.list");
      },
      async getById() {
        notConfigured("collections.getById");
      },
      async save() {
        notConfigured("collections.save");
      },
    },
    tags: {
      async list() {
        notConfigured("tags.list");
      },
      async save() {
        notConfigured("tags.save");
      },
    },
    topics: {
      async list() {
        notConfigured("topics.list");
      },
      async save() {
        notConfigured("topics.save");
      },
    },
    references: {
      async listByDocument() {
        notConfigured("references.listByDocument");
      },
      async listByLesson() {
        notConfigured("references.listByLesson");
      },
      async listByMission() {
        notConfigured("references.listByMission");
      },
      async save() {
        notConfigured("references.save");
      },
    },
  };
}
