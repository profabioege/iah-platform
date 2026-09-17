import type { IahConnectionEntry } from "../../domain/entities";
import type { IahConnectionKnowledgeSource, RetrievalMatch } from "../../domain/knowledge-sources";
import { IAH_CONNECTIONS } from "../catalog/iah-connections.ts";
import { getReferencesByIds } from "../catalog/references.ts";
import { normalizeTerm, scoreTermAgainstCandidates } from "./normalize.ts";

const MIN_SCORE = 0.3;

export function createIahConnectionKnowledgeSource(): IahConnectionKnowledgeSource {
  return {
    async searchByConceptKeywords(conceptKeywords: string[]): Promise<RetrievalMatch<IahConnectionEntry>[]> {
      const normalizedKeywords = conceptKeywords.map(normalizeTerm).filter(Boolean);
      if (normalizedKeywords.length === 0) return [];

      const matches: RetrievalMatch<IahConnectionEntry>[] = [];

      for (const entry of IAH_CONNECTIONS) {
        let best = 0;
        for (const keyword of normalizedKeywords) {
          best = Math.max(best, scoreTermAgainstCandidates(keyword, entry.conceptKeywords));
        }
        if (best < MIN_SCORE) continue;

        matches.push({
          item: entry,
          score: best,
          reference: getReferencesByIds(entry.referenceIds)[0] ?? null,
        });
      }

      return matches.sort((a, b) => b.score - a.score);
    },
  };
}
