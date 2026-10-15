/**
 * Cópia de segurança LÓGICA dos dados do piloto (tabelas da turma, das
 * contas e do ciclo da missão) e restauração num banco VAZIO.
 *
 * Por que lógica (via API administrativa) e não pg_dump: o plano gratuito
 * não oferece cópia baixável nem recuperação pontual, e o computador da
 * escola pode não ter cliente PostgreSQL. Este formato roda com Node.
 *
 * O arquivo gerado CONTÉM dados pessoais e os hashes de senha: guarde-o
 * fora do repositório, em local com acesso restrito, e apague-o no fim do
 * prazo de retenção combinado com a escola.
 *
 * Restauração só em banco vazio (nas tabelas abaixo): nunca mistura nem
 * sobrescreve dados existentes.
 */

/** Ordem de dependência (pais antes dos filhos). */
export const PILOT_TABLES = [
  "institutions",
  "academic_years",
  "subjects",
  "classrooms",
  "users",
  "profiles",
  "teachers",
  "students",
  "classroom_teachers",
  "enrollments",
  "missions",
  "lessons",
  "mission_assignments",
  "productions",
  "reflections",
  "mission_reviews",
  "mission_progress",
  "admin_audit_log",
];

/** Colunas que o banco gera e que não devem ser reinseridas. */
const OMIT_ON_RESTORE = { admin_audit_log: ["id"] };

const PAGE = 1000;

async function readAll(db, table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .order(table === "classroom_teachers" ? "classroom_id" : "id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

export async function exportPilotData(db, meta = {}) {
  const tables = {};
  for (const table of PILOT_TABLES) tables[table] = await readAll(db, table);
  return {
    format: "iah-pilot-backup/1",
    createdAt: new Date().toISOString(),
    ...meta,
    counts: Object.fromEntries(Object.entries(tables).map(([t, r]) => [t, r.length])),
    tables,
  };
}

export async function countPilotRows(db) {
  const counts = {};
  for (const table of PILOT_TABLES) {
    const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
    if (error) throw new Error(`${table}: ${error.message}`);
    counts[table] = count ?? 0;
  }
  return counts;
}

/** Restaura num banco sem nenhuma linha nas tabelas do piloto. */
export async function restorePilotData(db, backup) {
  if (backup?.format !== "iah-pilot-backup/1") throw new Error("Arquivo de cópia em formato desconhecido.");
  const existing = await countPilotRows(db);
  const ocupadas = Object.entries(existing).filter(([, n]) => n > 0);
  if (ocupadas.length > 0) {
    throw new Error(
      `Destino não está vazio (${ocupadas.map(([t, n]) => `${t}: ${n}`).join(", ")}). ` +
        "A restauração só acontece em banco vazio.",
    );
  }
  for (const table of PILOT_TABLES) {
    const omit = OMIT_ON_RESTORE[table] ?? [];
    const rows = (backup.tables[table] ?? []).map((r) =>
      Object.fromEntries(Object.entries(r).filter(([k]) => !omit.includes(k))),
    );
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db.from(table).insert(rows.slice(i, i + 500));
      if (error) throw new Error(`${table}: ${error.message}`);
    }
  }
  const after = await countPilotRows(db);
  const divergentes = PILOT_TABLES.filter((t) => after[t] !== (backup.counts?.[t] ?? 0));
  if (divergentes.length > 0) throw new Error(`Contagem divergente após restaurar: ${divergentes.join(", ")}.`);
  return after;
}
