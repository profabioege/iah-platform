import assert from "node:assert/strict";
import test from "node:test";

import { buildLessonBrief } from "../src/lib/docentiah/lesson-brief-extractor.ts";
import { createEmptyLessonPlanningBrief } from "../src/modules/docentiah/domain/lesson-planning-brief.ts";

function emptyBrief() {
  return createEmptyLessonPlanningBrief("inst-a", "teacher-a");
}

// 1. pedido completo — exemplo obrigatório do enunciado
test("pedido completo extrai disciplina, série, tópico e conexão sem perguntar nada", () => {
  const result = buildLessonBrief({
    message:
      "Preciso de uma aula para a 2ª série sobre Revolução Industrial, relacionando mais-valia à automação e à Inteligência Artificial.",
    currentBrief: emptyBrief(),
  });
  assert.equal(result.extractedFields.subject, "História");
  assert.equal(result.extractedFields.educationLevel, "ensino_medio");
  assert.equal(result.extractedFields.grade, "2ª série");
  assert.equal(result.extractedFields.topic, "Revolução Industrial");
  assert.equal(result.extractedFields.specificConcept, "mais-valia");
  assert.equal(result.nextQuestion, null);
  assert.ok(result.confirmationSummary.includes("História · 2ª série do Ensino Médio"));
  assert.ok(result.confirmationSummary.includes("Revolução Industrial"));
  assert.ok(result.confirmationSummary.includes("Está correto?"));
  assert.deepEqual(result.missingFields, []);
});

// 2. pedido incompleto — exemplo obrigatório do enunciado
test('pedido incompleto ("fake news") pergunta somente a turma, não interroga em sequência', () => {
  const result = buildLessonBrief({ message: "Quero trabalhar fake news.", currentBrief: emptyBrief() });
  assert.equal(result.extractedFields.topic, "fake news");
  assert.equal(result.nextQuestion, "Com qual turma?");
  assert.ok(result.suggestedActions.length > 0);
  assert.equal(result.confirmationSummary, null);
});

// 4. não repetir pergunta já respondida
test("depois de informar a turma, a segunda chamada não pergunta de novo — usa o brief acumulado", () => {
  const first = buildLessonBrief({ message: "Quero trabalhar fake news.", currentBrief: emptyBrief() });
  const briefAfterFirst = { ...emptyBrief(), ...first.extractedFields };
  const second = buildLessonBrief({ message: "9º ano", currentBrief: briefAfterFirst });
  assert.equal(second.extractedFields.educationLevel, "ensino_fundamental_anos_finais");
  assert.equal(second.extractedFields.grade, "9º ano");
  assert.equal(second.extractedFields.topic, "fake news"); // preservado do turno anterior
  assert.equal(second.nextQuestion, null); // já tem tópico + turma — não pergunta de novo
});

// 5. edição de disciplina — reprocessar com subject já setado não perde outros campos
test("brief com disciplina já confirmada mantém a disciplina mesmo se a nova mensagem não a repetir", () => {
  const briefWithSubject = { ...emptyBrief(), subject: "Matemática" };
  const result = buildLessonBrief({ message: "1ª série, função exponencial", currentBrief: briefWithSubject });
  assert.equal(result.extractedFields.subject, "Matemática");
  assert.equal(result.extractedFields.grade, "1ª série");
});

test("mapa mental: extrai o tópico do gatilho 'mapa mental sobre'", () => {
  const result = buildLessonBrief({
    message: "Preciso de um mapa mental sobre função exponencial para a 1ª série.",
    currentBrief: emptyBrief(),
  });
  assert.equal(result.extractedFields.topic, "função exponencial");
  assert.equal(result.extractedFields.grade, "1ª série");
});

test("infográfico: extrai turma e tópico de 'Quero um infográfico sobre X para o Yº ano'", () => {
  const result = buildLessonBrief({
    message: "Quero um infográfico sobre seleção natural para o 9º ano.",
    currentBrief: emptyBrief(),
  });
  assert.equal(result.extractedFields.topic, "seleção natural");
  assert.equal(result.extractedFields.grade, "9º ano");
  assert.equal(result.extractedFields.educationLevel, "ensino_fundamental_anos_finais");
});

test("regressão: turma aparece no resumo mesmo quando a disciplina não pôde ser inferida (achado da validação manual)", () => {
  const result = buildLessonBrief({ message: "Quero um infográfico sobre seleção natural para o 9º ano.", currentBrief: emptyBrief() });
  assert.equal(result.extractedFields.subject, undefined); // catálogo não tem "seleção natural" — não inventa
  assert.equal(result.extractedFields.grade, "9º ano");
  assert.ok(result.confirmationSummary.includes("9º ano"));
});

test("nunca inventa disciplina/série/tópico não mencionados", () => {
  const result = buildLessonBrief({ message: "Olá, tudo bem?", currentBrief: emptyBrief() });
  assert.equal(result.extractedFields.subject, undefined);
  assert.equal(result.extractedFields.topic, undefined);
  assert.equal(result.extractedFields.grade, undefined);
});
