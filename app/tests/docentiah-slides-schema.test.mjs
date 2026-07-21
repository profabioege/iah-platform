import assert from "node:assert/strict";
import test from "node:test";

import {
  docentiahSlidesGenerationInputSchema,
  docentiahSlidesGenerationOutputSchema,
} from "../src/lib/ai/prompts/docentiah/slides/schema.ts";

const validInput = {
  subject: "Inteligência Artificial & Humanidades",
  educationLevel: "ensino_medio",
  grade: "1º ano E.M.",
  topic: "Desinformação e verificação de fontes",
  lessonDurationMinutes: 50,
  slideCount: 10,
};

test("aceita o input mínimo com os 6 campos obrigatórios", () => {
  const result = docentiahSlidesGenerationInputSchema.safeParse(validInput);
  assert.equal(result.success, true);
  assert.equal(result.data.detailLevel, "equilibrado"); // default aplicado
  assert.equal(result.data.webSearchEnabled, false); // default aplicado
});

function omit(object, key) {
  const clone = { ...object };
  delete clone[key];
  return clone;
}

test("rejeita input sem disciplina, tema ou nível", () => {
  assert.equal(docentiahSlidesGenerationInputSchema.safeParse(omit(validInput, "subject")).success, false);
  assert.equal(docentiahSlidesGenerationInputSchema.safeParse(omit(validInput, "topic")).success, false);

  assert.equal(
    docentiahSlidesGenerationInputSchema.safeParse({ ...validInput, educationLevel: "pos_graduacao" }).success,
    false,
  );
});

test("rejeita quantidade de slides fora da faixa 5–30", () => {
  assert.equal(docentiahSlidesGenerationInputSchema.safeParse({ ...validInput, slideCount: 4 }).success, false);
  assert.equal(docentiahSlidesGenerationInputSchema.safeParse({ ...validInput, slideCount: 31 }).success, false);
  assert.equal(docentiahSlidesGenerationInputSchema.safeParse({ ...validInput, slideCount: 30 }).success, true);
});

test("corta o tema em 160 caracteres na validação", () => {
  const longTopic = "a".repeat(161);
  assert.equal(docentiahSlidesGenerationInputSchema.safeParse({ ...validInput, topic: longTopic }).success, false);
});

const validOutput = {
  title: "Desinformação e verificação de fontes",
  subject: "Inteligência Artificial & Humanidades",
  grade: "1º ano E.M.",
  estimatedDurationMinutes: 50,
  slides: [
    { number: 1, title: "Abertura", purpose: "Mobilizar", studentContent: ["Pergunta inicial"] },
    { number: 2, title: "Conceito", purpose: "Progressão", studentContent: ["Definição"] },
    { number: 3, title: "Fechamento", purpose: "Síntese", studentContent: ["Retomada"] },
  ],
};

test("aceita a saída mínima com pelo menos 3 slides", () => {
  const result = docentiahSlidesGenerationOutputSchema.safeParse(validOutput);
  assert.equal(result.success, true);
  assert.deepEqual(result.data.warnings, []); // default aplicado
});

test("rejeita saída com menos de 3 slides", () => {
  const result = docentiahSlidesGenerationOutputSchema.safeParse({
    ...validOutput,
    slides: validOutput.slides.slice(0, 2),
  });
  assert.equal(result.success, false);
});

test("rejeita slide com título vazio", () => {
  const result = docentiahSlidesGenerationOutputSchema.safeParse({
    ...validOutput,
    slides: [...validOutput.slides.slice(0, 2), { ...validOutput.slides[2], title: "" }],
  });
  assert.equal(result.success, false);
});

test("rejeita slide sem nenhum conteúdo para o aluno", () => {
  const result = docentiahSlidesGenerationOutputSchema.safeParse({
    ...validOutput,
    slides: [...validOutput.slides.slice(0, 2), { ...validOutput.slides[2], studentContent: [] }],
  });
  assert.equal(result.success, false);
});
