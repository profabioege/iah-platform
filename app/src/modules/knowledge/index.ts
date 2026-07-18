/**
 * Módulo Knowledge Engine — núcleo de conhecimento da plataforma
 * (Sprint M11). Materializa a entidade `Biblioteca` de
 * docs/DOMAIN_MODEL.md como 6 entidades endereçáveis. Camadas: domain
 * (entidades + contratos + integrações futuras), infrastructure (seed
 * em memória + database stub + factory), seeds (dados de demonstração,
 * nunca persistidos). Schema SQL: app/db/migrations/0004_knowledge_engine.sql.
 * Documentação: docs/KNOWLEDGE_ENGINE.md. Ver DECISIONS.md D-034.
 *
 * NENHUMA página consome este módulo ainda — sprint de arquitetura,
 * zero mudança visual (mesmo padrão de modules/platform, D-023).
 */

export {
  KNOWLEDGE_RESOURCE_TYPE_LABEL,
  type KnowledgeCollection,
  type KnowledgeDifficultyLevel,
  type KnowledgeDocument,
  type KnowledgeDocumentStatus,
  type KnowledgeMetadata,
  type KnowledgeReference,
  type KnowledgeReferenceRelation,
  type KnowledgeResourceType,
  type KnowledgeScope,
  type KnowledgeSource,
  type KnowledgeSourceKind,
  type KnowledgeTag,
  type KnowledgeTopic,
} from "./domain/entities";

export type {
  KnowledgeCollectionRepository,
  KnowledgeDocumentRepository,
  KnowledgeReferenceRepository,
  KnowledgeRepositories,
  KnowledgeSearchQuery,
  KnowledgeSourceRepository,
  KnowledgeTagRepository,
  KnowledgeTopicRepository,
} from "./domain/repositories";

export {
  knowledgeIntegrationProviders,
  type KnowledgeImportResult,
  type KnowledgeIntegrationId,
  type KnowledgeIntegrationProvider,
} from "./domain/integration-provider";

export {
  createKnowledgeRepositories,
  getDefaultKnowledgeRepositories,
  type KnowledgeRepositorySource,
} from "./infrastructure/repository-factory";
