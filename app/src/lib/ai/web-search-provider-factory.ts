import { notConfiguredWebSearchProvider, type WebSearchProvider } from "./web-search-provider";

/**
 * Provedor de busca em uso pelo Gateway — hoje nenhum está configurado
 * (decisão da Fase 0). Trocar por Tavily/Serper/Bing é mudar só esta
 * função.
 */
export function getWebSearchProvider(): WebSearchProvider {
  return notConfiguredWebSearchProvider;
}
