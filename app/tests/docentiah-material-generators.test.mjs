import assert from "node:assert/strict";
import test from "node:test";

import { generateInfographicDraft, generateLessonPlanDraft, generateMindMapDraft } from "../src/lib/docentiah/material-generators.ts";
import { createEmptyLessonPlanningBrief } from "../src/modules/docentiah/domain/lesson-planning-brief.ts";

function baseBrief(overrides = {}) {
  return {
    ...createEmptyLessonPlanningBrief("inst-a", "teacher-a"),
    subject: "História",
    educationLevel: "ensino_medio",
    grade: "2ª série",
    topic: "Revolução Industrial",
    specificConcept: "mais-valia",
    ...overrides,
  };
}

// 12. material slides — coberto pelo gerador já existente (não duplicado aqui).

// 13. material infográfico
test("infográfico: usa o tópico real, nunca inventa dado externo", () => {
  const draft = generateInfographicDraft(baseBrief());
  assert.equal(draft.title, "Revolução Industrial");
  assert.ok(draft.blocks.some((b) => b.title === "mais-valia"));
  assert.ok(draft.blocks.length >= 2);
});

// 14. material mapa mental
test("mapa mental: conceito central é o tópico, com sub-ramo do conceito específico", () => {
  const draft = generateMindMapDraft(baseBrief());
  assert.equal(draft.centralConcept, "Revolução Industrial");
  assert.ok(draft.branches.some((b) => b.subBranches.includes("mais-valia")));
  assert.deepEqual(draft.relations, ["Revolução Industrial → mais-valia"]);
});

test("plano de aula: perfil 'dificuldade_leitura' produz texto mais curto", () => {
  const normal = generateLessonPlanDraft(baseBrief());
  const adapted = generateLessonPlanDraft(baseBrief({ classProfile: ["dificuldade_leitura"] }));
  assert.notEqual(normal.objectives[0], adapted.objectives[0]);
  assert.ok(adapted.objectives[0].length <= normal.objectives[0].length);
});

test("plano de aula: perfil 'alunos_neurodivergentes' muda a orientação ao professor, nunca pede laudo", () => {
  const draft = generateLessonPlanDraft(baseBrief({ classProfile: ["alunos_neurodivergentes"] }));
  assert.ok(draft.teacherGuidance.includes("previsível"));
  assert.ok(!JSON.stringify(draft).toLowerCase().includes("laudo"));
  assert.ok(!JSON.stringify(draft).toLowerCase().includes("diagnóstico"));
});

test("plano de aula: conexão IAH e habilidades selecionadas aparecem quando presentes no brief", () => {
  const draft = generateLessonPlanDraft(
    baseBrief({
      iahConnection: { id: "c1", title: "Automação e transformação do trabalho", rationale: "r", confidence: 0.8, custom: false },
      selectedCurriculumSkills: [{ id: "s1", code: null, description: "Analisar transformações do trabalho", document: "doc", version: "1", matchReason: "m", confidence: 0.8 }],
    }),
  );
  assert.equal(draft.iahConnection, "Automação e transformação do trabalho");
  assert.deepEqual(draft.selectedSkills, ["Analisar transformações do trabalho"]);
});
