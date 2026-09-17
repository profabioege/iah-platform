import { EDUCATION_LEVEL_LABEL } from "../../domain/entities.ts";
import type {
  AmbiguousInterpretation,
  CorrelatedLessonContent,
  IdentifiedContextSnapshot,
  KnowledgeReference,
  SelectedConnection,
} from "../../domain/entities";
import type {
  CurriculumConnectionProvider,
  GenerateCorrelatedLessonInput,
  GenerateCorrelatedLessonResult,
  IdentifyConceptContextInput,
  IdentifyConceptContextResult,
  SuggestIahConnectionsInput,
  SuggestIahConnectionsResult,
} from "../../domain/provider";
import { getIahAxisById } from "../catalog/iah-axes.ts";
import { getReferencesByIds } from "../catalog/references.ts";
import { createConexoesKnowledgeSources } from "../knowledge-sources/index.ts";
import { normalizeTerm } from "../knowledge-sources/normalize.ts";

const RELIABLE_MATCH_THRESHOLD = 0.5;
const AMBIGUITY_WINDOW = 0.15;
const MAX_AMBIGUOUS_INTERPRETATIONS = 3;

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

/**
 * Provedor demonstrativo, local e determinístico (decisão do MVP) —
 * consulta as quatro fontes de conhecimento e sintetiza os resultados
 * por regras, sem chamar nenhum LLM. Uma implementação futura pode
 * delegar a redação final a um provedor real, mantendo este contrato.
 */
export const demoCurriculumConnectionProvider: CurriculumConnectionProvider = {
  async identifyConceptContext(input: IdentifyConceptContextInput): Promise<IdentifyConceptContextResult> {
    const sources = createConexoesKnowledgeSources();
    const normalizedTerm = normalizeTerm(input.term);
    const query = {
      term: input.term,
      normalizedTerm,
      disciplineSlug: input.disciplineSlug,
      educationLevel: input.educationLevel,
      grade: input.grade,
    };

    const [conceptMatches, curriculumMatches] = await Promise.all([
      sources.concept.search(query),
      sources.curriculum.search(query),
    ]);

    const references: KnowledgeReference[] = [];
    const relatedAreas: string[] = [];
    const associatedConcepts: string[] = [];
    let curricularContext: string | null = null;

    const topConcept = conceptMatches[0]?.item ?? null;
    const topCurriculum = curriculumMatches[0]?.item ?? null;

    if (topConcept) {
      relatedAreas.push(...topConcept.areas);
      associatedConcepts.push(...topConcept.relatedConcepts);
      curricularContext = topConcept.contexts.slice(0, 2).join(" · ");
      references.push(...getReferencesByIds(topConcept.referenceIds));
    }
    if (topCurriculum) {
      relatedAreas.push(topCurriculum.disciplineName);
      associatedConcepts.push(...topCurriculum.concepts.filter((c) => c !== normalizedTerm));
      if (!curricularContext) curricularContext = topCurriculum.topic;
      references.push(...getReferencesByIds(topCurriculum.referenceIds));
    }

    const bestScore = Math.max(conceptMatches[0]?.score ?? 0, curriculumMatches[0]?.score ?? 0);

    const ambiguousInterpretations: AmbiguousInterpretation[] = conceptMatches
      .filter((match) => match.score >= bestScore - AMBIGUITY_WINDOW && match.item.id !== topConcept?.id)
      .slice(0, MAX_AMBIGUOUS_INTERPRETATIONS - 1)
      .map((match) => ({
        label: match.item.concept,
        description: match.item.areas.join(" · "),
      }));
    if (topConcept && ambiguousInterpretations.length > 0) {
      ambiguousInterpretations.unshift({ label: topConcept.concept, description: topConcept.areas.join(" · ") });
    }

    const context: IdentifiedContextSnapshot = {
      term: input.term,
      normalizedTerm,
      matchedConceptIds: conceptMatches.slice(0, 5).map((match) => match.item.id),
      relatedAreas: uniq(relatedAreas),
      curricularContext,
      associatedConcepts: uniq(associatedConcepts).slice(0, 6),
      confidence: bestScore,
      ambiguousInterpretations: ambiguousInterpretations.slice(0, MAX_AMBIGUOUS_INTERPRETATIONS),
      hasReliableMatch: bestScore >= RELIABLE_MATCH_THRESHOLD && (Boolean(topConcept) || Boolean(topCurriculum)),
    };

    return { context, references: dedupeReferences(references) };
  },

  async suggestIahConnections(input: SuggestIahConnectionsInput): Promise<SuggestIahConnectionsResult> {
    const sources = createConexoesKnowledgeSources();
    const { context, limit } = input;

    if (!context.hasReliableMatch) {
      return { connections: [], references: [] };
    }

    const keywordCandidates = uniq([context.normalizedTerm, context.term, ...context.associatedConcepts]);

    const matches = await sources.iahConnection.searchByConceptKeywords(keywordCandidates);
    const top = matches.slice(0, Math.max(0, limit));

    const connections: SelectedConnection[] = top.map((match) => ({
      sourceConnectionEntryId: match.item.id,
      title: match.item.title,
      rationale: match.item.rationale,
      investigativeQuestion: match.item.investigativeQuestion,
      iahAxisId: match.item.iahAxisId,
      pedagogicalApproach: match.item.suggestedActivity,
      referenceIds: match.item.referenceIds,
      confidence: Math.min(1, match.score * 0.5 + match.item.confidence * 0.5),
      custom: false,
    }));

    const references = dedupeReferences(top.flatMap((match) => getReferencesByIds(match.item.referenceIds)));

    return { connections, references };
  },

  async generateCorrelatedLesson(input: GenerateCorrelatedLessonInput): Promise<GenerateCorrelatedLessonResult> {
    const primary = input.selectedConnections[0] ?? null;
    const secondary = input.selectedConnections[1] ?? null;
    const axisNames = uniq(
      input.selectedConnections.map((connection) => getIahAxisById(connection.iahAxisId)?.name ?? connection.iahAxisId),
    );

    const conceptLabel = input.sourceConcept ?? input.sourceTopic;
    const title = primary
      ? `${conceptLabel}: ${primary.title}`
      : `${conceptLabel} e Inteligência Artificial & Humanidades`;

    const connectionWithIah = input.selectedConnections.length
      ? input.selectedConnections.map((c) => `${c.title} (${getIahAxisById(c.iahAxisId)?.name ?? c.iahAxisId})`).join(" + ")
      : `Conexão com ${axisNames.join(" e ") || "Inteligência Artificial & Humanidades"}`;

    const pedagogicalRationale = input.selectedConnections.length
      ? input.selectedConnections.map((c) => c.rationale).join(" ")
      : `Relaciona ${conceptLabel}, trabalhado em ${input.sourceSubjectName}, a problemas contemporâneos de Inteligência Artificial & Humanidades.`;

    const guidingQuestion =
      input.guidingQuestion.trim() ||
      primary?.investigativeQuestion ||
      primary?.rationale ||
      `O que ${conceptLabel} nos ajuda a entender sobre Inteligência Artificial hoje?`;

    const references = dedupeReferences(getReferencesByIds(input.selectedConnections.flatMap((c) => c.referenceIds)));

    const essentialConcepts = uniq([
      ...(input.sourceConcept ? [input.sourceConcept] : []),
      ...input.context.associatedConcepts,
    ]).slice(0, 6);

    const warnings = [
      "Conteúdo gerado pelo motor demonstrativo de Conexões IAH (sem provedor de IA externo conectado) — revise a precisão conceitual e a adequação à sua turma antes de usar.",
      "Duração sugerida como padrão de 50 minutos — ajuste conforme sua grade horária.",
    ];
    if (input.selectedConnections.length === 0) {
      warnings.push("Nenhuma conexão específica foi selecionada — a aula foi montada a partir do contexto identificado, de forma mais genérica.");
    }

    const lesson: CorrelatedLessonContent = {
      title,
      sourceDisciplineAndTopic: `${input.sourceSubjectName} · ${input.grade} · ${input.sourceTopic}`,
      connectionWithIah,
      pedagogicalRationale,
      guidingQuestion,
      learningObjectives: [
        `Compreender ${conceptLabel} a partir do contexto de ${input.sourceSubjectName}.`,
        `Relacionar ${conceptLabel} a um problema contemporâneo de Inteligência Artificial & Humanidades.`,
        ...(secondary ? [`Explorar a conexão entre ${primary?.title ?? conceptLabel} e ${secondary.title}.`] : []),
      ],
      essentialConcepts,
      priorKnowledge: [`Noções básicas de ${input.sourceSubjectName} sobre ${input.sourceTopic}.`],
      durationMinutes: 50,
      initialMobilization: `Apresente a pergunta norteadora à turma: "${guidingQuestion}" — registre as primeiras impressões sem corrigi-las ainda.`,
      contextualization: `Retome brevemente o que a turma já sabe sobre ${input.sourceTopic} em ${input.sourceSubjectName}, situando ${conceptLabel} nesse contexto.`,
      investigationOrExperiment: primary
        ? primary.pedagogicalApproach
        : `Investigação orientada relacionando ${conceptLabel} a exemplos atuais de Inteligência Artificial.`,
      studentProduction: `Em grupos, os alunos registram como ${conceptLabel} se manifesta no exemplo contemporâneo discutido, respondendo à pergunta norteadora.`,
      socialization: "Cada grupo compartilha sua conclusão com a turma, destacando um ponto de concordância e um de divergência entre os grupos.",
      synthesis: `Retomada coletiva da pergunta norteadora, sistematizando como ${conceptLabel} ajuda a interpretar o problema contemporâneo discutido.`,
      assessmentCriteria: [
        "Relaciona corretamente o conceito de origem ao problema contemporâneo discutido.",
        "Argumenta com pelo menos uma evidência concreta levantada na investigação.",
        "Participa da socialização de forma respeitosa e fundamentada.",
      ],
      requiredMaterials: ["Quadro ou projetor", "Roteiro impresso ou digital da investigação", "Dispositivo com acesso à internet (opcional, para pesquisa)"],
      teacherGuidance: `Nível: ${EDUCATION_LEVEL_LABEL[input.educationLevel]}. Revise os conceitos de ${input.sourceSubjectName} envolvidos antes da aula; a conexão com IA & Humanidades é um ponto de partida investigativo, não uma resposta fechada.`,
      possibleDifficulties: [
        `Alunos podem confundir ${conceptLabel} com sua aplicação contemporânea — reforce a diferença entre o conceito original e a analogia proposta.`,
        "A discussão pode polarizar rapidamente — reserve tempo para ouvir posições divergentes antes da síntese.",
      ],
      interdisciplinaryExtensions: input.context.relatedAreas.length
        ? [`Aprofundar com ${input.context.relatedAreas.filter((a) => a !== input.sourceSubjectName).join(", ") || "outras áreas relacionadas"}.`]
        : [],
      references,
      warnings,
    };

    return { lesson };
  },
};

function dedupeReferences(references: KnowledgeReference[]): KnowledgeReference[] {
  const seen = new Set<string>();
  const result: KnowledgeReference[] = [];
  for (const reference of references) {
    if (seen.has(reference.id)) continue;
    seen.add(reference.id);
    result.push(reference);
  }
  return result;
}
