import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { PilotStudentInput } from "./pilot-provisioning.ts";

/**
 * Importação da turma do piloto a partir de CSV (`nome,email_institucional,turma`).
 *
 * Duas fases, sempre nesta ordem:
 *  1. validação prévia (pura + leitura do banco, nada escrito) — mostra
 *     total, vínculo com a turma autorizada, e-mails ausentes, inválidos,
 *     repetidos ou fora do domínio da escola, contas já existentes e o que
 *     seria criado ou vinculado;
 *  2. importação — só com zero divergências bloqueantes, pelo mesmo
 *     `provisionPilotClass` (idempotente).
 *
 * Minimização: o CSV tem exatamente as três colunas; coluna extra é
 * recusada (dado que não precisamos não entra). Os relatórios citam o
 * NÚMERO DA LINHA e o e-mail mascarado — nunca o nome — para que possam
 * ser colados num chat ou registro de operação sem expor o aluno.
 */

export const CSV_COLUMNS = ["nome", "email_institucional", "turma"] as const;

export interface CsvStudentRow {
  /** Linha no arquivo (1 = cabeçalho). */
  line: number;
  nome: string;
  email: string;
  turma: string;
}

export interface ImportExpectations {
  /** Rótulo da única turma autorizada (ex.: "1ª série A"). */
  className: string;
  /** Total informado pela escola (lista institucional). */
  expectedTotal: number;
  /** Domínios aceitos para o e-mail institucional (ex.: ["escola.example"]). */
  emailDomains: string[];
}

export type IssueKind =
  | "cabecalho"
  | "coluna_extra"
  | "linha_malformada"
  | "nome_ausente"
  | "email_ausente"
  | "email_invalido"
  | "email_repetido"
  | "dominio_nao_autorizado"
  | "outra_turma"
  | "total_divergente"
  | "dominios_nao_configurados"
  | "nome_repetido"
  | "conta_outra_instituicao"
  | "conta_outro_papel"
  | "conta_inativa";

export interface ImportIssue {
  kind: IssueKind;
  /** Bloqueia a importação? Avisos (ex.: homônimos) não bloqueiam. */
  blocking: boolean;
  lines: number[];
  message: string;
}

export interface PrecheckReport {
  total: number;
  inAuthorizedClass: number;
  outOfClass: number;
  issues: ImportIssue[];
  blocking: boolean;
  /** Domínios encontrados no arquivo, com contagem (sem endereços). */
  domainsFound: Record<string, number>;
  rows: CsvStudentRow[];
}

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

/**
 * Chave do rótulo da turma: "1ª série A", "1a Serie A", "1A", "1º A",
 * "1ª série A - Ensino Médio" → "1a". "1º ano A" vira "1anoa" (ano ≠
 * série) e qualquer formato não reconhecido fica com prefixo "?" — nunca
 * coincide com a turma autorizada, então bloqueia em vez de adivinhar.
 */
export function normalizeClassLabel(label: string): string {
  const s = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[ªº°]/g, "o")
    .replace(/\s+/g, " ")
    .trim();
  const m = s.match(
    /^(\d+)\s*(?:[ao]\.?)?\s*(serie|ano)?\s*(?:turma\s*)?([a-z])\s*(?:[-(]?\s*(?:do\s+)?(?:em|e\.m\.|ensino medio)\s*\)?)?$/,
  );
  if (!m) return `?${s}`;
  return `${m[1]}${m[2] === "ano" ? "ano" : ""}${m[3]}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** "maria.souza@escola.example" → "ma***@escola.example" (para relatórios). */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Identificador estável do aluno, derivado da instituição + e-mail. Não
 * carrega o nome nem o e-mail em claro, e é o mesmo a cada importação —
 * por isso repetir a importação não cria um segundo aluno.
 */
export function studentIdFor(institutionId: string, email: string): string {
  const digest = createHash("sha256")
    .update(`${institutionId}:${normalizeEmail(email)}`)
    .digest("hex")
    .slice(0, 16);
  return `aluno-${digest}`;
}

function splitCsvLine(line: string, delimiter: string): string[] | null {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (quoted) return null;
  out.push(cur);
  return out.map((v) => v.trim());
}

/** Lê o CSV (vírgula ou ponto e vírgula, com ou sem BOM). */
export function parseClassCsv(text: string): { rows: CsvStudentRow[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const headerLine = lines[0] ?? "";
  const delimiter = headerLine.includes(";") && !headerLine.includes(",") ? ";" : ",";
  const header = (splitCsvLine(headerLine, delimiter) ?? []).map((h) => h.toLowerCase());

  const missing = CSV_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    issues.push({
      kind: "cabecalho",
      blocking: true,
      lines: [1],
      message: `Cabeçalho deve ser exatamente: ${CSV_COLUMNS.join(",")} (faltando: ${missing.join(", ")}).`,
    });
    return { rows: [], issues };
  }
  const extras = header.filter((h) => h && !(CSV_COLUMNS as readonly string[]).includes(h));
  if (extras.length > 0) {
    issues.push({
      kind: "coluna_extra",
      blocking: true,
      lines: [1],
      message: `Remova as colunas extras (${extras.length}): só nome, email_institucional e turma são necessários.`,
    });
  }
  const idx = {
    nome: header.indexOf("nome"),
    email: header.indexOf("email_institucional"),
    turma: header.indexOf("turma"),
  };

  const rows: CsvStudentRow[] = [];
  const malformed: number[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw.trim() === "" || raw.replace(/[;,"\s]/g, "") === "") continue;
    const cells = splitCsvLine(raw, delimiter);
    if (!cells || cells.length !== header.length) {
      malformed.push(i + 1);
      continue;
    }
    rows.push({
      line: i + 1,
      nome: cells[idx.nome].replace(/\s+/g, " "),
      email: normalizeEmail(cells[idx.email]),
      turma: cells[idx.turma],
    });
  }
  if (malformed.length > 0) {
    issues.push({
      kind: "linha_malformada",
      blocking: true,
      lines: malformed,
      message: "Linhas com número de colunas diferente do cabeçalho ou aspas sem fechar.",
    });
  }
  return { rows, issues };
}

/** Validação prévia sem banco: total, turma, e-mails, domínios, homônimos. */
export function precheckClassRows(
  parsed: { rows: CsvStudentRow[]; issues: ImportIssue[] },
  expected: ImportExpectations,
): PrecheckReport {
  const issues = [...parsed.issues];
  const rows = parsed.rows;
  const add = (kind: IssueKind, blocking: boolean, lines: number[], message: string) => {
    if (lines.length > 0) issues.push({ kind, blocking, lines, message });
  };

  const classKey = normalizeClassLabel(expected.className);
  const outOfClass = rows.filter((r) => normalizeClassLabel(r.turma) !== classKey);
  add(
    "outra_turma",
    true,
    outOfClass.map((r) => r.line),
    `Linhas que não são da ${expected.className} — retire-as do arquivo; outras turmas não são importadas.`,
  );

  add("nome_ausente", true, rows.filter((r) => !r.nome).map((r) => r.line), "Nome ausente.");
  add("email_ausente", true, rows.filter((r) => !r.email).map((r) => r.line), "E-mail institucional ausente.");
  const invalid = rows.filter((r) => r.email && !EMAIL_RE.test(r.email));
  add("email_invalido", true, invalid.map((r) => r.line), "E-mail institucional inválido.");

  const byEmail = new Map<string, number[]>();
  for (const r of rows.filter((x) => x.email)) {
    byEmail.set(r.email, [...(byEmail.get(r.email) ?? []), r.line]);
  }
  add(
    "email_repetido",
    true,
    [...byEmail.values()].filter((l) => l.length > 1).flat(),
    "O mesmo e-mail aparece em mais de uma linha.",
  );

  const domainsFound: Record<string, number> = {};
  for (const r of rows) {
    const d = r.email.split("@")[1];
    if (d) domainsFound[d] = (domainsFound[d] ?? 0) + 1;
  }
  const allowed = expected.emailDomains.map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (allowed.length === 0) {
    issues.push({
      kind: "dominios_nao_configurados",
      blocking: true,
      lines: [],
      message: "Configure o(s) domínio(s) de e-mail institucional da escola antes de importar.",
    });
  } else {
    add(
      "dominio_nao_autorizado",
      true,
      rows.filter((r) => r.email.includes("@") && !allowed.includes(r.email.split("@")[1])).map((r) => r.line),
      `E-mail fora do domínio institucional (${allowed.join(", ")}).`,
    );
  }

  const byName = new Map<string, number[]>();
  for (const r of rows.filter((x) => x.nome)) {
    const k = r.nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    byName.set(k, [...(byName.get(k) ?? []), r.line]);
  }
  add(
    "nome_repetido",
    false,
    [...byName.values()].filter((l) => l.length > 1).flat(),
    "Nomes iguais em linhas diferentes (homônimos?) — confirme com a secretaria; não bloqueia se os e-mails forem distintos.",
  );

  if (rows.length !== expected.expectedTotal) {
    issues.push({
      kind: "total_divergente",
      blocking: true,
      lines: [],
      message: `O arquivo tem ${rows.length} aluno(s); a lista institucional informada é de ${expected.expectedTotal}. Confirme com a escola antes de importar.`,
    });
  }

  return {
    total: rows.length,
    inAuthorizedClass: rows.length - outOfClass.length,
    outOfClass: outOfClass.length,
    issues,
    blocking: issues.some((i) => i.blocking),
    domainsFound,
    rows,
  };
}

export type ExistingAccountState =
  | "nova"
  | "existente_vinculada"
  | "existente_sem_matricula"
  | "existente_sem_registro_de_aluno"
  | "outro_papel"
  | "outra_instituicao"
  | "inativa";

export interface DatabasePrecheck {
  byState: Record<ExistingAccountState, number[]>;
  issues: ImportIssue[];
  toCreate: number;
  toLink: number;
  alreadyLinked: number;
}

/**
 * Confere, só lendo, o que já existe no banco para cada e-mail do arquivo.
 * Conta de outra instituição, de outro papel ou inativa é divergência
 * bloqueante — nunca é "reaproveitada" em silêncio.
 */
export async function precheckAgainstDatabase(
  db: SupabaseClient,
  rows: CsvStudentRow[],
  target: { institutionId: string; classroomId: string },
): Promise<DatabasePrecheck> {
  const byState: Record<ExistingAccountState, number[]> = {
    nova: [],
    existente_vinculada: [],
    existente_sem_matricula: [],
    existente_sem_registro_de_aluno: [],
    outro_papel: [],
    outra_instituicao: [],
    inativa: [],
  };
  const emails = [...new Set(rows.map((r) => r.email).filter(Boolean))];
  const users = new Map<string, { id: string; institution_id: string; status: string }>();
  for (let i = 0; i < emails.length; i += 100) {
    const { data, error } = await db
      .from("users")
      .select("id, email, institution_id, status")
      .in("email", emails.slice(i, i + 100));
    if (error) throw new Error(`users: ${error.message}`);
    for (const u of data ?? []) users.set(String(u.email), u as never);
  }
  const userIds = [...users.values()].map((u) => u.id);
  const profiles = new Map<string, string>();
  const students = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: p, error: pe } = await db
      .from("profiles")
      .select("user_id, role")
      .eq("institution_id", target.institutionId)
      .eq("status", "active")
      .in("user_id", userIds);
    if (pe) throw new Error(`profiles: ${pe.message}`);
    for (const row of p ?? []) profiles.set(String(row.user_id), String(row.role));
  }
  if (emails.length > 0) {
    const { data: s, error: se } = await db
      .from("students")
      .select("id, email")
      .eq("institution_id", target.institutionId)
      .in("email", emails);
    if (se) throw new Error(`students: ${se.message}`);
    for (const row of s ?? []) students.set(String(row.email), String(row.id));
  }
  const enrolled = new Set<string>();
  const studentIds = [...students.values()];
  if (studentIds.length > 0) {
    const { data: e, error: ee } = await db
      .from("enrollments")
      .select("student_id")
      .eq("institution_id", target.institutionId)
      .eq("classroom_id", target.classroomId)
      .in("student_id", studentIds);
    if (ee) throw new Error(`enrollments: ${ee.message}`);
    for (const row of e ?? []) enrolled.add(String(row.student_id));
  }

  for (const r of rows) {
    if (!r.email) continue;
    const u = users.get(r.email);
    if (!u) {
      byState.nova.push(r.line);
      continue;
    }
    if (u.institution_id !== target.institutionId) byState.outra_instituicao.push(r.line);
    else if (u.status !== "active") byState.inativa.push(r.line);
    else if (profiles.get(u.id) && profiles.get(u.id) !== "aluno") byState.outro_papel.push(r.line);
    else if (!students.has(r.email)) byState.existente_sem_registro_de_aluno.push(r.line);
    else if (!enrolled.has(students.get(r.email) as string)) byState.existente_sem_matricula.push(r.line);
    else byState.existente_vinculada.push(r.line);
  }

  const issues: ImportIssue[] = [];
  const block = (lines: number[], kind: IssueKind, message: string) => {
    if (lines.length > 0) issues.push({ kind, blocking: true, lines, message });
  };
  block(byState.outra_instituicao, "conta_outra_instituicao", "E-mail já usado por conta de OUTRA instituição.");
  block(byState.outro_papel, "conta_outro_papel", "E-mail já usado por conta de professor ou gestor nesta instituição.");
  block(byState.inativa, "conta_inativa", "Conta existente desativada — reativar exige decisão da escola.");

  return {
    byState,
    issues,
    toCreate: byState.nova.length,
    toLink: byState.existente_sem_matricula.length + byState.existente_sem_registro_de_aluno.length,
    alreadyLinked: byState.existente_vinculada.length,
  };
}

/** Converte as linhas validadas no formato do provisionamento. */
export function toPilotStudents(rows: CsvStudentRow[], institutionId: string): PilotStudentInput[] {
  return rows.map((r) => ({
    externalId: studentIdFor(institutionId, r.email),
    name: r.nome,
    email: r.email,
  }));
}
