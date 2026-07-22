import type { CurriculumCatalogEntry } from "../../domain/entities";
import type { CurriculumKnowledgeSource, RetrievalMatch, RetrievalQuery } from "../../domain/knowledge-sources";
import { CURRICULUM_CATALOG, listCurriculumTopics } from "../catalog/curriculum-catalog.ts";
import { getReferencesByIds } from "../catalog/references.ts";
import { scoreTermAgainstCandidates } from "./normalize.ts";

const MIN_SCORE = 0.25;

export function createCurriculumKnowledgeSource(): CurriculumKnowledgeSource {
  return {
    async listTopics(disciplineSlug, educationLevel, grade) {
      return listCurriculumTopics(disciplineSlug, educationLevel, grade);
    },

    async search(query: RetrievalQuery): Promise<RetrievalMatch<CurriculumCatalogEntry>[]> {
      const matches: RetrievalMatch<CurriculumCatalogEntry>[] = [];

      for (const entry of CURRICULUM_CATALOG) {
        let score = scoreTermAgainstCandidates(query.normalizedTerm, [entry.topic, ...entry.concepts]);
        if (score < MIN_SCORE) continue;

        if (query.disciplineSlug && entry.disciplineSlug === query.disciplineSlug) score = Math.min(1, score + 0.1);
        if (query.educationLevel && entry.educationLevel === query.educationLevel) score = Math.min(1, score + 0.05);
        if (query.grade && entry.grade === query.grade) score = Math.min(1, score + 0.05);

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
