import { getAuthMode } from "@/lib/auth-flags";

import type { AssessmentRepositories } from "../domain/repositories";
import { createSeedAssessmentRepositories } from "./seed/seed-repositories";

declare global {
  var __iahAssessmentSeedRepositories: AssessmentRepositories | undefined;
}

/**
 * Candidata de apresentação: a sondagem diagnóstica existe apenas no modo
 * `demo`, sobre o repositório seed em memória do servidor (dados fictícios).
 * O repositório Supabase e suas migrations não fazem parte desta candidata —
 * fora do modo demo a fábrica recusa, em vez de cair silenciosamente no seed.
 */
export function getDefaultAssessmentRepositories(): AssessmentRepositories {
  if (getAuthMode() !== "demo") {
    throw new Error("A sondagem diagnóstica está disponível apenas no ambiente de demonstração.");
  }
  globalThis.__iahAssessmentSeedRepositories ??= createSeedAssessmentRepositories();
  return globalThis.__iahAssessmentSeedRepositories;
}
