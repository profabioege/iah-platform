#!/usr/bin/env node
/**
 * Ingestão local de um documento oficial (ex.: referencial do MEC) no
 * Knowledge Engine — nunca toca o Supabase remoto (Micro Missão
 * "Persistência PostgreSQL do Referencial MEC").
 *
 * Modos:
 *   --dry-run  (padrão) — só faz parse do arquivo e mostra estatísticas,
 *              nunca abre conexão com banco.
 *   --persist  — exige `TEST_DATABASE_URL` (ou a variável definida em
 *              `--database-url-env`), valida que o host é local, e
 *              executa a ingestão real dentro de uma única transação.
 *
 * Nunca imprime a connection string nem o conteúdo integral do
 * documento — só título, checksum abreviado, quantidade de unidades,
 * intervalo de páginas e o resultado da operação.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

import { parseOfficialReferenceDocument } from "../src/modules/knowledge/domain/official-reference-importer.ts";
import { createOfficialReferenceIngestionService } from "../src/modules/knowledge/services/official-reference-ingestion-service.ts";

const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1"]);

function parseArgs(argv) {
  const args = { dryRun: true, persist: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--file":
        args.file = argv[++i];
        break;
      case "--persist":
        args.persist = true;
        args.dryRun = false;
        break;
      case "--dry-run":
        args.dryRun = true;
        args.persist = false;
        break;
      case "--source-id":
        args.sourceId = argv[++i];
        break;
      case "--publisher-short-name":
        args.publisherShortName = argv[++i];
        break;
      case "--rights-statement":
        args.rightsStatement = argv[++i];
        break;
      case "--database-url-env":
        args.databaseUrlEnv = argv[++i];
        break;
      default:
        throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }
  return args;
}

/**
 * Só permite localhost/127.0.0.1 — mesmo host usado pelo harness de
 * teste PostgreSQL (`scripts/postgres-test-env.mjs`) e pelo service
 * container da CI. Nenhum bypass, nenhuma flag para banco remoto.
 */
function assertLocalDatabaseUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Connection string inválida — não é uma URL bem formada.");
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `Host de banco não permitido: "${parsed.hostname}". Esta ferramenta só ` +
        `ingere em ${[...ALLOWED_HOSTS].join(" ou ")} — nunca em banco remoto ` +
        `(Supabase ou outro). Suba um PostgreSQL local/efêmero antes de usar --persist.`,
    );
  }
}

function abbreviateChecksum(checksum) {
  return `${checksum.slice(0, 12)}…`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    throw new Error("Uso: node scripts/ingest-official-reference.mjs --file <caminho> [--persist]");
  }

  const filePath = resolve(args.file);
  const rawText = readFileSync(filePath, "utf8");

  const options = {
    sourceId: args.sourceId ?? "source-mec-referencial-ia-2026",
    publisherShortName: args.publisherShortName ?? "MEC",
    rightsStatement:
      args.rightsStatement ??
      "Documento oficial do Ministério da Educação. Direitos reservados ao MEC; " +
        "uso educacional dentro da plataforma IAH conforme a finalidade pública de " +
        "divulgação do documento. Licença de distribuição não verificada — não se " +
        "alega licenciamento aberto.",
  };

  const parsed = parseOfficialReferenceDocument(rawText, options, new Date().toISOString());
  const pageRange =
    parsed.units.length > 0
      ? {
          min: Math.min(...parsed.units.map((u) => u.originalStartPage)),
          max: Math.max(...parsed.units.map((u) => u.originalEndPage)),
        }
      : null;

  console.log(`Título: ${parsed.document.title}`);
  console.log(`Checksum: ${abbreviateChecksum(parsed.details.checksum)}`);
  console.log(`Unidades extraídas: ${parsed.units.length}`);
  console.log(`Unidades vazias descartadas: ${parsed.skippedEmptyUnitCount}`);
  console.log(
    `Páginas: ${pageRange ? `${pageRange.min}-${pageRange.max}` : "(nenhuma unidade)"}`,
  );

  if (args.dryRun) {
    console.log("Modo: dry-run — nada foi gravado em nenhum banco.");
    return;
  }

  const envVar = args.databaseUrlEnv ?? "TEST_DATABASE_URL";
  const databaseUrl = process.env[envVar];
  if (!databaseUrl) {
    throw new Error(
      `Modo --persist exige a variável de ambiente ${envVar} apontando para um ` +
        `PostgreSQL local (ver scripts/postgres-test-env.mjs).`,
    );
  }
  assertLocalDatabaseUrl(databaseUrl);

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const service = createOfficialReferenceIngestionService(pool);
    const result = await service.ingest(parsed);
    console.log(`Resultado: ${result.outcome}`);
    console.log(`documentId: ${result.documentId}`);
    console.log(`Unidades persistidas: ${result.unitCount}`);
  } finally {
    await pool.end();
  }
}

await main();
