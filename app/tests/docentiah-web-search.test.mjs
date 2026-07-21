import assert from "node:assert/strict";
import test from "node:test";

import { notConfiguredWebSearchProvider } from "../src/lib/ai/web-search-provider.ts";
import { generateSlidesFromInput } from "../src/lib/ai/providers/demo-llm-provider.ts";
import { docentiahSlidesGenerationInputSchema } from "../src/lib/ai/prompts/docentiah/slides/schema.ts";

test("busca desativada: nenhum provedor real, resposta honesta vazia", async () => {
  const response = await notConfiguredWebSearchProvider.search({
    subject: "Biologia",
    grade: "2º ano E.M.",
    topic: "Fotossíntese",
  });
  assert.equal(response.configured, false);
  assert.deepEqual(response.results, []);
});

const baseInput = docentiahSlidesGenerationInputSchema.parse({
  subject: "Biologia",
  educationLevel: "ensino_medio",
  grade: "2º ano E.M.",
  topic: "Fotossíntese",
  lessonDurationMinutes: 50,
  slideCount: 6,
});

test("busca na web desligada: geração não emite aviso de busca não configurada", () => {
  const output = generateSlidesFromInput(baseInput, {
    webResults: [],
    webSearchConfigured: false,
    pdfText: null,
    pdfTruncated: false,
  });
  assert.ok(!output.warnings.some((warning) => warning.toLowerCase().includes("busca na web")));
});

test("busca na web ligada sem provedor configurado: geração avisa isso honestamente ao professor", () => {
  const input = { ...baseInput, webSearchEnabled: true };
  const output = generateSlidesFromInput(input, {
    webResults: [],
    webSearchConfigured: false,
    pdfText: null,
    pdfTruncated: false,
  });
  assert.ok(output.warnings.some((warning) => warning.toLowerCase().includes("busca na web")));
});

test("resultados da web viram referências quando includeReferences está ativo", () => {
  const output = generateSlidesFromInput(baseInput, {
    webResults: [{ title: "Fonte real", summary: "Resumo", url: "https://exemplo.com", publishedAt: null }],
    webSearchConfigured: true,
    pdfText: null,
    pdfTruncated: false,
  });
  assert.ok(output.references.some((reference) => reference.title === "Fonte real"));
});
