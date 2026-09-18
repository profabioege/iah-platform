/**
 * Fumaça do ambiente do piloto: confirma que o caminho testado é o
 * caminho real — supabase-js → PostgREST → PostgreSQL — e que as
 * policies da migration 0010 estão MESMO no meio dele.
 *
 * Se este arquivo passa, o resto dos testes do piloto vale como prova de
 * isolamento; se falha, nenhum outro resultado aqui significa nada.
 */

import "./support/pilot-hooks.mjs";

import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { adminDb, resetPilotDatabase } from "./support/pilot-fixtures.mjs";

before(async () => {
  await resetPilotDatabase();
});

after(async () => {
  await resetPilotDatabase();
});

test("o cliente administrativo fala com PostgREST e escreve no banco", async () => {
  const { error } = await adminDb.from("institutions").insert({
    id: "inst-fumaca",
    name: "Instituição de fumaça",
    status: "active",
  });
  assert.equal(error, null);

  const { data } = await adminDb
    .from("institutions")
    .select("id, name")
    .eq("id", "inst-fumaca")
    .maybeSingle();
  assert.equal(data.name, "Instituição de fumaça");
});

test("as policies estão no caminho: o papel iah_app só enxerga a própria instituição", async () => {
  const { getScopedDatabaseClient } = await import(
    "@/modules/platform/infrastructure/database/scoped-client"
  );

  await adminDb.from("institutions").upsert(
    [
      { id: "inst-fumaca", name: "Instituição de fumaça", status: "active" },
      { id: "inst-fumaca-2", name: "Outra instituição", status: "active" },
    ],
    { onConflict: "id" },
  );

  const scoped = await getScopedDatabaseClient({
    institutionId: "inst-fumaca",
    role: "administrador",
    userId: "user-fumaca",
    teacherId: null,
    studentId: null,
  });

  const { data, error } = await scoped.from("institutions").select("id");
  assert.equal(error, null, "o papel iah_app precisa alcançar a API");
  const ids = (data ?? []).map((row) => row.id);
  assert.deepEqual(ids, ["inst-fumaca"], "a outra instituição não pode aparecer");
});

test("sem claims válidas o banco não devolve nada (nega por padrão)", async () => {
  const { getScopedDatabaseClient } = await import(
    "@/modules/platform/infrastructure/database/scoped-client"
  );
  const semInstituicao = await getScopedDatabaseClient({
    institutionId: "inst-inexistente",
    role: "administrador",
    userId: "user-fumaca",
    teacherId: null,
    studentId: null,
  });
  const { data } = await semInstituicao.from("institutions").select("id");
  assert.deepEqual(data, []);
});

test("iah_app não alcança tabelas administrativas (users, profiles, auditoria)", async () => {
  const { getScopedDatabaseClient } = await import(
    "@/modules/platform/infrastructure/database/scoped-client"
  );
  const scoped = await getScopedDatabaseClient({
    institutionId: "inst-fumaca",
    role: "administrador",
    userId: "user-fumaca",
    teacherId: null,
    studentId: null,
  });

  for (const tabela of ["users", "profiles", "admin_audit_log", "auth_login_attempts"]) {
    const { error } = await scoped.from(tabela).select("*").limit(1);
    assert.notEqual(error, null, `${tabela} não pode ser legível pelo papel das telas`);
  }
});
