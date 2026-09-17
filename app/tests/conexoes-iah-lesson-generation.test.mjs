import assert from "node:assert/strict";
import test from "node:test";

import { demoCurriculumConnectionProvider } from "../src/modules/conexoes-iah/infrastructure/providers/demo-curriculum-connection-provider.ts";

const REQUIRED_FIELDS = [
  "title",
  "sourceDisciplineAndTopic",
  "connectionWithIah",
  "pedagogicalRationale",
  "guidingQuestion",
  "learningObjectives",
  "essentialConcepts",
  "priorKnowledge",
  "durationMinutes",
  "initialMobilization",
  "contextualization",
  "investigationOrExperiment",
  "studentProduction",
  "socialization",
  "synthesis",
  "assessmentCriteria",
  "requiredMaterials",
  "teacherGuidance",
  "possibleDifficulties",
  "interdisciplinaryExtensions",
  "references",
];

async function buildLessonForMaisValia() {
  const { context } = await demoCurriculumConnectionProvider.identifyConceptContext({
    term: "Mais-valia",
    disciplineSlug: "historia",
    educationLevel: "ensino_medio",
    grade: "2ª série",
  });
  const { connections } = await demoCurriculumConnectionProvider.suggestIahConnections({ context, limit: 3 });
  const { lesson } = await demoCurriculumConnectionProvider.generateCorrelatedLesson({
    sourceSubjectName: "História",
    sourceTopic: "Revolução Industrial",
    sourceConcept: "Mais-valia",
    educationLevel: "ensino_medio",
    grade: "2ª série",
    context,
    selectedConnections: connections.slice(0, 2),
    guidingQuestion: "",
  });
  return lesson;
}

test("aula de laboratório correlacionada contém todos os campos exigidos", async () => {
  const lesson = await buildLessonForMaisValia();
  for (const field of REQUIRED_FIELDS) {
    assert.ok(field in lesson, `campo ausente: ${field}`);
  }
});

test("pergunta norteadora tem um valor sugerido (editável pelo professor na UI)", async () => {
  const lesson = await buildLessonForMaisValia();
  assert.ok(lesson.guidingQuestion.length > 0);
});

test("quando o professor não escreve pergunta própria, o padrão vem da investigativeQuestion da conexão curada (não da rationale)", async () => {
  const { context } = await demoCurriculumConnectionProvider.identifyConceptContext({
    term: "Mais-valia",
    disciplineSlug: "historia",
    educationLevel: "ensino_medio",
    grade: "2ª série",
  });
  const { connections } = await demoCurriculumConnectionProvider.suggestIahConnections({ context, limit: 7 });
  const transformacao = connections.find((c) => c.sourceConnectionEntryId === "conn-mais-valia-transformacao-trabalho-ia");
  assert.ok(transformacao, "conexão de referência do caso obrigatório deve estar entre as sugestões");

  const { lesson } = await demoCurriculumConnectionProvider.generateCorrelatedLesson({
    sourceSubjectName: "História",
    sourceTopic: "Revolução Industrial",
    sourceConcept: "Mais-valia",
    educationLevel: "ensino_medio",
    grade: "2ª série",
    context,
    selectedConnections: [transformacao],
    guidingQuestion: "",
  });

  assert.equal(lesson.guidingQuestion, transformacao.investigativeQuestion);
  assert.match(lesson.guidingQuestion, /apropria do valor produzido/i);
});

test("professor pode substituir a pergunta norteadora — não é resposta única", async () => {
  const { context } = await demoCurriculumConnectionProvider.identifyConceptContext({
    term: "Mais-valia",
    disciplineSlug: "historia",
    educationLevel: "ensino_medio",
    grade: "2ª série",
  });
  const { connections } = await demoCurriculumConnectionProvider.suggestIahConnections({ context, limit: 3 });
  const customQuestion = "Pergunta escrita pelo próprio professor?";
  const { lesson } = await demoCurriculumConnectionProvider.generateCorrelatedLesson({
    sourceSubjectName: "História",
    sourceTopic: "Revolução Industrial",
    sourceConcept: "Mais-valia",
    educationLevel: "ensino_medio",
    grade: "2ª série",
    context,
    selectedConnections: connections.slice(0, 1),
    guidingQuestion: customQuestion,
  });
  assert.equal(lesson.guidingQuestion, customQuestion);
});

test("aula sempre inclui o aviso de revisão docente (motor demonstrativo)", async () => {
  const lesson = await buildLessonForMaisValia();
  assert.ok(lesson.warnings.some((w) => /demonstrativo/i.test(w)));
});

test("duração é um número positivo e materiais/critérios não vêm vazios", async () => {
  const lesson = await buildLessonForMaisValia();
  assert.ok(lesson.durationMinutes > 0);
  assert.ok(lesson.assessmentCriteria.length > 0);
  assert.ok(lesson.requiredMaterials.length > 0);
});
