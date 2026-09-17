/**
 * Normalização e casamento de termos — a única lógica de "matching" do
 * MVP. Genérica por design: nenhuma fonte de conhecimento compara o
 * termo do professor contra um valor literal (`=== "mais-valia"`), só
 * contra listas de dados (`keywords`/`concepts`) usando as funções
 * abaixo. Trocar o catálogo nunca exige tocar este arquivo.
 */

/** minúsculas, sem acento, espaços colapsados — chave de comparação em todo o módulo. */
export function normalizeTerm(term: string): string {
  return term
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function tokenize(normalized: string): string[] {
  return normalized.split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Score de relevância em [0, 1] entre um termo normalizado e uma lista
 * de candidatos normalizáveis (conceitos/palavras-chave de um registro
 * do catálogo). 1 = igualdade exata; ~0.75 = substring; proporcional =
 * sobreposição de tokens; 0 = nenhuma relação.
 */
export function scoreTermAgainstCandidates(normalizedTerm: string, candidates: string[]): number {
  if (!normalizedTerm) return 0;
  let best = 0;
  const termTokens = new Set(tokenize(normalizedTerm));

  for (const raw of candidates) {
    const candidate = normalizeTerm(raw);
    if (!candidate) continue;

    if (candidate === normalizedTerm) {
      best = Math.max(best, 1);
      continue;
    }
    if (candidate.includes(normalizedTerm) || normalizedTerm.includes(candidate)) {
      best = Math.max(best, 0.75);
      continue;
    }
    const candidateTokens = tokenize(candidate);
    if (candidateTokens.length === 0) continue;
    const overlap = candidateTokens.filter((token) => termTokens.has(token)).length;
    if (overlap > 0) {
      const ratio = overlap / Math.max(candidateTokens.length, termTokens.size || 1);
      best = Math.max(best, ratio * 0.6);
    }
  }
  return Math.min(best, 1);
}
