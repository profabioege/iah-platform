import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = join(__dirname, "..", "db", "migrations", "0008_trilhas.sql");

/**
 * Validação estática do conteúdo da migration — sem banco (mesmo espírito
 * de `scripts/check-migrations.mjs`, que já valida nome/sequência). Estes
 * testes confirmam o CONTEÚDO SQL específico de `trilhas`: constraints,
 * índices, RLS e isolamento multi-tenant, sem exigir um Postgres real.
 */
const sql = readFileSync(MIGRATION_PATH, "utf8");

/** Remove linhas de comentário `--` — para checar só instruções SQL reais, não prosa explicativa. */
const sqlWithoutComments = sql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

test("migration é legível e não está vazia", () => {
  assert.ok(sql.trim().length > 0);
});

test("tabela trilhas é criada", () => {
  assert.match(sql, /create table trilhas\s*\(/);
});

test("campos obrigatórios e enums fechados são declarados como constraint", () => {
  assert.match(sql, /institution_id\s+text not null references institutions/);
  assert.match(sql, /academic_year_id\s+text not null references academic_years/);
  assert.match(sql, /code\s+text not null check \(code <> '' and code = lower\(code\)\)/);
  assert.match(sql, /name\s+text not null check \(name <> ''\)/);
  assert.match(
    sql,
    /complexity_level\s+text not null\s+check \(complexity_level in \('foundational', 'intermediate', 'advanced'\)\)/,
  );
  assert.match(
    sql,
    /recommended_language\s+text not null\s+check \(recommended_language in \('concrete', 'investigative', 'conceptual'\)\)/,
  );
  assert.match(
    sql,
    /autonomy_level\s+text not null\s+check \(autonomy_level in \('guided', 'supported', 'autonomous'\)\)/,
  );
  assert.match(
    sql,
    /status\s+text not null default 'draft'\s+check \(status in \('draft', 'active', 'archived'\)\)/,
  );
});

test("version tem constraint > 0", () => {
  assert.match(sql, /version\s+integer not null default 1 check \(version > 0\)/);
});

test("índices esperados existem", () => {
  assert.match(sql, /create index trilhas_institution_idx on trilhas \(institution_id\)/);
  assert.match(sql, /create index trilhas_academic_year_idx on trilhas \(academic_year_id\)/);
  assert.match(sql, /create index trilhas_status_idx on trilhas \(status\)/);
  assert.match(sql, /create index trilhas_code_idx on trilhas \(code\)/);
});

test("RLS está habilitada em trilhas", () => {
  assert.match(sql, /alter table trilhas enable row level security/);
});

test("isolamento multi-tenant: unicidade é institution_id + academic_year_id + code, nunca code sozinho", () => {
  assert.match(sql, /unique \(institution_id, academic_year_id, code\)/);
  // A mesma code em instituições diferentes precisa continuar válida —
  // ou seja, não pode existir uma constraint `unique (code)` isolada.
  assert.doesNotMatch(sql, /unique\s*\(\s*code\s*\)/);
});

test("nenhum GRANT/REVOKE explícito — segue o padrão das tabelas normais, não a convenção específica de jobs (D-047 §7)", () => {
  assert.doesNotMatch(sqlWithoutComments, /\bgrant\b/i);
  assert.doesNotMatch(sqlWithoutComments, /\brevoke\b/i);
});

test("nenhuma policy permissiva criada (deny-by-default só por RLS, sem create policy)", () => {
  assert.doesNotMatch(sqlWithoutComments, /create policy/i);
});

test("rollback documentado", () => {
  assert.match(sql, /-- drop table trilhas;/);
});
