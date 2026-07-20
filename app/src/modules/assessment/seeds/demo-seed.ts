import type { AssessmentAssignment, LessonAssessment } from "../domain/entities";

const ASSESSMENT_ID = "assessment-sondagem-inicial-ia";

export const DEMO_ASSESSMENT: LessonAssessment = {
  id: ASSESSMENT_ID,
  institutionId: "inst-horizonte",
  authorId: "user-fabio",
  title: "Sondagem Inicial — Como você entende a Inteligência Artificial?",
  instructions: "Responda às cinco questões com atenção. A sondagem identifica conhecimentos prévios e não substitui sua autoria.",
  kind: "diagnostic",
  lessonId: null,
  missionId: null,
  competencyIds: ["pensamento-critico", "cultura-digital"],
  version: 1,
  status: "published",
  createdAt: "2026-07-20T08:00:00-03:00",
  updatedAt: "2026-07-20T08:00:00-03:00",
  questions: [
    { id: "assessment-q1", assessmentId: ASSESSMENT_ID, position: 1, type: "multiple_choice", prompt: "Qual alternativa define melhor uma Inteligência Artificial?", points: 2, options: [
      { id: "A", label: "Uma máquina que pensa e sente exatamente como um ser humano." },
      { id: "B", label: "Um sistema capaz de analisar dados, identificar padrões e executar determinadas tarefas." },
      { id: "C", label: "Qualquer aparelho eletrônico conectado à internet." },
      { id: "D", label: "Um robô físico que sempre possui forma humana." },
    ], correctAnswer: "B", justification: "IA descreve sistemas que analisam dados e padrões para executar tarefas definidas.", rubric: [] },
    { id: "assessment-q2", assessmentId: ASSESSMENT_ID, position: 2, type: "multiple_choice", prompt: "Qual das situações representa um uso de Inteligência Artificial?", points: 2, options: [
      { id: "A", label: "Uma calculadora realizando uma soma digitada pelo usuário." },
      { id: "B", label: "Um interruptor acendendo uma lâmpada." },
      { id: "C", label: "Um aplicativo recomendando músicas com base no histórico do usuário." },
      { id: "D", label: "Um livro impresso organizando capítulos em ordem." },
    ], correctAnswer: "C", justification: "A recomendação usa padrões do histórico para estimar preferências.", rubric: [] },
    { id: "assessment-q3", assessmentId: ASSESSMENT_ID, position: 3, type: "true_false", prompt: "Uma Inteligência Artificial pode produzir uma resposta incorreta mesmo quando escreve de maneira segura e convincente.", points: 1.5, options: [], correctAnswer: true, justification: "Fluência e confiança textual não garantem exatidão factual.", rubric: [] },
    { id: "assessment-q4", assessmentId: ASSESSMENT_ID, position: 4, type: "true_false", prompt: "Tudo o que uma Inteligência Artificial produz pode ser utilizado sem verificar fontes, autoria ou possíveis erros.", points: 1.5, options: [], correctAnswer: false, justification: "Resultados de IA precisam de verificação crítica de fontes, autoria e erros.", rubric: [] },
    { id: "assessment-q5", assessmentId: ASSESSMENT_ID, position: 5, type: "essay", prompt: "Em uma ou duas frases, explique como a Inteligência Artificial pode ajudar um estudante sem substituir o pensamento e a autoria dele.", points: 3, options: [], correctAnswer: null, justification: "A resposta deve combinar apoio legítimo com preservação de pensamento ou autoria.", rubric: [
      { score: 3, description: "Apresenta apoio legítimo e preserva claramente pensamento ou autoria.", keywordGroups: [["ajudar", "apoiar", "explicar", "pesquisar", "organizar", "ideias"], ["autoria", "pensamento", "decidir", "próprio", "autonomia"]] },
      { score: 2, description: "Apresenta uma forma de apoio, mas trata superficialmente autoria ou autonomia.", keywordGroups: [["ajudar", "apoiar", "explicar", "pesquisar", "organizar", "ideias"]] },
      { score: 1, description: "Resposta relacionada, porém incompleta.", keywordGroups: [["inteligência artificial", "ia", "estudante", "aprender"]] },
    ] },
  ],
};

export const DEMO_ASSESSMENT_ASSIGNMENT: AssessmentAssignment = {
  id: "assessment-assignment-inicial-2ema",
  institutionId: "inst-horizonte",
  classroomId: "class-2em-a",
  assessmentId: ASSESSMENT_ID,
  startsAt: "2026-07-20T08:00:00-03:00",
  endsAt: "2026-12-10T23:59:00-03:00",
  timezone: "America/Sao_Paulo",
  allowLateSubmission: false,
  autoCorrectionEnabled: true,
  answerKeyPolicy: "manual",
  answerKeyReleaseAt: null,
  publicationStatus: "published",
  publishedAt: "2026-07-20T08:00:00-03:00",
  resultsReleasedAt: null,
  resultsReleasedBy: null,
  createdAt: "2026-07-20T08:00:00-03:00",
  updatedAt: "2026-07-20T08:00:00-03:00",
};
