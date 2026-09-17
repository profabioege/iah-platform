import type {
  AssessmentAnswer,
  AssessmentQuestion,
  AssessmentSubmission,
  LessonAssessment,
} from "../domain/entities";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function correctEssay(question: AssessmentQuestion, value: string): {
  score: number;
  feedback: string;
} {
  const normalized = normalize(value);
  if (!normalized) return { score: 0, feedback: "Resposta em branco." };

  const bands = [...question.rubric].sort((a, b) => b.score - a.score);
  const band = bands.find((candidate) =>
    candidate.keywordGroups.every((group) =>
      group.some((keyword) => normalized.includes(normalize(keyword))),
    ),
  );
  if (!band) {
    return {
      score: 0,
      feedback: "Resposta sem relação identificável com os critérios da rubrica.",
    };
  }
  return { score: Math.min(band.score, question.points), feedback: band.description };
}

export function autoCorrectAnswer(
  question: AssessmentQuestion,
  answer: AssessmentAnswer,
): AssessmentAnswer {
  if (question.type === "essay") {
    const result = correctEssay(question, String(answer.value ?? ""));
    return { ...answer, autoScore: result.score, autoFeedback: result.feedback };
  }

  const isCorrect = answer.value === question.correctAnswer;
  return {
    ...answer,
    autoScore: isCorrect ? question.points : 0,
    autoFeedback: isCorrect
      ? "Resposta objetiva identificada como correta pela autocorreção."
      : "Resposta objetiva identificada como incorreta pela autocorreção.",
  };
}

export function autoCorrectSubmission(
  assessment: LessonAssessment,
  submission: AssessmentSubmission,
): AssessmentSubmission {
  const questions = new Map(assessment.questions.map((question) => [question.id, question]));
  const answers = submission.answers.map((answer) => {
    const question = questions.get(answer.questionId);
    return question ? autoCorrectAnswer(question, answer) : answer;
  });
  const autoScore = answers.reduce((sum, answer) => sum + (answer.autoScore ?? 0), 0);
  return {
    ...submission,
    answers,
    autoScore,
    autoFeedback: "Correção automática concluída. Resultado pendente de validação docente.",
  };
}

export function validateSubmission(
  submission: AssessmentSubmission,
  reviewerId: string,
  now = new Date().toISOString(),
): AssessmentSubmission {
  if (submission.status === "draft") throw new Error("Rascunhos não podem ser validados.");
  const answers = submission.answers.map((answer) => ({
    ...answer,
    finalScore: answer.finalScore ?? answer.autoScore ?? 0,
    teacherFeedback: answer.teacherFeedback ?? answer.autoFeedback,
  }));
  return {
    ...submission,
    status: "validated",
    answers,
    finalScore: answers.reduce((sum, answer) => sum + (answer.finalScore ?? 0), 0),
    teacherFeedback: submission.teacherFeedback?.trim()
      ? submission.teacherFeedback
      : "Correção revisada e validada pelo professor.",
    validatedAt: now,
    validatedBy: reviewerId,
    updatedAt: now,
  };
}
