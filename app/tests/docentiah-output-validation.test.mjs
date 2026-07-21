import assert from "node:assert/strict";
import test from "node:test";

import { AiGenerationError, iahAiGateway } from "../src/lib/ai/gateway.ts";
import { docentiahSlidesGenerationInputSchema } from "../src/lib/ai/prompts/docentiah/slides/schema.ts";

const validInput = docentiahSlidesGenerationInputSchema.parse({
  subject: "Geografia",
  educationLevel: "ensino_fundamental_anos_finais",
  grade: "8º ano",
  topic: "Bacias hidrográficas",
  lessonDurationMinutes: 45,
  slideCount: 5,
});
const emptyContext = { webResults: [], webSearchConfigured: false, pdfText: null, pdfTruncated: false };

const validOutputJson = JSON.stringify({
  title: "Bacias hidrográficas",
  subject: "Geografia",
  grade: "8º ano",
  estimatedDurationMinutes: 45,
  slides: [
    { number: 1, title: "Abertura", purpose: "Mobilizar", studentContent: ["Pergunta"] },
    { number: 2, title: "Conceito", purpose: "Progressão", studentContent: ["Definição"] },
    { number: 3, title: "Fechamento", purpose: "Síntese", studentContent: ["Retomada"] },
  ],
});

function fakeProvider(responses) {
  let calls = 0;
  return {
    provider: {
      name: "fake",
      model: "fake-model",
      isConfigured: true,
      async complete() {
        const response = responses[Math.min(calls, responses.length - 1)];
        calls += 1;
        if (response instanceof Error) throw response;
        return { raw: response, provider: "fake", model: "fake-model" };
      },
    },
    get callCount() {
      return calls;
    },
  };
}

test("resposta estruturada válida de primeira: devolve o output tipado, sem reparo", async () => {
  const fake = fakeProvider([validOutputJson]);
  const result = await iahAiGateway.execute("docentiah.generate_slides", validInput, emptyContext, fake.provider);
  assert.equal(result.output.title, "Bacias hidrográficas");
  assert.equal(fake.callCount, 1);
});

test("JSON inválido na primeira tentativa: uma única tentativa de reparo, depois sucesso", async () => {
  const fake = fakeProvider(["isto não é json", validOutputJson]);
  const result = await iahAiGateway.execute("docentiah.generate_slides", validInput, emptyContext, fake.provider);
  assert.equal(result.output.title, "Bacias hidrográficas");
  assert.equal(fake.callCount, 2); // 1 tentativa original + 1 reparo, nunca mais
});

test("JSON estruturalmente inválido (campo obrigatório ausente): reparo tentado, mas sem exceder uma vez", async () => {
  const missingSlides = JSON.stringify({ title: "Sem slides", subject: "Geografia", grade: "8º ano", estimatedDurationMinutes: 45, slides: [] });
  const fake = fakeProvider([missingSlides, missingSlides, missingSlides]);
  await assert.rejects(
    () => iahAiGateway.execute("docentiah.generate_slides", validInput, emptyContext, fake.provider),
    AiGenerationError,
  );
  assert.equal(fake.callCount, 2); // nunca uma terceira tentativa
});

test("JSON inválido nas duas tentativas: erro claro, nunca expõe JSON quebrado", async () => {
  const fake = fakeProvider(["não é json", "ainda não é json"]);
  await assert.rejects(
    () => iahAiGateway.execute("docentiah.generate_slides", validInput, emptyContext, fake.provider),
    (error) => {
      assert.ok(error instanceof AiGenerationError);
      assert.ok(!error.message.includes("{"));
      return true;
    },
  );
});

test("falha do provedor (exceção na chamada): propaga o erro, não trava silenciosamente", async () => {
  const fake = fakeProvider([new Error("provedor indisponível")]);
  await assert.rejects(
    () => iahAiGateway.execute("docentiah.generate_slides", validInput, emptyContext, fake.provider),
    /provedor indisponível/,
  );
});

test("capacidade de texto (\"melhorar com IA\") não exige schema de saída estruturado", async () => {
  const fake = fakeProvider(["Texto melhorado."]);
  const result = await iahAiGateway.executeText("docentiah.improve_text", { text: "texto original" }, {}, fake.provider);
  assert.equal(result.text, "Texto melhorado.");
});
