/**
 * Contratos de persistência do Knowledge Engine — mesmo padrão de
 * `modules/platform/domain/repositories.ts` (D-023): domínio não
 * conhece banco, só a interface. `search` é o mecanismo de busca
 * pedido pela Sprint M11 (tema, competência, habilidade, ano, tipo,
 * texto) — um único método parametrizado, não seis endpoints soltos.
 */

import type {
  KnowledgeCollection,
  KnowledgeDifficultyLevel,
  KnowledgeDocument,
  KnowledgeReference,
  KnowledgeResourceType,
  KnowledgeSource,
  KnowledgeTag,
  KnowledgeTopic,
} from "./entities";

/**
 * Parâmetros de busca — todos opcionais e combináveis (AND). Cobre as
 * seis pesquisas pedidas: tema (`topic`), competência (`bnccCompetency`),
 * habilidade (`bnccComputacaoCompetency` — BNCC Computação organiza por
 * habilidade, não só competência), ano (`grade`), tipo (`resourceType`)
 * e textual (`text`, contra título/resumo/palavras-chave).
 */
export interface KnowledgeSearchQuery {
  text?: string;
  topic?: string;
  bnccCompetency?: string;
  bnccComputacaoCompetency?: string;
  grade?: string;
  resourceType?: KnowledgeResourceType;
  difficultyLevel?: KnowledgeDifficultyLevel;
}

export interface KnowledgeSourceRepository {
  list(): Promise<KnowledgeSource[]>;
  getById(id: string): Promise<KnowledgeSource | null>;
  save(source: KnowledgeSource): Promise<KnowledgeSource>;
}

export interface KnowledgeDocumentRepository {
  list(): Promise<KnowledgeDocument[]>;
  getById(id: string): Promise<KnowledgeDocument | null>;
  /** O mecanismo de busca da Sprint M11 — combina todos os filtros de `KnowledgeSearchQuery`. */
  search(query: KnowledgeSearchQuery): Promise<KnowledgeDocument[]>;
  save(document: KnowledgeDocument): Promise<KnowledgeDocument>;
}

export interface KnowledgeCollectionRepository {
  list(): Promise<KnowledgeCollection[]>;
  getById(id: string): Promise<KnowledgeCollection | null>;
  save(collection: KnowledgeCollection): Promise<KnowledgeCollection>;
}

export interface KnowledgeTagRepository {
  list(): Promise<KnowledgeTag[]>;
  save(tag: KnowledgeTag): Promise<KnowledgeTag>;
}

export interface KnowledgeTopicRepository {
  list(): Promise<KnowledgeTopic[]>;
  save(topic: KnowledgeTopic): Promise<KnowledgeTopic>;
}

export interface KnowledgeReferenceRepository {
  listByDocument(documentId: string): Promise<KnowledgeReference[]>;
  /** A relação direta Lesson ↔ Biblioteca pedida pela Sprint M11. */
  listByLesson(lessonId: string): Promise<KnowledgeReference[]>;
  /** A relação direta Mission Flow ↔ Biblioteca pedida pela Sprint M11. */
  listByMission(missionId: string): Promise<KnowledgeReference[]>;
  save(reference: KnowledgeReference): Promise<KnowledgeReference>;
}

/** Agregado — o que a factory (`infrastructure/repository-factory.ts`) entrega. */
export interface KnowledgeRepositories {
  sources: KnowledgeSourceRepository;
  documents: KnowledgeDocumentRepository;
  collections: KnowledgeCollectionRepository;
  tags: KnowledgeTagRepository;
  topics: KnowledgeTopicRepository;
  references: KnowledgeReferenceRepository;
}
