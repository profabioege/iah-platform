import type { AsyncJob } from "./entities";

export interface ClaimCandidateQuery {
  capabilities: string[];
  now: string;
}

/**
 * Regra de elegibilidade e ordenação do claim — a mesma implementada em
 * SQL pela função `iah_claim_next_job` (migration 0007). Mantida também
 * aqui, em JS puro, só para permitir testar a ordenação sem banco.
 *
 * A atomicidade real (SELECT ... FOR UPDATE SKIP LOCKED, impedir que dois
 * workers reivindiquem a mesma linha sob concorrência) existe apenas do
 * lado do Postgres e não é — nem pode ser — exercitada por este teste
 * unitário.
 */
export function selectClaimCandidate(
  jobs: readonly AsyncJob[],
  query: ClaimCandidateQuery,
): AsyncJob | null {
  const eligible = jobs.filter(
    (job) =>
      job.status === "queued" &&
      job.availableAt <= query.now &&
      job.attempts < job.maxAttempts &&
      query.capabilities.includes(job.capability),
  );

  if (eligible.length === 0) return null;

  const [first] = [...eligible].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.availableAt !== b.availableAt) {
      return a.availableAt < b.availableAt ? -1 : 1;
    }
    if (a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? -1 : 1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return first;
}
