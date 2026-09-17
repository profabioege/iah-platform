/**
 * Conexões IAH — recorte da candidata de apresentação: só o que o
 * Planejador Conversacional do DocentIAH usa (domínio, catálogos locais e
 * provedor demonstrativo). Repositórios de persistência e a tela própria
 * do Conexões IAH não fazem parte desta candidata.
 */
export * from "./domain/entities";
export * from "./domain/knowledge-sources";
export * from "./domain/provider";

export { CATALOG_DISCIPLINES } from "./infrastructure/catalog/curriculum-catalog";
export { IAH_AXES, getIahAxisById } from "./infrastructure/catalog/iah-axes";
export { getCurriculumConnectionProvider } from "./infrastructure/providers/provider-factory";
