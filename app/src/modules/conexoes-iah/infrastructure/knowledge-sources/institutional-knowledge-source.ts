import type { InstitutionalKnowledgeSource } from "../../domain/knowledge-sources";

/**
 * Nenhuma fonte institucional (currículo próprio, planejamento, material
 * didático, arquivos anexados) está conectada nesta etapa do MVP — a
 * implementação demonstrativa retorna sempre vazio, honestamente, em vez
 * de inventar contexto institucional que não existe. Pronta para, no
 * futuro, consultar `modules/knowledge`/`modules/curriculum` reais.
 */
export function createInstitutionalKnowledgeSource(): InstitutionalKnowledgeSource {
  return {
    async search() {
      return [];
    },
  };
}
