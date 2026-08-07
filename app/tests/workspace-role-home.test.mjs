/**
 * Papel → rota inicial, e papel → permissões.
 *
 * Critério de aceitação 2 do ambiente demonstrativo: cada perfil cai na
 * área correta depois do login. `roleHome()` é o único lugar que decide
 * isso (`/entrar` a chama nos dois caminhos: sessão já existente e login
 * recém-concluído), então é aqui que a garantia mora.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  ROLE_PERMISSIONS,
  hasPermission,
  roleHome,
} from "../src/modules/workspace/domain/workspace-context.ts";

test("cada papel tem sua rota inicial", () => {
  assert.equal(roleHome("admin"), "/gestor");
  assert.equal(roleHome("teacher"), "/professor");
  assert.equal(roleHome("student"), "/dashboard");
});

test("os três papéis do Workspace são exatamente admin, teacher e student", () => {
  // Trava de exaustividade: um papel novo entra aqui e, se `roleHome`
  // não souber respondê-lo, o teste seguinte quebra em vez de o usuário
  // cair silenciosamente em /dashboard.
  assert.deepEqual(Object.keys(ROLE_PERMISSIONS).sort(), [
    "admin",
    "student",
    "teacher",
  ]);
});

test("nenhum papel compartilha rota inicial com outro", () => {
  const homes = Object.keys(ROLE_PERMISSIONS).map(roleHome);
  assert.equal(new Set(homes).size, homes.length);
  for (const home of homes) assert.match(home, /^\/[a-z]+$/);
});

test("aluno só tem a permissão de participar da aprendizagem", () => {
  assert.deepEqual(ROLE_PERMISSIONS.student, ["learning:participate"]);
});

test("aluno não planeja nem acompanha ensino, nem enxerga a instituição", () => {
  const context = { permissions: ROLE_PERMISSIONS.student };
  for (const permission of [
    "teaching:plan",
    "teaching:monitor",
    "institution:view",
    "institution:manage-users",
    "institution:settings",
  ]) {
    assert.equal(hasPermission(context, permission), false, permission);
  }
});

test("professor planeja e acompanha, mas não administra a instituição", () => {
  const context = { permissions: ROLE_PERMISSIONS.teacher };
  assert.equal(hasPermission(context, "teaching:plan"), true);
  assert.equal(hasPermission(context, "teaching:monitor"), true);
  assert.equal(hasPermission(context, "institution:manage-users"), false);
  assert.equal(hasPermission(context, "institution:settings"), false);
});

test("direção administra a instituição e acompanha, mas não planeja aulas", () => {
  const context = { permissions: ROLE_PERMISSIONS.admin };
  assert.equal(hasPermission(context, "institution:view"), true);
  assert.equal(hasPermission(context, "institution:manage-users"), true);
  assert.equal(hasPermission(context, "institution:settings"), true);
  assert.equal(hasPermission(context, "teaching:monitor"), true);
  assert.equal(hasPermission(context, "teaching:plan"), false);
});

test("ninguém além do aluno recebe learning:participate", () => {
  assert.equal(ROLE_PERMISSIONS.admin.includes("learning:participate"), false);
  assert.equal(ROLE_PERMISSIONS.teacher.includes("learning:participate"), false);
});
