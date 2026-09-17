import assert from "node:assert/strict";
import test from "node:test";

import {
  autoCorrectAnswer,
  autoCorrectSubmission,
  validateSubmission,
} from "../src/modules/assessment/services/correction-service.ts";

const objective = {
  id: "q1", assessmentId: "a1", position: 1, type: "multiple_choice",
  prompt: "Pergunta", points: 2, options: [], correctAnswer: "B",
  justification: "Justificativa protegida", rubric: [],
};
const essay = {
  id: "q2", assessmentId: "a1", position: 2, type: "essay",
  prompt: "Explique", points: 3, options: [], correctAnswer: null,
  justification: "", rubric: [
    { score: 3, description: "Apoio e autoria", keywordGroups: [["ajudar"], ["autoria"]] },
    { score: 2, description: "Apoio", keywordGroups: [["ajudar"]] },
  ],
};

function answer(questionId, value) {
  return { id: `answer-${questionId}`, questionId, value, autoScore: null, finalScore: null, autoFeedback: null, teacherFeedback: null, flagged: false };
}

test("corrige objetivas deterministicamente sem expor a justificativa no feedback", () => {
  const corrected = autoCorrectAnswer(objective, answer("q1", "B"));
  assert.equal(corrected.autoScore, 2);
  assert.equal(corrected.autoFeedback.includes("Justificativa protegida"), false);
  assert.equal(autoCorrectAnswer(objective, answer("q1", "A")).autoScore, 0);
});

test("aplica a faixa determinística mais alta da rubrica dissertativa", () => {
  assert.equal(autoCorrectAnswer(essay, answer("q2", "A IA pode ajudar, mas a autoria permanece do estudante.")).autoScore, 3);
  assert.equal(autoCorrectAnswer(essay, answer("q2", "Pode ajudar a pesquisar.")).autoScore, 2);
  assert.equal(autoCorrectAnswer(essay, answer("q2", "")).autoScore, 0);
  assert.equal(autoCorrectAnswer(essay, answer("q2", "O céu está azul.")).autoScore, 0);
});

test("mantém autoScore e finalScore separados até validação docente", () => {
  const submission = {
    id: "s1", institutionId: "i1", assignmentId: "aa1", studentId: "student",
    status: "submitted", answers: [answer("q1", "B"), answer("q2", "Pode ajudar e preservar autoria.")],
    autoScore: null, finalScore: null, autoFeedback: null, teacherFeedback: null,
    startedAt: "2026-07-20T10:00:00Z", submittedAt: "2026-07-20T10:05:00Z",
    validatedAt: null, validatedBy: null, reopenedAt: null, updatedAt: "2026-07-20T10:05:00Z",
  };
  const corrected = autoCorrectSubmission({ questions: [objective, essay] }, submission);
  assert.equal(corrected.autoScore, 5);
  assert.equal(corrected.finalScore, null);
  const validated = validateSubmission(corrected, "teacher");
  assert.equal(validated.status, "validated");
  assert.equal(validated.finalScore, 5);
  assert.equal(validated.validatedBy, "teacher");
  assert.equal(validated.teacherFeedback, "Correção revisada e validada pelo professor.");
});
