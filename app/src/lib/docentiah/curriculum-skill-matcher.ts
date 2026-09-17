import type { CurriculumRepositories } from "../../modules/curriculum/domain/curriculum-repository.ts";
import type { CurriculumTheme, Discipline } from "../../modules/curriculum/domain/entities.ts";
import type { CurriculumSkillSuggestion } from "../../modules/docentiah/domain/lesson-planning-brief.ts";

/**
 * Sugestão de até 3 habilidades curriculares para o Planejador
 * Conversacional — consulta só `modules/curriculum` (fonte real e
 * versionada, D-034/M14). Nunca inventa `code`: quando o Tema
 * encontrado não tem `bnccCompetencies` preenchido, a sugestão usa os
 * `objectives` reais do Tema, documentados como tal (nunca como BNCC).
 * Sem correspondência segura, devolve lista vazia — quem chama mostra a
 * mensagem honesta de ausência.
 *
 * Duplicação mínima e intencional de normalize/score (mesmo padrão já
 * adotado em `modules/conexoes-iah/infrastructure/knowledge-sources/normalize.ts`)
 * — evita acoplar dois módulos de feature independentes por um utilitário.
 */

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function tokenize(text: string): string[] {
  return text.split(/[^a-z0-9]+/).filter(Boolean);
}

function score(term: string, candidate: string): number {
  const normTerm = normalize(term);
  const normCandidate = normalize(candidate);
  if (!normTerm || !normCandidate) return 0;
  if (normCandidate === normTerm) return 1;
  if (normCandidate.includes(normTerm) || normTerm.includes(normCandidate)) return 0.75;
  const candidateTokens = tokenize(normCandidate);
  const termTokens = new Set(tokenize(normTerm));
  const overlap = candidateTokens.filter((token) => termTokens.has(token)).length;
  if (overlap === 0 || candidateTokens.length === 0) return 0;
  return Math.min((overlap / candidateTokens.length) * 0.6, 1);
}

const MATCH_THRESHOLD = 0.4;
const MAX_SUGGESTIONS = 3;

export interface FindCurriculumSkillsInput {
  subject?: string;
  topic?: string;
  specificConcept?: string;
}

export async function findCurriculumSkillSuggestions(
  repositories: CurriculumRepositories,
  input: FindCurriculumSkillsInput,
): Promise<CurriculumSkillSuggestion[]> {
  if (!input.topic) return [];

  const disciplines = await repositories.disciplines.list();
  const matchingDisciplines = input.subject
    ? disciplines.filter((d) => score(input.subject!, d.name) >= MATCH_THRESHOLD)
    : disciplines;
  const disciplinesToSearch: Discipline[] = matchingDisciplines.length > 0 ? matchingDisciplines : disciplines;

  const searchTerm = input.specificConcept ? `${input.topic} ${input.specificConcept}` : input.topic;

  const scoredThemes: Array<{ theme: CurriculumTheme; confidence: number; matchReason: string }> = [];
  for (const discipline of disciplinesToSearch) {
    const units = await repositories.units.listByDiscipline(discipline.id);
    for (const unit of units) {
      const themes = await repositories.themes.listByUnit(unit.id);
      for (const theme of themes) {
        const labelScore = score(searchTerm, theme.label);
        const objectivesScore = Math.max(0, ...theme.objectives.map((o) => score(searchTerm, o)));
        const best = Math.max(labelScore, objectivesScore);
        if (best >= MATCH_THRESHOLD) {
          scoredThemes.push({
            theme,
            confidence: best,
            matchReason: labelScore >= objectivesScore ? `Tema "${theme.label}" corresponde ao conteúdo informado.` : `Um objetivo do tema "${theme.label}" corresponde ao conteúdo informado.`,
          });
        }
      }
    }
  }

  scoredThemes.sort((a, b) => b.confidence - a.confidence);

  const suggestions: CurriculumSkillSuggestion[] = [];
  for (const { theme, confidence, matchReason } of scoredThemes) {
    if (suggestions.length >= MAX_SUGGESTIONS) break;
    if (theme.bnccCompetencies.length > 0) {
      for (const competency of theme.bnccCompetencies) {
        if (suggestions.length >= MAX_SUGGESTIONS) break;
        suggestions.push({
          id: `${theme.id}-bncc-${suggestions.length}`,
          code: null,
          description: competency,
          document: "BNCC (referência do Currículo Institucional)",
          version: String(theme.version),
          matchReason,
          confidence,
        });
      }
    } else if (theme.objectives.length > 0) {
      suggestions.push({
        id: `${theme.id}-objective`,
        code: null,
        description: theme.objectives[0],
        document: "Objetivo do Currículo Institucional",
        version: String(theme.version),
        matchReason,
        confidence,
      });
    }
  }

  return suggestions.slice(0, MAX_SUGGESTIONS);
}
