/**
 * Classificação de tópicos de uma `KnowledgeDocumentUnit` — puramente
 * estrutural: deriva o(s) tópico(s) do próprio título de
 * capítulo/seção/subseção do documento, nunca de uma taxonomia externa
 * nem de uma leitura semântica do texto (que exigiria IA e não é
 * permitida nesta Micro Missão).
 *
 * Isso é uma limitação deliberada e documentada, não um atalho: um
 * trecho sobre "privacidade" que apareça fora de uma seção com esse
 * nome não será marcado com esse tópico. Ver
 * docs/product/mec-referencial-ia-2026-integration.md, "Fase 7".
 */

const COMBINING_DIACRITICAL_MARKS = /[̀-ͯ]/g;

/** "3.2.1 Integração dos modelos de IA à concepção educacional brasileira" -> "integracao-dos-modelos-de-ia-a-concepcao-educacional-brasileira" */
export function slugifyHeading(heading: string): string {
  const withoutLeadingNumber = heading.replace(/^[\d.]+\s*/, "");
  return withoutLeadingNumber
    .normalize("NFD")
    .replace(COMBINING_DIACRITICAL_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Deriva os tópicos de uma unidade a partir da sua própria hierarquia
 * de headings (capítulo, seção, subseção) — deduplicados, na ordem
 * capítulo -> seção -> subseção, ignorando níveis ausentes.
 */
export function deriveStructuralTopics(
  headings: Array<string | null>,
): string[] {
  const slugs = headings
    .filter((heading): heading is string => Boolean(heading && heading.trim()))
    .map(slugifyHeading)
    .filter((slug) => slug.length > 0);
  return Array.from(new Set(slugs));
}
