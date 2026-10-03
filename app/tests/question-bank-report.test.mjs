/**
 * Banco de questões — regras puras (sem banco): devolutiva automática e
 * conferência de alternativas. As regras de acesso e integridade são
 * provadas contra o banco real em tests/pilot/question-bank.test.mjs.
 */

import "./support/module-hooks.mjs";

import assert from "node:assert/strict";
import test from "node:test";

// Alvo importado depois dos hooks (regra de tests/support/module-hooks.mjs).
const { buildAttemptReport, validateOptions } = await import("@/modules/question-bank/domain/report");
const { answerIdFor, attemptIdFor } = await import("@/modules/question-bank/services/question-bank-service");

const opts = [{ key: "A", text: "um" }, { key: "B", text: "dois" }];
const version = (id) => ({ id, institutionId: "i", questionId: `q-${id}`, version: 1, stem: `enunciado ${id}`, options: opts, editorialDifficulty: null, sourceId: "s", authorship: "x", status: "aprovada", createdBy: "u", decidedBy: "r", decidedAt: null });

test("devolutiva organiza por item e por habilidade, sem inventar acerto", () => {
  const report = buildAttemptReport({
    items: [
      { id: "i2", listId: "l", position: 2, questionVersionId: "v2", skillId: "s-mat" },
      { id: "i1", listId: "l", position: 1, questionVersionId: "v1", skillId: "s-mat" },
      { id: "i3", listId: "l", position: 3, questionVersionId: "v3", skillId: "s-chs" },
    ],
    versions: [version("v1"), version("v2"), version("v3")],
    keys: [
      { versionId: "v1", answerKey: "A", resolution: "r1" },
      { versionId: "v2", answerKey: "B", resolution: "r2" },
      { versionId: "v3", answerKey: "A", resolution: "r3" },
    ],
    answers: [
      { id: "a1", attemptId: "t", listItemId: "i1", studentId: "s", selectedKey: "A", isCorrect: true },
      { id: "a2", attemptId: "t", listItemId: "i2", studentId: "s", selectedKey: "A", isCorrect: false },
    ],
    skills: [
      { id: "s-mat", institutionId: null, framework: "bncc", areaId: "mat", componentId: null, code: "EM13MAT101", description: "d", sourceReference: "r" },
      { id: "s-chs", institutionId: null, framework: "bncc", areaId: "chs", componentId: null, code: "EM13CHS101", description: "d", sourceReference: "r" },
    ],
  });
  assert.deepEqual(report.items.map((i) => i.position), [1, 2, 3]);
  assert.deepEqual(report.items.map((i) => i.isCorrect), [true, false, null], "sem resposta não vira erro nem acerto");
  assert.equal(report.correct, 1);
  assert.equal(report.total, 3);
  assert.equal(report.unanswered, 1);
  assert.deepEqual(report.bySkill, [
    { skillId: "s-chs", skillCode: "EM13CHS101", correct: 0, total: 1 },
    { skillId: "s-mat", skillCode: "EM13MAT101", correct: 1, total: 2 },
  ]);
});

test("sem gabarito legível (antes da entrega), a devolutiva não expõe chave", () => {
  const report = buildAttemptReport({
    items: [{ id: "i1", listId: "l", position: 1, questionVersionId: "v1", skillId: "s" }],
    versions: [version("v1")],
    keys: [],
    answers: [],
    skills: [],
  });
  assert.equal(report.items[0].answerKey, null);
  assert.equal(report.items[0].resolution, null);
});

test("conferência de alternativas", () => {
  assert.equal(validateOptions(opts, "A"), null);
  assert.match(validateOptions([opts[0]], "A"), /2 a 5/);
  assert.match(validateOptions([...opts, { key: "A", text: "x" }], "A"), /repetidas/);
  assert.match(validateOptions(opts, "C"), /gabarito/);
  assert.match(validateOptions([{ key: "A", text: " " }, opts[1]], "A"), /texto/);
});

test("ids determinísticos: repetir a ação aponta para a mesma linha", () => {
  assert.equal(attemptIdFor("l1", "s1"), attemptIdFor("l1", "s1"));
  assert.notEqual(attemptIdFor("l1", "s1"), attemptIdFor("l1", "s2"));
  assert.equal(answerIdFor("t1", "i1"), "ans:t1:i1");
});
