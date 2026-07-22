import assert from "node:assert/strict";
import test from "node:test";

import { demoCurriculumConnectionProvider } from "../src/modules/conexoes-iah/infrastructure/providers/demo-curriculum-connection-provider.ts";

test("caso obrigatório: 'Mais-valia' em História, 2ª série do E.M., identifica contexto histórico/sociológico/econômico", async () => {
  const { context } = await demoCurriculumConnectionProvider.identifyConceptContext({
    term: "Mais-valia",
    disciplineSlug: "historia",
    educationLevel: "ensino_medio",
    grade: "2ª série",
  });

  assert.equal(context.hasReliableMatch, true);
  assert.ok(context.confidence >= 0.5, `confiança esperada >= 0.5, recebida ${context.confidence}`);
  assert.ok(
    context.relatedAreas.some((area) => /hist[oó]ria/i.test(area)),
    "deve relacionar História",
  );
  assert.ok(
    context.relatedAreas.some((area) => /sociologia|economia/i.test(area)),
    "deve relacionar Sociologia ou Economia",
  );
  assert.ok(context.curricularContext, "deve ter um contexto curricular provável");
});

test("outra área (Linguagens): 'fake news' também é identificado, sem nenhum condicional específico de história", async () => {
  const { context } = await demoCurriculumConnectionProvider.identifyConceptContext({
    term: "fake news",
    disciplineSlug: "linguagens",
    educationLevel: "ensino_medio",
    grade: "3ª série",
  });

  assert.equal(context.hasReliableMatch, true);
  assert.ok(context.relatedAreas.length > 0);
});

test("termo sem correspondência: baixa confiança, mensagem honesta, sem invenção", async () => {
  const { context } = await demoCurriculumConnectionProvider.identifyConceptContext({
    term: "xyzabc termo totalmente inexistente 12345",
  });

  assert.equal(context.hasReliableMatch, false);
  assert.equal(context.matchedConceptIds.length, 0);
});

test("input livre, sem disciplina/etapa/série informadas, ainda funciona (professor pode digitar direto)", async () => {
  const { context } = await demoCurriculumConnectionProvider.identifyConceptContext({ term: "seleção natural" });
  assert.equal(context.hasReliableMatch, true);
});
