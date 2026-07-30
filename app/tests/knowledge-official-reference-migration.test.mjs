import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const MIGRATION_PATH = new URL(
  "../db/migrations/0008_knowledge_official_references.sql",
  import.meta.url,
);
const sql = readFileSync(MIGRATION_PATH, "utf8");

/** Remove comentários `--` antes de checar por palavras-chave — evita falso positivo em comentário explicativo. */
function withoutSqlComments(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

const sqlWithoutComments = withoutSqlComments(sql);

test("cria a tabela de metadados bibliográficos como extensão 1:1 de knowledge_documents", () => {
  assert.match(sql, /create table knowledge_official_references/);
  assert.match(sql, /document_id\s+text primary key references knowledge_documents \(id\)/);
});

test("cria a tabela de unidades de conteúdo com página obrigatória e válida", () => {
  assert.match(sql, /create table knowledge_document_units/);
  assert.match(sql, /original_start_page\s+integer not null check \(original_start_page >= 1\)/);
  assert.match(
    sql,
    /original_end_page\s+integer not null check \(original_end_page >= original_start_page\)/,
  );
});

test("distingue a natureza do conteúdo (original vs. síntese) por check constraint", () => {
  assert.match(sql, /content_nature.*check \(content_nature in \(\s*'original_source'/s);
});

test("previne unidades duplicadas da mesma importação via unique(document_id, sequence)", () => {
  assert.match(sql, /unique \(document_id, sequence\)/);
});

test("adiciona category a knowledge_documents restrita a official_reference", () => {
  assert.match(sql, /add column category text check \(category in \('official_reference'\)\)/);
});

test("nenhuma das novas tabelas tem coluna institution_id — referência oficial é sempre global", () => {
  assert.doesNotMatch(sql, /knowledge_official_references[\s\S]*?institution_id/);
  assert.doesNotMatch(sql, /knowledge_document_units[\s\S]*?institution_id/);
});

test("RLS habilitado nas duas tabelas novas, sem grants explícitos (padrão normal, não o de iah_jobs/D-047)", () => {
  assert.match(sql, /alter table knowledge_official_references enable row level security/);
  assert.match(sql, /alter table knowledge_document_units\s+enable row level security/);
  assert.doesNotMatch(sqlWithoutComments, /grant\s/i);
  assert.doesNotMatch(sqlWithoutComments, /revoke\s/i);
});

test("não insere nenhum dado — só define estrutura", () => {
  assert.doesNotMatch(sqlWithoutComments, /insert into/i);
});
