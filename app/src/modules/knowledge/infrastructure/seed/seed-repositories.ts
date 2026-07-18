/**
 * Implementação SEED dos contratos do Knowledge Engine — em memória,
 * mesmo padrão de `modules/platform/infrastructure/seed/seed-repositories.ts`.
 * `search` é real (filtra o array em memória) — não é stub; só a fonte
 * de dados é de demonstração.
 */

import type {
  KnowledgeCollection,
  KnowledgeDocument,
  KnowledgeReference,
  KnowledgeSource,
  KnowledgeTag,
  KnowledgeTopic,
} from "../../domain/entities";
import type {
  KnowledgeRepositories,
  KnowledgeSearchQuery,
} from "../../domain/repositories";
import {
  DEMO_KNOWLEDGE_COLLECTION,
  DEMO_KNOWLEDGE_DOCUMENT,
  DEMO_KNOWLEDGE_REFERENCE,
  DEMO_KNOWLEDGE_SOURCE,
  DEMO_KNOWLEDGE_TAGS,
  DEMO_KNOWLEDGE_TOPIC,
} from "../../seeds/demo-seed";

function matchesQuery(document: KnowledgeDocument, query: KnowledgeSearchQuery): boolean {
  if (query.resourceType && document.resourceType !== query.resourceType) return false;
  if (query.difficultyLevel && document.difficultyLevel !== query.difficultyLevel) return false;
  if (query.grade && document.grade !== query.grade) return false;
  if (
    query.bnccCompetency &&
    !document.bnccCompetencies.includes(query.bnccCompetency)
  ) {
    return false;
  }
  if (
    query.bnccComputacaoCompetency &&
    !document.bnccComputacaoCompetencies.includes(query.bnccComputacaoCompetency)
  ) {
    return false;
  }
  if (query.text) {
    const haystack = [document.title, document.summary ?? "", ...document.keywords]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query.text.toLowerCase())) return false;
  }
  return true;
}

export function createSeedKnowledgeRepositories(): KnowledgeRepositories {
  // Cópias mutáveis por instância — escritas não vazam entre factories
  // (mesma regra de modules/platform).
  const sources: KnowledgeSource[] = [DEMO_KNOWLEDGE_SOURCE];
  const documents: KnowledgeDocument[] = [DEMO_KNOWLEDGE_DOCUMENT];
  const collections: KnowledgeCollection[] = [DEMO_KNOWLEDGE_COLLECTION];
  const tags: KnowledgeTag[] = [...DEMO_KNOWLEDGE_TAGS];
  const topics: KnowledgeTopic[] = [DEMO_KNOWLEDGE_TOPIC];
  const references: KnowledgeReference[] = [DEMO_KNOWLEDGE_REFERENCE];

  return {
    sources: {
      async list() {
        return sources;
      },
      async getById(id) {
        return sources.find((s) => s.id === id) ?? null;
      },
      async save(source) {
        const index = sources.findIndex((s) => s.id === source.id);
        if (index === -1) sources.push(source);
        else sources[index] = source;
        return source;
      },
    },
    documents: {
      async list() {
        return documents;
      },
      async getById(id) {
        return documents.find((d) => d.id === id) ?? null;
      },
      async search(query) {
        return documents.filter((d) => matchesQuery(d, query));
      },
      async save(document) {
        const index = documents.findIndex((d) => d.id === document.id);
        if (index === -1) documents.push(document);
        else documents[index] = document;
        return document;
      },
    },
    collections: {
      async list() {
        return collections;
      },
      async getById(id) {
        return collections.find((c) => c.id === id) ?? null;
      },
      async save(collection) {
        const index = collections.findIndex((c) => c.id === collection.id);
        if (index === -1) collections.push(collection);
        else collections[index] = collection;
        return collection;
      },
    },
    tags: {
      async list() {
        return tags;
      },
      async save(tag) {
        const index = tags.findIndex((t) => t.id === tag.id);
        if (index === -1) tags.push(tag);
        else tags[index] = tag;
        return tag;
      },
    },
    topics: {
      async list() {
        return topics;
      },
      async save(topic) {
        const index = topics.findIndex((t) => t.id === topic.id);
        if (index === -1) topics.push(topic);
        else topics[index] = topic;
        return topic;
      },
    },
    references: {
      async listByDocument(documentId) {
        return references.filter((r) => r.documentId === documentId);
      },
      async listByLesson(lessonId) {
        return references.filter((r) => r.relation === "lesson" && r.lessonId === lessonId);
      },
      async listByMission(missionId) {
        return references.filter((r) => r.relation === "mission" && r.missionId === missionId);
      },
      async save(reference) {
        const index = references.findIndex((r) => r.id === reference.id);
        if (index === -1) references.push(reference);
        else references[index] = reference;
        return reference;
      },
    },
  };
}
