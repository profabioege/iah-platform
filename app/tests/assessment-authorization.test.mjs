import assert from "node:assert/strict";
import test from "node:test";

import { assertClassroomScope, assertRole } from "../src/modules/assessment/domain/authorization.ts";

test("bloqueia aluno em ação exclusiva da equipe pedagógica", () => {
  assert.throws(() => assertRole("student", ["teacher", "admin"]), /não autorizada/);
  assert.doesNotThrow(() => assertRole("teacher", ["teacher", "admin"]));
});

test("bloqueia acesso cruzado entre turmas", () => {
  assert.throws(() => assertClassroomScope(["class-a"], "class-b"), /fora do contexto/);
  assert.doesNotThrow(() => assertClassroomScope(["class-a"], "class-a"));
});
