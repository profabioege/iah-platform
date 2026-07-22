import type { ConexoesKnowledgeSources } from "../../domain/knowledge-sources";
import { createConceptKnowledgeSource } from "./concept-knowledge-source.ts";
import { createCurriculumKnowledgeSource } from "./curriculum-knowledge-source.ts";
import { createIahConnectionKnowledgeSource } from "./iah-connection-knowledge-source.ts";
import { createInstitutionalKnowledgeSource } from "./institutional-knowledge-source.ts";

export function createConexoesKnowledgeSources(): ConexoesKnowledgeSources {
  return {
    curriculum: createCurriculumKnowledgeSource(),
    concept: createConceptKnowledgeSource(),
    iahConnection: createIahConnectionKnowledgeSource(),
    institutional: createInstitutionalKnowledgeSource(),
  };
}

export { normalizeTerm, scoreTermAgainstCandidates } from "./normalize.ts";
