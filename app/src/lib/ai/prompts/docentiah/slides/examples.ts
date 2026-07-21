import type { DocentiahSlidesGenerationInput, DocentiahSlidesGenerationOutput } from "./schema";

/**
 * Exemplos few-shot da capacidade `docentiah.generate_slides` — usados
 * como referência de qualidade (não injetados no prompt nesta etapa,
 * o provedor demonstrativo já é determinístico; ficam prontos para
 * quando um provedor real de IA for conectado).
 */
export interface DocentiahSlidesExample {
  input: DocentiahSlidesGenerationInput;
  output: DocentiahSlidesGenerationOutput;
}

export const DOCENTIAH_SLIDES_EXAMPLES: DocentiahSlidesExample[] = [
  {
    input: {
      subject: "Inteligência Artificial & Humanidades",
      educationLevel: "ensino_medio",
      grade: "1º ano E.M.",
      topic: "Desinformação e verificação de fontes",
      lessonDurationMinutes: 50,
      slideCount: 8,
      language: "pt-BR",
      detailLevel: "equilibrado",
      webSearchEnabled: false,
      visualTheme: "investigativo",
      includeClosingActivity: true,
      includeTeacherNotes: true,
      includeReferences: true,
      methodology: "investigativa",
      learningObjectives: "Reconhecer critérios objetivos para verificar a confiabilidade de uma informação.",
    },
    output: {
      title: "Desinformação e verificação de fontes",
      subtitle: "Como saber em que confiar",
      subject: "Inteligência Artificial & Humanidades",
      grade: "1º ano E.M.",
      estimatedDurationMinutes: 50,
      learningObjectives: [
        "Reconhecer critérios objetivos para verificar a confiabilidade de uma informação.",
      ],
      methodology: "Investigativa",
      slides: [
        {
          number: 1,
          title: "Quem decide o que é verdade?",
          purpose: "Mobilizar a turma com uma pergunta que ainda não tem resposta fechada.",
          studentContent: [
            "Uma notícia falsa pode se espalhar mais rápido que uma verdadeira.",
            "Hoje vamos investigar: como diferenciar uma fonte confiável de uma que não é?",
          ],
          keyConcepts: ["Desinformação"],
          example: null,
          visualSuggestion: "Imagem de um feed de notícias misturando fontes reais e fictícias.",
          teacherNotes: "Deixe a pergunta em aberto — a turma retoma essa questão no slide final.",
          sourceReferenceIds: [],
        },
      ],
      closingActivity:
        "Em duplas, os alunos aplicam os três critérios discutidos a uma notícia real trazida por eles.",
      teacherGuidance:
        "Reforce que nenhum critério sozinho garante confiabilidade — é a combinação deles que ajuda.",
      references: [],
      warnings: [],
    },
  },
];
