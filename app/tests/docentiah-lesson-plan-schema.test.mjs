import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSlidesPrefillPayload,
  generateInfographicDraft,
  generateLessonPlanDraft,
  generateMindMapDraft,
  mergeLessonPlanSection,
} from "../src/lib/docentiah/material-generators.ts";
import { createEmptyLessonPlanningBrief } from "../src/modules/docentiah/domain/lesson-planning-brief.ts";
import { createSeedDocentiahRepositories } from "../src/modules/docentiah/infrastructure/seed/seed-repositories.ts";

const BANNED_PHRASES = [
  "apresente o conteúdo",
  "explique o tema",
  "faça uma pergunta",
  "realize uma atividade",
  "aplique a uma situação concreta",
];

function baseBrief(overrides = {}) {
  return {
    ...createEmptyLessonPlanningBrief("inst-a", "teacher-a"),
    subject: "História",
    educationLevel: "ensino_medio",
    grade: "2ª série",
    topic: "Revolução Industrial",
    specificConcept: "mais-valia",
    iahConnection: {
      id: "c1",
      title: "Inteligência Artificial e produtividade",
      rationale: "A mais-valia depende do aumento da produtividade sem aumento proporcional do salário.",
      confidence: 0.8,
      custom: false,
    },
    selectedCurriculumSkills: [
      { id: "s1", code: null, description: "Analisar transformações do mundo do trabalho", document: "doc-bncc", version: "1", matchReason: "m", confidence: 0.8 },
    ],
    ...overrides,
  };
}

function draftText(draft) {
  return JSON.stringify(draft).toLowerCase();
}

// 1. Mobilização com contextualização
test("1. mobilização traz contextualização real, não instrução vazia", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  assert.ok(draft.introduction.contextualization.length > 40);
  assert.ok(draft.introduction.contextualization.includes("Revolução Industrial"));
  for (const phrase of BANNED_PHRASES) assert.ok(!draft.introduction.contextualization.toLowerCase().includes(phrase));
});

// 2. perguntas de conhecimento prévio
test("2. mobilização traz perguntas prontas de levantamento de conhecimentos prévios", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  assert.ok(draft.introduction.priorKnowledgeQuestions.length >= 3);
  for (const question of draft.introduction.priorKnowledgeQuestions) assert.ok(question.trim().endsWith("?"));
});

// 3. exemplo inicial
test("3. mobilização usa a rationale real da Conexão IAH como exemplo inicial, quando existe", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  assert.ok(draft.introduction.openingExample.includes("A mais-valia depende do aumento da produtividade"));
});

// 4. Desenvolvimento com temas
test("4. desenvolvimento organiza o conteúdo em temas com título e explicação", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  assert.ok(draft.development.topics.length >= 2);
  for (const topic of draft.development.topics) {
    assert.ok(topic.title.length > 0);
    assert.ok(topic.explanation.length > 20);
  }
});

// 5. conceitos fundamentais
test("5. desenvolvimento traz o tópico, o conceito específico e as habilidades como conceitos fundamentais com definição", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  const terms = draft.development.keyConcepts.map((c) => c.term);
  assert.ok(terms.includes("Revolução Industrial"));
  assert.ok(terms.includes("mais-valia"));
  assert.ok(terms.includes("Analisar transformações do mundo do trabalho"));
  for (const concept of draft.development.keyConcepts) assert.ok(concept.definition.length > 0);
});

// 6. explicações autoexplicativas (ausência de instruções genéricas em todo o rascunho)
test("6. nenhuma frase genérica de instrução aparece em nenhuma parte do rascunho", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  const text = draftText(draft);
  for (const phrase of BANNED_PHRASES) assert.ok(!text.includes(phrase), `frase genérica encontrada: "${phrase}"`);
});

// 7. Conexão IAH
test("7. conexão com IA aparece no desenvolvimento quando presente no brief, e como null quando ausente", () => {
  const withConnection = generateLessonPlanDraft(baseBrief());
  assert.equal(withConnection.development.iahConnection, "Inteligência Artificial e produtividade");

  const withoutConnection = generateLessonPlanDraft(baseBrief({ iahConnection: undefined }));
  assert.equal(withoutConnection.development.iahConnection, null);
});

// 8. atividade objetiva
test("8. atividade traz questões objetivas completas (enunciado, alternativas, correta, gabarito)", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  assert.ok(draft.activity.objectiveQuestions.length >= 2);
  for (const question of draft.activity.objectiveQuestions) {
    assert.ok(question.prompt.length > 0);
    assert.ok(question.rationale.length > 0);
    assert.ok(question.difficulty.length > 0);
  }
});

// 9. alternativas
test("9. cada questão objetiva tem 4 ou 5 alternativas e um índice correto válido", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  for (const question of draft.activity.objectiveQuestions) {
    assert.ok(question.options.length === 4 || question.options.length === 5);
    assert.ok(question.correctOptionIndex >= 0 && question.correctOptionIndex < question.options.length);
  }
});

// 10. gabarito
test("10. atividade tem gabarito consolidado não vazio referenciando as questões objetivas", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  assert.ok(draft.activity.answerKey.length > 0);
  assert.ok(draft.activity.answerKey.includes("Q1"));
});

// 11. atividade dissertativa
test("11. atividade traz questões dissertativas com comando cognitivo e expectativa de resposta", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  assert.ok(draft.activity.essayQuestions.length >= 1);
  for (const question of draft.activity.essayQuestions) {
    assert.ok(question.cognitiveDemand.length > 0);
    assert.ok(question.expectedAnswer.length > 0);
  }
});

// 12. critérios de correção
test("12. cada questão dissertativa tem critérios de correção, agregados também no nível da atividade", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  for (const question of draft.activity.essayQuestions) assert.ok(question.correctionCriteria.length >= 1);
  assert.ok(draft.activity.correctionCriteria.length >= 1);
});

// 13. pesquisa orientada
test("13. atividade traz um roteiro de pesquisa completo", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  const research = draft.activity.researchTask;
  assert.ok(research);
  assert.ok(research.centralQuestion.length > 0);
  assert.ok(research.guidingQuestions.length >= 2);
  assert.ok(research.recommendedSources.length >= 2);
  assert.ok(research.expectedProduct.length > 0);
  assert.ok(research.qualityCriteria.length >= 1);
  assert.ok(research.verificationGuidance.length > 0);
  assert.ok(research.authorshipNote.length > 0);
});

// 14. atividade mista
test("14. o rascunho gerado já combina objetiva + dissertativa + pesquisa (atividade mista por padrão)", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  assert.equal(draft.activity.activityKind, "mixed");
  assert.ok(draft.activity.objectiveQuestions.length > 0);
  assert.ok(draft.activity.essayQuestions.length > 0);
  assert.ok(draft.activity.researchTask !== null);
});

// 15. quantidade de questões
test("15. quantidade de questões geradas é estável e nunca vazia", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  assert.ok(draft.activity.objectiveQuestions.length >= 2 && draft.activity.objectiveQuestions.length <= 3);
  assert.ok(draft.activity.essayQuestions.length >= 1 && draft.activity.essayQuestions.length <= 2);
});

// 16. salvar planejamento (contrato do rascunho persistido)
test("16. o rascunho tem exatamente o formato esperado para ser salvo como outputData", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  assert.ok(typeof draft.title === "string");
  assert.ok(typeof draft.introduction === "object");
  assert.ok(typeof draft.development === "object");
  assert.ok(typeof draft.activity === "object");
  assert.ok(Array.isArray(draft.sourceReferences));
  assert.equal(draft.status, "draft");
});

// 17. reescrever uma seção
test("17. reescrever substitui só a seção pedida, preservando as demais e as edições do professor", () => {
  const current = generateLessonPlanDraft(baseBrief());
  current.introduction.contextualization = "Texto editado manualmente pelo professor.";
  const fresh = generateLessonPlanDraft(baseBrief({ specificConcept: "automação" }));

  const afterDevelopmentRewrite = mergeLessonPlanSection(current, fresh, "development");
  assert.equal(afterDevelopmentRewrite.introduction.contextualization, "Texto editado manualmente pelo professor.");
  assert.deepEqual(afterDevelopmentRewrite.development, fresh.development);
  assert.deepEqual(afterDevelopmentRewrite.activity, current.activity);

  const afterFullRewrite = mergeLessonPlanSection(current, fresh, "full");
  assert.deepEqual(afterFullRewrite, fresh);
});

// 18. criar slides sem repetir perguntas
test("18. o contexto enviado para os slides reaproveita disciplina/série/tema/perfil sem pedir de novo", () => {
  const brief = baseBrief({ classProfile: ["heterogenea", "precisa_mais_exemplos"] });
  const payload = buildSlidesPrefillPayload(brief, "essencial");
  assert.equal(payload.subject, "História");
  assert.equal(payload.grade, "2ª série");
  assert.equal(payload.topic, "Revolução Industrial");
  assert.equal(payload.studentProfile, "heterogenea, precisa_mais_exemplos");
  assert.equal(payload.visualTheme, "essencial");
});

// 19. criar material de apoio (só formatos que já existem)
test("19. infográfico e mapa mental continuam gerando rascunho válido a partir do mesmo brief (únicos formatos integrados)", () => {
  const brief = baseBrief();
  const infographic = generateInfographicDraft(brief);
  const mindMap = generateMindMapDraft(brief);
  assert.equal(infographic.title, "Revolução Industrial");
  assert.equal(mindMap.centralConcept, "Revolução Industrial");
});

// 20. ausência de Síntese
test("20. o rascunho não tem campo de síntese em nenhum nível", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  assert.ok(!("synthesis" in draft));
  assert.ok(!("synthesis" in draft.introduction));
  assert.ok(!("synthesis" in draft.development));
  assert.ok(!("synthesis" in draft.activity));
});

// 21. ausência de Avaliação
test("21. o rascunho não tem campo de avaliação em nenhum nível", () => {
  const draft = generateLessonPlanDraft(baseBrief());
  assert.ok(!("assessment" in draft));
  assert.ok(!("assessment" in draft.introduction));
  assert.ok(!("assessment" in draft.development));
  assert.ok(!("assessment" in draft.activity));
});

// 22. compatibilidade com rascunhos antigos
test("22. rascunhos antigos (com synthesis/assessment em formato plano) continuam sendo salvos e lidos sem quebrar", async () => {
  const repositories = createSeedDocentiahRepositories();
  const now = new Date().toISOString();
  const oldShapeOutputData = {
    title: "Plano de aula — Revolução Industrial",
    context: "História · 2ª série do Ensino Médio",
    objectives: ["Compreender os aspectos centrais de Revolução Industrial."],
    selectedSkills: [],
    iahConnection: "Automação e transformação do trabalho",
    mobilization: "Abertura (5–8 min): apresente Revolução Industrial com uma pergunta aberta.",
    development: "Explique Revolução Industrial em blocos curtos.",
    activity: "Atividade em duplas.",
    synthesis: "Retomada da pergunta de abertura.",
    assessment: "Avaliação formativa.",
    materials: ["Quadro ou projeção"],
    teacherGuidance: "Ajuste o ritmo conforme o repertório prévio da turma.",
  };

  await repositories.materials.save("inst-a", {
    id: "old-material-1",
    institutionId: "inst-a",
    teacherId: "teacher-a",
    type: "lesson_plan",
    title: "Plano da aula — Revolução Industrial",
    subjectId: null,
    classroomId: null,
    status: "draft",
    inputData: {},
    outputData: oldShapeOutputData,
    promptVersion: "lesson-brief-extractor.v1",
    provider: "iah-demo",
    model: "docentiah-planner-demo-v1",
    webSearchUsed: false,
    pdfUsed: false,
    createdAt: now,
    updatedAt: now,
  });

  const reopened = await repositories.materials.getById("inst-a", "old-material-1");
  assert.ok(reopened);
  assert.deepEqual(reopened.outputData, oldShapeOutputData);
  assert.equal(reopened.outputData.synthesis, "Retomada da pergunta de abertura.");
});

// 25. isolamento institucional
test("25. material do tipo lesson_plan só aparece para a instituição e o professor donos", async () => {
  const repositories = createSeedDocentiahRepositories();
  const now = new Date().toISOString();
  const material = (overrides) => ({
    id: "m",
    institutionId: "inst-a",
    teacherId: "teacher-a",
    type: "lesson_plan",
    title: "Plano da aula — Revolução Industrial",
    subjectId: null,
    classroomId: null,
    status: "draft",
    inputData: {},
    outputData: generateLessonPlanDraft(baseBrief()),
    promptVersion: "lesson-brief-extractor.v1",
    provider: "iah-demo",
    model: "docentiah-planner-demo-v1",
    webSearchUsed: false,
    pdfUsed: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  await repositories.materials.save("inst-a", material({ id: "m1", institutionId: "inst-a", teacherId: "teacher-a" }));
  await repositories.materials.save("inst-b", material({ id: "m2", institutionId: "inst-b", teacherId: "teacher-a" }));

  const forInstA = await repositories.materials.listByTeacher("inst-a", "teacher-a");
  assert.deepEqual(forInstA.map((m) => m.id), ["m1"]);

  const crossInstitution = await repositories.materials.getById("inst-b", "m1");
  assert.equal(crossInstitution, null);
});

// 23. responsividade em 375 px e 24. teclado/foco: sem infraestrutura de
// teste de componente/browser neste repositório (suíte é node:test sobre
// lógica pura) — validados manualmente via navegador, não automatizados aqui.
