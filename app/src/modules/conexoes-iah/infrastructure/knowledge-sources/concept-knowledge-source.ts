import type { ConceptEntry } from "../../domain/entities";
import type { ConceptKnowledgeSource, RetrievalMatch, RetrievalQuery } from "../../domain/knowledge-sources";
import { CONCEPT_LIBRARY } from "../catalog/concept-library.ts";
import { getReferencesByIds } from "../catalog/references.ts";
import { scoreTermAgainstCandidates } from "./normalize.ts";

const MIN_SCORE = 0.25;

export function createConceptKnowledgeSource(): ConceptKnowledgeSource {
  return {
    async search(query: RetrievalQuery): Promise<RetrievalMatch<ConceptEntry>[]> {
      const matches: RetrievalMatch<ConceptEntry>[] = [];

      for (const entry of CONCEPT_LIBRARY) {
        const score = scoreTermAgainstCandidates(query.normalizedTerm, [entry.concept, ...entry.keywords]);
        if (score < MIN_SCORE) continue;
        matches.push({
          item: entry,
          score,
          reference: getReferencesByIds(entry.referenceIds)[0] ?? null,
        });
      }

      return matches.sort((a, b) => b.score - a.score);
    },
  };
}
