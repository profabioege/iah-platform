import assert from "node:assert/strict";
import test from "node:test";

import { assertConnectionOwnership } from "../src/modules/conexoes-iah/domain/authorization.ts";

function makeConnection(overrides = {}) {
  return {
    id: "conn-1",
    institutionId: "inst-horizonte",
    classroomId: null,
    createdByTeacherId: "teacher-fabio",
    sourceSubjectId: "historia",
    sourceTeacherId: null,
    educationLevel: "ensino_medio",
    grade: "2ª série",
    academicPeriod: null,
    sourceTopic: "Revolução Industrial",
    sourceConcept: "Mais-valia",
    identifiedContext: {},
    selectedReferenceIds: [],
    iahAxisIds: [],
    selectedConnections: [],
    guidingQuestion: "?",
    pedagogicalRationale: "",
    confidence: 0.9,
    status: "rascunho",
    promptVersion: "v1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("permite acesso quando instituição e professor coincidem", () => {
  const connection = makeConnection();
  assert.doesNotThrow(() => assertConnectionOwnership(connection, "inst-horizonte", "teacher-fabio"));
});

test("nega acesso de outra instituição", () => {
  const connection = makeConnection({ institutionId: "inst-outra" });
  assert.throws(() => assertConnectionOwnership(connection, "inst-horizonte", "teacher-fabio"));
});

test("nega acesso de outro professor na mesma instituição", () => {
  const connection = makeConnection();
  assert.throws(() => assertConnectionOwnership(connection, "inst-horizonte", "teacher-outro"));
});
