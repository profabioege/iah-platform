#!/usr/bin/env node
/**
 * Verificação estática das migrations — read-only, sem banco.
 *
 * Roda na CI (`npm run migrations:check`) antes de lint/tipos/testes:
 * um erro de nomenclatura ou de ordem cronológica é barato de detectar
 * aqui e caro de descobrir depois de aplicado (migration aplicada não
 * volta atrás sozinha).
 *
 * NUNCA conecta ao Supabase, NUNCA executa SQL, NUNCA aplica nada.
 * Apenas lê `db/migrations/` e valida forma.
 *
 * Convenção verificada: `<sequência 4 dígitos>_<nome_snake_case>.sql`
 * (padrão já usado pelas migrations existentes: 0001, 0002, ...).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "db", "migrations");
const FILE_PATTERN = /^(\d{4})_([a-z0-9_]+)\.sql$/;

const errors = [];
const fail = (message) => errors.push(message);

// 1. Diretório precisa existir e ser um diretório.
let entries;
try {
  if (!statSync(MIGRATIONS_DIR).isDirectory()) {
    fail(`Não é um diretório: ${MIGRATIONS_DIR}`);
  }
  entries = readdirSync(MIGRATIONS_DIR);
} catch (error) {
  console.error(`✖ Diretório de migrations inacessível: ${MIGRATIONS_DIR}`);
  console.error(`  ${error.message}`);
  process.exit(1);
}

const sqlFiles = entries.filter((name) => name.endsWith(".sql")).sort();

if (sqlFiles.length === 0) {
  console.error("✖ Nenhuma migration .sql encontrada.");
  process.exit(1);
}

// Arquivos que não são .sql no diretório indicam engano (backup, rascunho).
for (const name of entries) {
  if (!name.endsWith(".sql")) {
    fail(`Arquivo não-SQL em db/migrations/: "${name}"`);
  }
}

const timestamps = new Map();
const names = new Map();

for (const file of sqlFiles) {
  // 2. Nome segue a convenção de sequência numérica.
  const match = file.match(FILE_PATTERN);
  if (!match) {
    fail(`Nome fora do padrão <sequência4>_<nome_snake_case>.sql: "${file}"`);
    continue;
  }

  const [, stamp, label] = match;

  // 3. Números de sequência não podem colidir — a ordem de aplicação ficaria ambígua.
  if (timestamps.has(stamp)) {
    fail(`Sequência duplicada ${stamp}: "${timestamps.get(stamp)}" e "${file}"`);
  } else {
    timestamps.set(stamp, file);
  }

  // 4. Dois arquivos com o mesmo rótulo confundem histórico e revisão.
  if (names.has(label)) {
    fail(`Nome de migration duplicado "${label}": "${names.get(label)}" e "${file}"`);
  } else {
    names.set(label, file);
  }

  // 5. Todo arquivo precisa ser legível e ter conteúdo.
  let content;
  try {
    content = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
  } catch (error) {
    fail(`Não foi possível ler "${file}": ${error.message}`);
    continue;
  }

  if (content.trim().length === 0) {
    fail(`Migration vazia: "${file}"`);
  }
}

// 6. A ordem alfabética dos arquivos precisa ser a ordem numérica —
//    é assim que a sequência decide o que aplicar primeiro.
const stamps = sqlFiles
  .map((file) => file.match(FILE_PATTERN)?.[1])
  .filter(Boolean);
const sorted = [...stamps].sort();
if (stamps.join(",") !== sorted.join(",")) {
  fail("Ordem alfabética dos arquivos não corresponde à ordem cronológica.");
}

if (errors.length > 0) {
  console.error(`✖ Verificação de migrations falhou (${errors.length}):\n`);
  for (const message of errors) console.error(`  • ${message}`);
  process.exit(1);
}

console.log(
  `✔ ${sqlFiles.length} migrations válidas ` +
    `(${stamps[0]} → ${stamps[stamps.length - 1]}), nenhum acesso a banco.`,
);
