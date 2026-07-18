/**
 * Dados de demonstração do Knowledge Engine — em memória, nunca
 * persistidos (mesma regra de docs/PERSISTENCE.md). Rotulados como
 * demonstração; só provam que o formato de `KnowledgeDocument`
 * comporta um recurso real, incluindo o vínculo com a Missão 01 via
 * `KnowledgeReference` (a relação Biblioteca ↔ Mission Flow pedida
 * pela Sprint M11).
 */

import type {
  KnowledgeCollection,
  KnowledgeDocument,
  KnowledgeReference,
  KnowledgeSource,
  KnowledgeTag,
  KnowledgeTopic,
} from "../domain/entities";

export const DEMO_KNOWLEDGE_SOURCE: KnowledgeSource = {
  id: "source-demo-manual",
  kind: "manual",
  label: "Upload manual — biblioteca de demonstração",
  externalId: null,
  url: null,
  importedAt: "2026-07-18T00:00:00.000Z",
};

export const DEMO_KNOWLEDGE_TOPIC: KnowledgeTopic = {
  id: "topic-desinformacao",
  label: "Desinformação e verificação de fontes",
  parentTopicId: null,
};

export const DEMO_KNOWLEDGE_TAGS: KnowledgeTag[] = [
  { id: "tag-ia-generativa", label: "IA generativa" },
  { id: "tag-checagem", label: "Checagem de fatos" },
];

export const DEMO_KNOWLEDGE_DOCUMENT: KnowledgeDocument = {
  id: "doc-como-uma-ia-escreve-noticia",
  title: 'Como uma IA escreve uma notícia',
  resourceType: "artigo",
  author: "Equipe IAH Educacional",
  sourceName: "Material de apoio da Missão 01",
  year: 2026,
  language: "pt-BR",
  summary:
    "Leitura curta sobre como modelos de linguagem geram texto plausível " +
    "sem verificar fatos — o mesmo texto-base já citado em " +
    "didacticMaterials da Missão 01.",
  keywords: ["IA generativa", "desinformação", "checagem de fontes"],
  bnccCompetencies: [],
  bnccComputacaoCompetencies: [],
  grade: "Ensino Médio",
  estimatedMinutes: 5,
  difficultyLevel: "introdutorio",
  license: "Uso interno IAH",
  scope: "global",
  institutionId: null,
  sourceId: DEMO_KNOWLEDGE_SOURCE.id,
  collectionIds: ["collection-demo-modulo-1"],
  tagIds: [DEMO_KNOWLEDGE_TAGS[0].id, DEMO_KNOWLEDGE_TAGS[1].id],
  topicIds: [DEMO_KNOWLEDGE_TOPIC.id],
  status: "published",
  contentRef: null,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

export const DEMO_KNOWLEDGE_COLLECTION: KnowledgeCollection = {
  id: "collection-demo-modulo-1",
  title: "Módulo 1 — O Auditor da Realidade",
  description: "Coleção de apoio às Missões do Módulo 1.",
  documentIds: [DEMO_KNOWLEDGE_DOCUMENT.id],
};

/** O vínculo direto Biblioteca ↔ Mission Flow (Sprint M11) — Missão 01. */
export const DEMO_KNOWLEDGE_REFERENCE: KnowledgeReference = {
  id: "ref-demo-missao-01",
  documentId: DEMO_KNOWLEDGE_DOCUMENT.id,
  relation: "mission",
  lessonId: null,
  missionId: "01-a-fabrica-de-noticias",
  note: "Mesmo texto-base já citado em didacticMaterials da Missão 01.",
};
