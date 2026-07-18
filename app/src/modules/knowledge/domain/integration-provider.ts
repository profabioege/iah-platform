/**
 * Contratos de integração externa do Knowledge Engine — SÓ CONTRATOS,
 * nenhuma chamada de rede implementada (mesmo padrão D-019 usado em
 * `modules/integrations`). Prepara a arquitetura para as 7 integrações
 * futuras pedidas pela Sprint M11, sem depender de nenhuma delas hoje.
 */

import type { KnowledgeDocument, KnowledgeSourceKind } from "./entities";

/** As integrações futuras previstas — mesmos valores de `KnowledgeSourceKind`, exceto "manual". */
export type KnowledgeIntegrationId = Exclude<KnowledgeSourceKind, "manual">;

export interface KnowledgeImportResult {
  documents: KnowledgeDocument[];
}

export interface KnowledgeIntegrationProvider {
  readonly id: KnowledgeIntegrationId;
  readonly isConfigured: boolean;
  /** Importa recursos da origem externa a partir de uma consulta (ex.: termo, DOI, pasta). */
  importFrom(query: string): Promise<KnowledgeImportResult>;
}

/** Stub (padrão D-019): fixa o contrato; lança se chamado. */
function notConfiguredProvider(id: KnowledgeIntegrationId): KnowledgeIntegrationProvider {
  return {
    id,
    isConfigured: false,
    async importFrom() {
      throw new Error(
        `Integração "${id}" ainda não está disponível — esta Sprint criou ` +
          "apenas o contrato (docs/KNOWLEDGE_ENGINE.md, DECISIONS.md D-034).",
      );
    },
  };
}

/** Um stub por integração prevista — nenhuma chamada de rede existe. */
export const knowledgeIntegrationProviders: Record<
  KnowledgeIntegrationId,
  KnowledgeIntegrationProvider
> = {
  notebooklm: notConfiguredProvider("notebooklm"),
  google_drive: notConfiguredProvider("google_drive"),
  google_docs: notConfiguredProvider("google_docs"),
  youtube: notConfiguredProvider("youtube"),
  openalex: notConfiguredProvider("openalex"),
  scielo: notConfiguredProvider("scielo"),
  crossref: notConfiguredProvider("crossref"),
};
