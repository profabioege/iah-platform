/**
 * Porto de busca na web do IAH AI Gateway. Um único ciclo de busca —
 * sem navegação autônoma, sem múltiplos ciclos (ver `gateway.ts`).
 * Nesta etapa nenhum provedor real está configurado; `search()` sempre
 * devolve `configured: false` e resultado vazio, nunca fingindo uma
 * busca que não aconteceu (D-016).
 */

export interface WebSearchQuery {
  subject: string;
  grade: string;
  topic: string;
}

export interface WebSearchResult {
  title: string;
  summary: string;
  url: string;
  /** Data de publicação, quando disponível — nunca inventada. */
  publishedAt: string | null;
}

export interface WebSearchResponse {
  results: WebSearchResult[];
  /** `false` quando nenhum provedor real está ligado — a UI mostra isso ao professor. */
  configured: boolean;
}

export interface WebSearchProvider {
  readonly isConfigured: boolean;
  search(query: WebSearchQuery): Promise<WebSearchResponse>;
}

/** Nenhum provedor de busca real configurado nesta etapa (Tavily/Serper/Bing) — interface pronta, sem chamada externa. */
export const notConfiguredWebSearchProvider: WebSearchProvider = {
  isConfigured: false,
  async search() {
    return { results: [], configured: false };
  },
};
