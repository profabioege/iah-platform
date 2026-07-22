export * from "./domain/entities";
export * from "./domain/knowledge-sources";
export * from "./domain/provider";
export * from "./domain/repositories";
export { assertConnectionOwnership } from "./domain/authorization";

export { CATALOG_DISCIPLINES } from "./infrastructure/catalog/curriculum-catalog";
export { IAH_AXES, getIahAxisById } from "./infrastructure/catalog/iah-axes";
export { getCurriculumConnectionProvider } from "./infrastructure/providers/provider-factory";
export { getDefaultConexoesIahRepositories } from "./infrastructure/repository-factory";
