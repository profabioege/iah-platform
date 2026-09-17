import assert from "node:assert/strict";
import test from "node:test";

import { assertClassroomScope, assertRole } from "../src/modules/assessment/domain/authorization.ts";

test("bloqueia aluno e gestor em ação exclusiva do professor", () => {
  assert.throws(() => assertRole("student", ["teacher"]), /não autorizada/);
  assert.throws(() => assertRole("admin", ["teacher"]), /não autorizada/);
  assert.doesNotThrow(() => assertRole("teacher", ["teacher"]));
});

test("bloqueia acesso cruzado entre turmas", () => {
  assert.throws(() => assertClassroomScope(["class-a"], "class-b"), /fora do contexto/);
  assert.doesNotThrow(() => assertClassroomScope(["class-a"], "class-a"));
});
