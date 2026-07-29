import assert from "node:assert/strict";
import test from "node:test";

import { createTrilha, normalizeTrilhaCode } from "../src/modules/trilhas/domain/entities.ts";

const NOW = "2026-07-29T00:00:00.000Z";

function baseInput(overrides = {}) {
  return {
    id: "trilha-1-id",
    institutionId: "inst-1",
    academicYearId: "year-1",
    code: "trilha-1",
    name: "Fundamentos Iniciais",
    description: "6º e 7º anos — linguagem concreta, forte mediação.",
    suggestedSchoolRange: { from: "6º ano", to: "7º ano" },
    complexityLevel: "foundational",
    recommendedLanguage: "concrete",
    autonomyLevel: "guided",
    objectives: [{ id: "obj-1", description: "Introduzir IA e pensamento crítico." }],
    ...overrides,
  };
}

test("cria uma trilha válida em draft, versão 1", () => {
  const trilha = createTrilha(baseInput(), NOW);
  assert.equal(trilha.status, "draft");
  assert.equal(trilha.version, 1);
  assert.equal(trilha.code, "trilha-1");
  assert.equal(trilha.createdAt, NOW);
  assert.equal(trilha.updatedAt, NOW);
});

test("rejeita institutionId ausente", () => {
  assert.throws(() => createTrilha(baseInput({ institutionId: "" }), NOW), /institutionId/);
});

test("rejeita code vazio", () => {
  assert.throws(() => createTrilha(baseInput({ code: "  " }), NOW), /code/);
});

test("rejeita name vazio", () => {
  assert.throws(() => createTrilha(baseInput({ name: "" }), NOW), /name/);
});

test("rejeita version inválida (zero ou negativa)", () => {
  assert.throws(() => createTrilha(baseInput({ version: 0 }), NOW), /version/);
  assert.throws(() => createTrilha(baseInput({ version: -1 }), NOW), /version/);
});

test("rejeita complexityLevel inválido", () => {
  assert.throws(
    () => createTrilha(baseInput({ complexityLevel: "expert" }), NOW),
    /complexityLevel/,
  );
});

test("rejeita recommendedLanguage inválida", () => {
  assert.throws(
    () => createTrilha(baseInput({ recommendedLanguage: "informal" }), NOW),
    /recommendedLanguage/,
  );
});

test("rejeita autonomyLevel inválido", () => {
  assert.throws(
    () => createTrilha(baseInput({ autonomyLevel: "independent" }), NOW),
    /autonomyLevel/,
  );
});

test("rejeita status inválido", () => {
  assert.throws(() => createTrilha(baseInput({ status: "published" }), NOW), /status/);
});

test("normaliza o code para minúsculas e sem espaços", () => {
  const trilha = createTrilha(baseInput({ code: "  TRILHA-1  " }), NOW);
  assert.equal(trilha.code, "trilha-1");
  assert.equal(normalizeTrilhaCode("  TRILHA-2  "), "trilha-2");
});

test("preserva os objetivos estruturados sem alteração", () => {
  const objectives = [
    { id: "obj-1", description: "Reconhecer os limites da IA." },
    { id: "obj-2", description: "Diferenciar autoria humana e assistida." },
  ];
  const trilha = createTrilha(baseInput({ objectives }), NOW);
  assert.deepEqual(trilha.objectives, objectives);
});

test("ausência de vínculo rígido com série — suggestedSchoolRange é só referência, nunca valida contra outra trilha ou entidade", () => {
  // Duas trilhas podem compartilhar a mesma faixa sugerida sem conflito —
  // a validação nunca compara suggestedSchoolRange entre trilhas nem a
  // usa como parte de nenhuma regra de aceitação.
  const trilhaA = createTrilha(
    baseInput({ id: "a", code: "trilha-1", suggestedSchoolRange: { from: "6º ano", to: "9º ano" } }),
    NOW,
  );
  const trilhaB = createTrilha(
    baseInput({ id: "b", code: "trilha-2", suggestedSchoolRange: { from: "6º ano", to: "9º ano" } }),
    NOW,
  );
  assert.deepEqual(trilhaA.suggestedSchoolRange, trilhaB.suggestedSchoolRange);
  assert.notEqual(trilhaA.code, trilhaB.code);
});
