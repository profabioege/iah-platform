import assert from "node:assert/strict";
import test from "node:test";

import { assertMaterialOwnership } from "../src/modules/docentiah/domain/authorization.ts";
import { createSeedDocentiahRepositories } from "../src/modules/docentiah/infrastructure/seed/seed-repositories.ts";

function makeMaterial(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: "material-1",
    institutionId: "inst-a",
    teacherId: "teacher-a",
    type: "slides",
    title: "Aula de teste",
    subjectId: null,
    classroomId: null,
    status: "generated",
    inputData: {},
    outputData: {},
    promptVersion: "v1",
    provider: "iah-demo",
    model: "docentiah-demo-v1",
    webSearchUsed: false,
    pdfUsed: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("permite acesso quando instituição e professor batem", () => {
  const material = makeMaterial();
  assert.doesNotThrow(() => assertMaterialOwnership(material, "inst-a", "teacher-a"));
});

test("nega acesso entre instituições diferentes", () => {
  const material = makeMaterial({ institutionId: "inst-a" });
  assert.throws(() => assertMaterialOwnership(material, "inst-b", "teacher-a"), /fora do contexto institucional/);
});

test("nega acesso entre professores diferentes, mesmo na mesma instituição", () => {
  const material = makeMaterial({ teacherId: "teacher-a" });
  assert.throws(() => assertMaterialOwnership(material, "inst-a", "teacher-b"), /fora do contexto institucional/);
});

test("repositório em memória só lista materiais da instituição e do professor pedidos", async () => {
  const repositories = createSeedDocentiahRepositories();
  await repositories.materials.save("inst-a", makeMaterial({ id: "m1", institutionId: "inst-a", teacherId: "teacher-a" }));
  await repositories.materials.save("inst-b", makeMaterial({ id: "m2", institutionId: "inst-b", teacherId: "teacher-a" }));
  await repositories.materials.save("inst-a", makeMaterial({ id: "m3", institutionId: "inst-a", teacherId: "teacher-x" }));

  const forTeacherA = await repositories.materials.listByTeacher("inst-a", "teacher-a");
  assert.deepEqual(forTeacherA.map((m) => m.id), ["m1"]);

  const crossInstitution = await repositories.materials.getById("inst-b", "m1");
  assert.equal(crossInstitution, null); // m1 pertence a inst-a, não aparece pedindo inst-b
});
