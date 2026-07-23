import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from "../llm-provider";
import type { DocentiahImproveContextInput } from "../prompts/docentiah/improve-context/schema.ts";
import type { DocentiahSlidesEnrichedContext } from "../prompts/docentiah/slides/v1";
import {
  DETAIL_LEVEL_LABEL,
  METHODOLOGY_LABEL,
  type DocentiahSlide,
  type DocentiahSlidesGenerationInput,
  type DocentiahSlidesGenerationOutput,
} from "../prompts/docentiah/slides/schema.ts";

/**
 * Provedor demonstrativo do IAH AI Gateway — sem chamada externa
 * (decisão confirmada, Fase 0). Não é um stub que lança erro (padrão
 * `ipeNotConfigured`): gera conteúdo de verdade, por regras
 * determinísticas, para o wizard funcionar ponta a ponta. Trocar por
 * um provedor real (OpenAI/Anthropic/Google) é só implementar
 * `LlmProvider` de novo — nada na UI ou no Gateway muda.
 */
export const demoLlmProvider: LlmProvider = {
  name: "IAH Demo Engine",
  model: "docentiah-demo-v1",
  isConfigured: true,
  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    if (request.capability === "docentiah.generate_slides") {
      const output = generateSlidesFromInput(
        request.structuredInput as DocentiahSlidesGenerationInput,
        request.structuredContext as DocentiahSlidesEnrichedContext,
      );
      return { raw: JSON.stringify(output), provider: "iah-demo", model: "docentiah-demo-v1" };
    }
    if (request.capability === "docentiah.improve_context") {
      const input = request.structuredInput as DocentiahImproveContextInput;
      const output = improveContextDemo(input.text);
      return { raw: JSON.stringify(output), provider: "iah-demo", model: "docentiah-demo-v1" };
    }
    throw new Error(`Capacidade não suportada pelo provedor demonstrativo: ${request.capability}`);
  },
};

/**
 * O motor demonstrativo não interpreta o prompt em linguagem natural
 * (não é um LLM de verdade) — por isso `generateSlidesFromInput` é
 * chamado diretamente pelo provedor com o input estruturado original,
 * em vez de tentar reconstruir o input a partir do texto do prompt.
 */
export function generateSlidesFromInput(
  input: DocentiahSlidesGenerationInput,
  context: DocentiahSlidesEnrichedContext,
): DocentiahSlidesGenerationOutput {
  const slideCount = Math.max(3, input.slideCount);
  const detail = input.detailLevel;
  const bulletsPerSlide = detail === "sintetico" ? 2 : detail === "aprofundado" ? 4 : 3;

  const references: DocentiahSlidesGenerationOutput["references"] = [];
  if (input.includeReferences) {
    for (const [index, result] of context.webResults.entries()) {
      references.push({ id: `web-${index + 1}`, title: result.title, url: result.url });
    }
    if (context.pdfText) {
      references.push({ id: "pdf-1", title: "Material anexado pelo professor (PDF)", url: null });
    }
  }
  const pdfReferenceIds = input.includeReferences && context.pdfText ? ["pdf-1"] : [];
  const webReferenceIds =
    input.includeReferences && context.webResults.length > 0
      ? context.webResults.map((_, index) => `web-${index + 1}`)
      : [];

  const slides: DocentiahSlide[] = [];
  slides.push(openingSlide(input, bulletsPerSlide));

  const middleCount = slideCount - 2;
  const reflectionOffset = Math.max(1, Math.floor(middleCount / 2));
  for (let i = 0; i < middleCount; i++) {
    const number = slides.length + 1;
    if (i === reflectionOffset) {
      slides.push(reflectionSlide(input, number, bulletsPerSlide));
    } else {
      const isFirstOrLastContent = i === 0 || i === middleCount - 1;
      slides.push(
        contentSlide(input, number, i, bulletsPerSlide, {
          sourceReferenceIds: isFirstOrLastContent ? [...webReferenceIds, ...pdfReferenceIds] : [],
        }),
      );
    }
  }
  slides.push(closingSlide(input, slides.length + 1, bulletsPerSlide));

  const warnings = [
    "Conteúdo gerado pelo motor demonstrativo do DocentIAH (sem provedor de IA externo conectado) — revise a precisão conceitual antes de usar.",
  ];
  if (context.pdfTruncated) {
    warnings.push("O conteúdo do PDF anexado foi truncado ao orçamento de contexto — algumas partes do documento podem não ter sido consideradas.");
  }
  if (input.webSearchEnabled && !context.webSearchConfigured) {
    warnings.push("A busca na web foi ativada, mas nenhum provedor real está configurado nesta etapa — nenhuma fonte externa foi consultada.");
  }

  return {
    title: capitalize(input.topic),
    subtitle: input.methodology ? METHODOLOGY_LABEL[input.methodology] : null,
    subject: input.subject,
    grade: input.grade,
    estimatedDurationMinutes: input.lessonDurationMinutes,
    learningObjectives: input.learningObjectives
      ? input.learningObjectives.split(/\n+/).map((line) => line.trim()).filter(Boolean)
      : [`Compreender os principais aspectos de ${input.topic}.`],
    methodology: input.methodology ? METHODOLOGY_LABEL[input.methodology] : null,
    slides,
    closingActivity: input.includeClosingActivity
      ? `Em duplas ou pequenos grupos, os alunos aplicam o que discutiram sobre "${input.topic}" a uma situação concreta trazida por eles, e compartilham em 2 minutos com a turma.`
      : null,
    teacherGuidance: input.includeTeacherNotes
      ? `Nível: ${DETAIL_LEVEL_LABEL[detail]}. Ajuste o ritmo conforme o repertório prévio da turma${input.studentProfile ? ` — contexto informado: ${input.studentProfile}.` : "."}`
      : null,
    references,
    warnings,
  };
}

function openingSlide(input: DocentiahSlidesGenerationInput, bullets: number): DocentiahSlide {
  return {
    number: 1,
    title: `${capitalize(input.topic)} — por onde começar?`,
    purpose: "Abertura — mobiliza a turma com uma pergunta que ainda não tem resposta fechada.",
    studentContent: [
      `Hoje vamos investigar: ${input.topic.toLowerCase()}.`,
      "O que você já sabe sobre isso? O que gostaria de entender melhor?",
      ...(bullets > 2 ? ["Ao final da aula, vamos voltar a essa pergunta com mais clareza."] : []),
    ].slice(0, bullets),
    keyConcepts: extractKeyTerms(input.topic),
    example: null,
    visualSuggestion: "Uma imagem ou pergunta em destaque, sem texto excessivo, para abrir a discussão.",
    teacherNotes: "Deixe a pergunta em aberto — a turma retoma essa questão no slide final.",
    sourceReferenceIds: [],
  };
}

const CONTENT_ARCHETYPES = [
  { label: "O que é", body: (topic: string) => `Definição central de ${topic}, nos termos que a turma já conhece.` },
  { label: "Como funciona", body: (topic: string) => `O mecanismo ou processo por trás de ${topic}.` },
  { label: "Na prática", body: (topic: string) => `Um exemplo concreto de ${topic} aplicado ao cotidiano.` },
  { label: "Por que importa", body: (topic: string) => `A relevância de ${topic} para além da sala de aula.` },
  { label: "Limites e cuidados", body: (topic: string) => `O que ${topic} não resolve, ou onde exige mais cautela.` },
] as const;

function contentSlide(
  input: DocentiahSlidesGenerationInput,
  number: number,
  index: number,
  bullets: number,
  extra: { sourceReferenceIds: string[] },
): DocentiahSlide {
  const archetype = CONTENT_ARCHETYPES[index % CONTENT_ARCHETYPES.length];
  return {
    number,
    title: `${archetype.label}: ${capitalize(input.topic)}`,
    purpose: "Progressão conceitual — constrói o entendimento passo a passo.",
    studentContent: [
      archetype.body(input.topic.toLowerCase()),
      `Relacione com o que já vimos até aqui sobre ${input.subject.toLowerCase()}.`,
      ...(bullets > 2 ? [`Pergunta para a turma: como isso aparece no dia a dia de vocês?`] : []),
      ...(bullets > 3 ? [`Registre uma dúvida ou observação antes de avançar.`] : []),
    ].slice(0, bullets),
    keyConcepts: extractKeyTerms(input.topic),
    example: `Situação real ou hipotética que ilustra "${archetype.label.toLowerCase()}" para ${input.topic.toLowerCase()}.`,
    visualSuggestion: "Um esquema simples ou imagem que apoie o conceito, sem poluir o slide.",
    teacherNotes: input.includeTeacherNotes
      ? `Verifique se a turma acompanha antes de seguir — este é um dos conceitos centrais da aula.`
      : null,
    sourceReferenceIds: extra.sourceReferenceIds,
  };
}

function reflectionSlide(
  input: DocentiahSlidesGenerationInput,
  number: number,
  bullets: number,
): DocentiahSlide {
  return {
    number,
    title: "Pausa para pensar",
    purpose: "Momento de participação — a turma reflete antes de seguir adiante.",
    studentContent: [
      `Em duplas, discutam por 2 minutos: o que mais chamou atenção sobre ${input.topic.toLowerCase()} até agora?`,
      "Compartilhe uma pergunta que ainda não foi respondida.",
    ].slice(0, Math.max(2, bullets - 1)),
    keyConcepts: [],
    example: null,
    visualSuggestion: "Slide mais limpo, com espaço para a turma pensar — evite excesso de texto aqui.",
    teacherNotes: input.includeTeacherNotes ? "Circule pela sala durante a discussão em duplas." : null,
    sourceReferenceIds: [],
  };
}

function closingSlide(
  input: DocentiahSlidesGenerationInput,
  number: number,
  bullets: number,
): DocentiahSlide {
  return {
    number,
    title: "O que aprendemos hoje?",
    purpose: "Síntese e verificação de aprendizagem — fecha o arco da aula.",
    studentContent: [
      `Retomando a pergunta de abertura: o que mudou no que você sabe sobre ${input.topic.toLowerCase()}?`,
      "Consegue explicar o conceito central com suas próprias palavras?",
      ...(bullets > 2 ? ["Que dúvida você levaria para a próxima aula?"] : []),
    ].slice(0, bullets),
    keyConcepts: extractKeyTerms(input.topic),
    example: null,
    visualSuggestion: "Resumo visual simples dos pontos principais da aula.",
    teacherNotes: input.includeTeacherNotes
      ? "Use as respostas da turma aqui como verificação informal de aprendizagem."
      : null,
    sourceReferenceIds: [],
  };
}

function extractKeyTerms(topic: string): string[] {
  return topic
    .split(/\s+e\s+|,|\s+/i)
    .map((term) => term.trim())
    .filter((term) => term.length > 3)
    .slice(0, 3)
    .map(capitalize);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Melhorar com IA" no modo demonstrativo — limpeza honesta de texto, nunca invenção de conteúdo. */
function improveContextDemo(original: string): { improvedText: string; changesSummary: string[]; warnings: string[] } {
  const trimmed = original.trim();
  const withNormalizedSpacing = trimmed.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
  const sentences = withNormalizedSpacing
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence) => {
      const capitalized = sentence.charAt(0).toUpperCase() + sentence.slice(1);
      return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
    });
  const improvedText = sentences.join(" ");

  const changesSummary: string[] = [];
  if (withNormalizedSpacing !== trimmed) changesSummary.push("Espaçamento e quebras de linha normalizados.");
  if (improvedText !== withNormalizedSpacing) changesSummary.push("Pontuação final e maiúsculas de início de frase ajustadas.");
  if (changesSummary.length === 0) changesSummary.push("Nenhuma alteração estrutural — o texto já estava claro.");

  return {
    improvedText,
    changesSummary,
    warnings: [
      "Sugestão gerada pelo motor demonstrativo do DocentIAH (sem provedor de IA externo conectado) — revise antes de usar.",
    ],
  };
}
