/**
 * Cópia de segurança RESTRITA, para rodar imediatamente antes da
 * importação real da turma (ver scripts/pilot-backup-pre-importacao.mjs).
 *
 * Diferença para a cópia geral (pilot-backup-lib.mjs, que lê as tabelas
 * inteiras): aqui só entram as linhas da INSTITUIÇÃO-ALVO nas tabelas que
 * `provisionPilotClass` pode escrever. Linhas de outras instituições não
 * são lidas nem gravadas.
 *
 * Saída: uma pasta nova com `dados.json` (contém dados pessoais e hashes
 * de senha — acesso restrito) e `manifesto.json` (sanitizado: tabelas,
 * contagens e SHA-256; nenhum nome, e-mail ou senha). `verifyScopedBackup`
 * recalcula tudo a partir dos arquivos.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const BACKUP_FORMAT = "iah-pilot-pre-import-backup/1";

/** [tabela, coluna que liga a linha à instituição] — o que a importação escreve. */
export const SCOPED_TABLES = [
  ["institutions", "id"],
  ["academic_years", "institution_id"],
  ["classrooms", "institution_id"],
  ["users", "institution_id"],
  ["profiles", "institution_id"],
  ["teachers", "institution_id"],
  ["students", "institution_id"],
  ["classroom_teachers", "institution_id"],
  ["enrollments", "institution_id"],
  ["admin_audit_log", "institution_id"],
];

const ORDER = { classroom_teachers: ["classroom_id", "teacher_id"] };
const PAGE = 1000;

const sha256 = (data) => createHash("sha256").update(data).digest("hex");

async function readScoped(db, table, column, institutionId) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    let query = db.from(table).select("*").eq(column, institutionId);
    for (const c of ORDER[table] ?? ["id"]) query = query.order(c, { ascending: true });
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/**
 * Identificadores da configuração que a importação grava por `upsert(id)`
 * e que já pertencem a OUTRA instituição: o upsert reescreveria a linha
 * alheia. Só os nomes das tabelas voltam; o conteúdo não é lido.
 */
export async function findIdCollisions(db, institutionId, ids) {
  const collisions = [];
  for (const [table, id] of [
    ["academic_years", ids.academicYearId],
    ["classrooms", ids.classroomId],
    ["teachers", ids.teacherId],
  ]) {
    const { data, error } = await db.from(table).select("id, institution_id").eq("id", id);
    if (error) throw new Error(`${table}: ${error.message}`);
    if ((data ?? []).some((r) => r.institution_id !== institutionId)) collisions.push(table);
  }
  return collisions;
}

/**
 * Lê as linhas da instituição-alvo e grava a pasta da cópia (nunca
 * sobrescreve). `precheck` é o resumo sanitizado da prévia aprovada.
 */
export async function createScopedBackup(db, { root, institutionId, target, precheck, now = new Date() }) {
  const tables = {};
  for (const [table, column] of SCOPED_TABLES) {
    tables[table] = await readScoped(db, table, column, institutionId);
  }

  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const dir = join(root, `pre-importacao-${institutionId}-${stamp}`);
  mkdirSync(root, { recursive: true });
  mkdirSync(dir);

  const data = JSON.stringify({ format: BACKUP_FORMAT, institutionId, tables });
  writeFileSync(join(dir, "dados.json"), data, { encoding: "utf8", flag: "wx" });

  const manifest = {
    format: BACKUP_FORMAT,
    createdAt: now.toISOString(),
    target,
    institutionId,
    precheck,
    dataFile: { name: "dados.json", bytes: Buffer.byteLength(data), sha256: sha256(data) },
    tables: Object.fromEntries(
      SCOPED_TABLES.map(([t]) => [t, { count: tables[t].length, sha256: sha256(JSON.stringify(tables[t])) }]),
    ),
    aviso: "dados.json contém dados pessoais e hashes de senha: acesso restrito; não versionar nem enviar.",
  };
  writeFileSync(join(dir, "manifesto.json"), `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return { dir, manifest };
}

/** Confere a cópia pelos próprios arquivos: hash, contagens e escopo. */
export function verifyScopedBackup(dir) {
  const problems = [];
  let manifest;
  let raw;
  try {
    manifest = JSON.parse(readFileSync(join(dir, "manifesto.json"), "utf8"));
    raw = readFileSync(join(dir, manifest.dataFile?.name ?? "dados.json"));
  } catch (error) {
    return { ok: false, problems: [`arquivos ilegíveis: ${error.message}`], manifest: null };
  }
  if (manifest.format !== BACKUP_FORMAT) problems.push("formato do manifesto desconhecido");
  if (sha256(raw) !== manifest.dataFile?.sha256) problems.push("SHA-256 de dados.json diverge do manifesto");

  let data = null;
  try {
    data = JSON.parse(raw.toString("utf8"));
  } catch {
    problems.push("dados.json não é JSON válido");
  }
  if (data) {
    if (data.institutionId !== manifest.institutionId) problems.push("instituição dos dados diverge do manifesto");
    for (const [table, column] of SCOPED_TABLES) {
      const rows = data.tables?.[table];
      const esperado = manifest.tables?.[table];
      if (!Array.isArray(rows) || !esperado) {
        problems.push(`${table}: ausente`);
        continue;
      }
      if (rows.length !== esperado.count) problems.push(`${table}: contagem diverge`);
      if (sha256(JSON.stringify(rows)) !== esperado.sha256) problems.push(`${table}: SHA-256 diverge`);
      if (rows.some((r) => r[column] !== manifest.institutionId)) {
        problems.push(`${table}: linha de outra instituição`);
      }
    }
  }
  return { ok: problems.length === 0, problems, manifest };
}
